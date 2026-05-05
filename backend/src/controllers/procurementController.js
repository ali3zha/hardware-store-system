const pool = require("../config/db");

async function resolvePurchaseOrderTable(conn) {
  // Prefer the table actually referenced by purchase_order_items.po_id foreign key.
  try {
    const [fkRows] = await conn.query(
      `SELECT REFERENCED_TABLE_NAME AS referenced_table
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'purchase_order_items'
         AND COLUMN_NAME = 'po_id'
         AND REFERENCED_TABLE_NAME IS NOT NULL
       LIMIT 1`
    );
    const fkTable = fkRows?.[0]?.referenced_table;
    if (fkTable === "purchase_orders" || fkTable === "purchase_order") {
      return fkTable;
    }
  } catch {
    // Ignore metadata read issues; fallback below probes existing tables.
  }

  const candidates = ["purchase_orders", "purchase_order"];

  for (const tableName of candidates) {
    try {
      await conn.query(`SELECT 1 FROM ${tableName} LIMIT 1`);
      return tableName;
    } catch (err) {
      if (err?.code !== "ER_NO_SUCH_TABLE") throw err;
    }
  }

  throw new Error("Purchase order table not found (expected purchase_orders or purchase_order)");
}

function parseEnumValues(columnType = "") {
  const m = String(columnType).match(/^enum\((.*)\)$/i);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((v) => v.trim().replace(/^'/, "").replace(/'$/, ""))
    .filter(Boolean);
}

async function resolveStatusPolicy(conn, poTable) {
  const [rows] = await conn.query(
    `SELECT COLUMN_TYPE AS column_type
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = 'status'
     LIMIT 1`,
    [poTable]
  );

  const enumValues = parseEnumValues(rows?.[0]?.column_type || "");
  const has = (v) => enumValues.includes(v);

  // Create-time preferred status (fallback to any known active/open-like status).
  const createStatus =
    (has("ordered") && "ordered") ||
    (has("pending") && "pending") ||
    (has("draft") && "draft") ||
    (has("open") && "open") ||
    null;

  // Receive-time statuses with graceful fallbacks.
  const receiveDone =
    (has("received") && "received") ||
    (has("completed") && "completed") ||
    createStatus;
  const receivePartial =
    (has("partially_received") && "partially_received") ||
    (has("partial") && "partial") ||
    createStatus;

  return { enumValues, createStatus, receiveDone, receivePartial };
}

exports.createPurchaseOrder = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const { supplier_id, user_id, items } = req.body;
    const poTable = await resolvePurchaseOrderTable(conn);
    const statusPolicy = await resolveStatusPolicy(conn, poTable);

    await conn.beginTransaction();

    const [poResult] = statusPolicy.createStatus
      ? await conn.query(
          `INSERT INTO ${poTable} (supplier_id, user_id, order_date, received_date, total_cost, status)
           VALUES (?, ?, NOW(), NULL, 0.00, ?)`,
          [supplier_id, user_id, statusPolicy.createStatus]
        )
      : await conn.query(
          `INSERT INTO ${poTable} (supplier_id, user_id, order_date, received_date, total_cost)
           VALUES (?, ?, NOW(), NULL, 0.00)`,
          [supplier_id, user_id]
        );

    const po_id = poResult.insertId;
    let totalCost = 0;

    for (const item of items) {
      const lineCost = item.qty_ordered * item.unit_cost;
      totalCost += lineCost;

      await conn.query(
        `INSERT INTO purchase_order_items (po_id, product_id, qty_ordered, qty_received, unit_cost)
         VALUES (?, ?, ?, 0, ?)`,
        [po_id, item.product_id, item.qty_ordered, item.unit_cost]
      );
    }

    await conn.query(`UPDATE ${poTable} SET total_cost=? WHERE po_id=?`, [totalCost, po_id]);

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      po_id
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
};

exports.getPurchaseOrders = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const poTable = await resolvePurchaseOrderTable(conn);
    const [rows] = await conn.query(
      `SELECT
         po.po_id,
         po.supplier_id,
         s.name AS supplier_name,
         po.user_id,
         u.full_name AS user_name,
         po.order_date,
         po.received_date,
         po.total_cost,
         po.status,
         COALESCE(SUM(poi.qty_ordered), 0) AS total_qty_ordered,
         COALESCE(SUM(poi.qty_received), 0) AS total_qty_received
       FROM ${poTable} po
       JOIN supplier s ON s.supplier_id = po.supplier_id
       JOIN users u ON u.user_id = po.user_id
       LEFT JOIN purchase_order_items poi ON poi.po_id = po.po_id
       GROUP BY
         po.po_id, po.supplier_id, s.name, po.user_id, u.full_name,
         po.order_date, po.received_date, po.total_cost, po.status
       ORDER BY po.po_id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
};

exports.getPurchaseOrderItems = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const [rows] = await conn.query(
      `SELECT
         poi.po_item_id,
         poi.po_id,
         poi.product_id,
         p.name AS product_name,
         poi.qty_ordered,
         poi.qty_received,
         poi.unit_cost
       FROM purchase_order_items poi
       JOIN product p ON p.product_id = poi.product_id
       WHERE poi.po_id = ?
       ORDER BY poi.po_item_id ASC`,
      [id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
};

exports.receivePurchaseOrder = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const { id } = req.params;
    const { user_id, items } = req.body;
    const poTable = await resolvePurchaseOrderTable(conn);
    const statusPolicy = await resolveStatusPolicy(conn, poTable);

    await conn.beginTransaction();

    let itemsToReceive = Array.isArray(items) ? items : [];
    if (!itemsToReceive.length) {
      const [pendingRows] = await conn.query(
        `SELECT product_id, (qty_ordered - qty_received) AS qty_remaining
         FROM purchase_order_items
         WHERE po_id = ? AND qty_received < qty_ordered`,
        [id]
      );
      itemsToReceive = pendingRows.map((r) => ({
        product_id: Number(r.product_id),
        qty_received: Number(r.qty_remaining || 0),
      }));
    }

    if (!itemsToReceive.length) {
      throw new Error("No pending items to receive for this purchase order");
    }

    for (const item of itemsToReceive) {
      const qtyReceived = Number(item.qty_received || 0);
      if (qtyReceived <= 0) continue;

      await conn.query(
        `UPDATE purchase_order_items
         SET qty_received = qty_received + ?
         WHERE po_id = ? AND product_id = ?`,
        [qtyReceived, id, item.product_id]
      );

      await conn.query(
        `UPDATE product
         SET stock_qty = stock_qty + ?
         WHERE product_id = ?`,
        [qtyReceived, item.product_id]
      );

      await conn.query(
        `INSERT INTO stock_movement (product_id, user_id, type, quantity, reason, moved_at)
         VALUES (?, ?, 'IN', ?, 'Purchase order received', NOW())`,
        [item.product_id, user_id, qtyReceived]
      );
    }

    const [[totals]] = await conn.query(
      `SELECT
         COALESCE(SUM(qty_ordered), 0) AS qty_ordered,
         COALESCE(SUM(qty_received), 0) AS qty_received
       FROM purchase_order_items
       WHERE po_id = ?`,
      [id]
    );
    const ordered = Number(totals?.qty_ordered || 0);
    const received = Number(totals?.qty_received || 0);
    const nextStatusRaw =
      received <= 0
        ? statusPolicy.createStatus
        : received < ordered
          ? statusPolicy.receivePartial
          : statusPolicy.receiveDone;

    if (nextStatusRaw) {
      await conn.query(
        `UPDATE ${poTable}
         SET received_date = CASE WHEN ? = ? THEN NOW() ELSE received_date END,
             status = ?
         WHERE po_id = ?`,
        [nextStatusRaw, statusPolicy.receiveDone || nextStatusRaw, nextStatusRaw, id]
      );
    } else {
      await conn.query(
        `UPDATE ${poTable}
         SET received_date = NOW()
         WHERE po_id = ?`,
        [id]
      );
    }

    await conn.commit();

    res.json({ success: true, message: "Purchase order received successfully" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
};