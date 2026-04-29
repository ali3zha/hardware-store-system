const pool = require("../config/db");
const { ok, fail } = require("../utils/response");
const { computeTotals } = require("../services/salesService");

exports.getSales = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         sale_id,
         user_id,
         customer_id,
         sale_date,
         subtotal,
         discount_amount,
         tax_amount,
         total_amount,
         payment_method,
         amount_tendered,
         change_given,
         status
       FROM sales
       ORDER BY sale_date DESC`
    );

    return ok(res, rows, "Sales fetched successfully");
  } catch (err) {
    return fail(res, err.message, 500);
  }
};

exports.createSale = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const { customer_id, items, payment_method, amount_tendered, discount_id } = req.body;
    const user_id = req.user.user_id;
    const taxRate = Number(process.env.TAX_RATE || 0.12);

    if (!Array.isArray(items) || items.length === 0) {
      return fail(res, "Items are required", 400);
    }

    await conn.beginTransaction();

    // Optional discount
    let discount = null;
    if (discount_id) {
      const [dRows] = await conn.query(
        "SELECT discount_id, type, value, status FROM discount WHERE discount_id = ? LIMIT 1",
        [discount_id]
      );
      if (dRows.length && dRows[0].status === "active") discount = dRows[0];
    }

    // Load product prices/stocks
    const productIds = items.map((i) => i.product_id);
    const placeholders = productIds.map(() => "?").join(",");

    const [products] = await conn.query(
      `SELECT product_id, selling_price, stock_qty FROM product WHERE product_id IN (${placeholders})`,
      productIds
    );

    const productMap = new Map(products.map((p) => [p.product_id, p]));

    const normalized = items.map((item) => {
      const p = productMap.get(item.product_id);
      if (!p) throw new Error(`Product ${item.product_id} not found`);
      if (Number(item.quantity) <= 0) throw new Error(`Invalid quantity for product ${item.product_id}`);
      if (p.stock_qty < item.quantity) throw new Error(`Insufficient stock for product ${item.product_id}`);

      return {
        product_id: item.product_id,
        quantity: Number(item.quantity),
        unit_price: Number(p.selling_price),
      };
    });

    const totals = computeTotals(normalized, discount, taxRate);
    const tendered = Number(amount_tendered || 0);

    if (tendered < totals.totalAmount) throw new Error("Insufficient amount tendered");

    const changeGiven = tendered - totals.totalAmount;

    const [saleResult] = await conn.query(
      `INSERT INTO sales
      (user_id, customer_id, sale_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, amount_tendered, change_given, status)
      VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, 'completed')`,
      [
        user_id,
        customer_id || null,
        totals.subtotal,
        totals.discountAmount,
        totals.taxAmount,
        totals.totalAmount,
        payment_method || "cash",
        tendered,
        changeGiven,
      ]
    );

    const sale_id = saleResult.insertId;

    for (const item of normalized) {
      const lineTotal = item.quantity * item.unit_price;

      await conn.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_pct, line_total)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [sale_id, item.product_id, item.quantity, item.unit_price, lineTotal]
      );

      await conn.query(
        "UPDATE product SET stock_qty = stock_qty - ? WHERE product_id = ?",
        [item.quantity, item.product_id]
      );

      await conn.query(
        `INSERT INTO stock_movement (product_id, user_id, type, quantity, reason, moved_at)
         VALUES (?, ?, 'out', ?, 'Sale transaction', NOW())`,
        [item.product_id, user_id, item.quantity]
      );
    }

    // Loyalty: +1 point per 100 total
    if (customer_id) {
      const points = Math.floor(totals.totalAmount / 100);
      if (points > 0) {
        await conn.query(
          "UPDATE customer SET loyalty_points = loyalty_points + ? WHERE customer_id = ?",
          [points, customer_id]
        );
      }
    }

    await conn.commit();

    return ok(
      res,
      {
        sale_id,
        ...totals,
        amount_tendered: tendered,
        change_given: changeGiven,
      },
      "Sale created successfully",
      201
    );
  } catch (err) {
    await conn.rollback();
    return fail(res, err.message, 400);
  } finally {
    conn.release();
  }
};