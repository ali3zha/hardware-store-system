const pool = require("../config/db");

exports.createPurchaseOrder = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const { supplier_id, user_id, items } = req.body;

    await conn.beginTransaction();

    const [poResult] = await conn.query(
      `INSERT INTO purchase_orders (supplier_id, user_id, order_date, received_date, total_cost, status)
       VALUES (?, ?, CURDATE(), NULL, 0.00, 'pending')`,
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

    await conn.query(
      "UPDATE purchase_orders SET total_cost=? WHERE po_id=?",
      [totalCost, po_id]
    );

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

exports.receivePurchaseOrder = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const { id } = req.params;
    const { user_id, items } = req.body;

    await conn.beginTransaction();

    for (const item of items) {
      await conn.query(
        `UPDATE purchase_order_items
         SET qty_received = qty_received + ?
         WHERE po_id = ? AND product_id = ?`,
        [item.qty_received, id, item.product_id]
      );

      await conn.query(
        `UPDATE product
         SET stock_qty = stock_qty + ?
         WHERE product_id = ?`,
        [item.qty_received, item.product_id]
      );

      await conn.query(
        `INSERT INTO stock_movement (product_id, user_id, type, quantity, reason, moved_at)
         VALUES (?, ?, 'IN', ?, 'Purchase order received', NOW())`,
        [item.product_id, user_id, item.qty_received]
      );
    }

    await conn.query(
      `UPDATE purchase_orders
       SET received_date = CURDATE(), status = 'received'
       WHERE po_id = ?`,
      [id]
    );

    await conn.commit();

    res.json({ success: true, message: "Purchase order received successfully" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
};