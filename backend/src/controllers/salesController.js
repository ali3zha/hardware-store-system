const pool = require("../config/db");
const { ok, fail } = require("../utils/response");
const { computeTotals } = require("../services/salesService");

function parseMoney(raw) {
  if (raw == null) return NaN;
  const s = String(raw).trim().replace(/,/g, "");
  if (s === "") return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeDiscountId(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeCustomerId(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const ALLOWED_PAYMENT_METHODS = new Set(["cash", "gcash", "card", "bank_transfer"]);
let salesHasPaymentReferenceColumn = null;

function normalizePaymentMethod(raw) {
  const key = String(raw ?? "cash")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  return ALLOWED_PAYMENT_METHODS.has(key) ? key : "cash";
}

function normalizeText(raw) {
  const s = String(raw ?? "").trim();
  return s ? s : null;
}

async function hasSalesPaymentReferenceColumn(conn) {
  if (salesHasPaymentReferenceColumn != null) return salesHasPaymentReferenceColumn;
  const [rows] = await conn.query("SHOW COLUMNS FROM sales LIKE 'payment_reference'");
  salesHasPaymentReferenceColumn = Array.isArray(rows) && rows.length > 0;
  return salesHasPaymentReferenceColumn;
}

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
    const {
      customer_id,
      items,
      payment_method,
      amount_tendered,
      discount_id,
      payment_reference,
      card_auth_code,
      card_last4,
    } = req.body;
    const user_id = req.user.user_id;
    const taxRate = Number(process.env.TAX_RATE || 0.12);
    const customerIdNormalized = normalizeCustomerId(customer_id);
    const paymentMethodNormalized = normalizePaymentMethod(payment_method);
    const paymentReferenceRaw = normalizeText(payment_reference);
    const cardAuthCode = normalizeText(card_auth_code);
    const cardLast4 = normalizeText(card_last4);

    if (!Array.isArray(items) || items.length === 0) {
      return fail(res, "Items are required", 400);
    }

    await conn.beginTransaction();

    // Optional discount (coerce IDs — stray strings / NaN from JSON must not silently skip discount)
    const discountIdNormalized = normalizeDiscountId(discount_id);
    let discount = null;
    if (discountIdNormalized != null) {
      const [dRows] = await conn.query(
        "SELECT discount_id, name, type, value, status FROM discount WHERE discount_id = ? LIMIT 1",
        [discountIdNormalized]
      );
      if (
        dRows.length &&
        String(dRows[0].status || "")
          .trim()
          .toLowerCase() === "active"
      ) {
        discount = dRows[0];
      }
    }

    // Load product prices/stocks
    const productIds = items.map((i) => Number(i.product_id));
    const placeholders = productIds.map(() => "?").join(",");

    const [products] = await conn.query(
      `SELECT product_id, selling_price, stock_qty FROM product WHERE product_id IN (${placeholders})`,
      productIds
    );

    const productMap = new Map(products.map((p) => [Number(p.product_id), p]));

    const normalized = items.map((item) => {
      const pid = Number(item.product_id);
      const p = productMap.get(pid);
      if (!p) throw new Error(`Product ${item.product_id} not found`);
      if (Number(item.quantity) <= 0) throw new Error(`Invalid quantity for product ${item.product_id}`);
      if (Number(p.stock_qty) < Number(item.quantity))
        throw new Error(`Insufficient stock for product ${item.product_id}`);

      return {
        product_id: pid,
        quantity: Number(item.quantity),
        unit_price: Number(p.selling_price),
      };
    });

    const totals = computeTotals(normalized, discount, taxRate);
    const tenderedRaw = parseMoney(amount_tendered);
    const tendered = Number.isFinite(tenderedRaw) ? tenderedRaw : NaN;

    if (!Number.isFinite(tendered)) {
      throw new Error("Invalid amount tendered — use a number (e.g. 5000 or 5000.00)");
    }

    if (paymentMethodNormalized === "gcash" || paymentMethodNormalized === "bank_transfer") {
      if (!paymentReferenceRaw || paymentReferenceRaw.length < 5) {
        throw new Error("Payment reference is required for GCash/Bank transfer.");
      }
    }

    let paymentReferenceNormalized = paymentReferenceRaw;
    if (paymentMethodNormalized === "card") {
      if (!cardAuthCode || cardAuthCode.length < 4) {
        throw new Error("Card auth code is required for card payments.");
      }
      if (!/^\d{4}$/.test(String(cardLast4 || ""))) {
        throw new Error("Card last 4 digits must be exactly 4 numbers.");
      }
      paymentReferenceNormalized = `AUTH:${cardAuthCode} | CARD:*${cardLast4}`;
    }

    const needCents = Math.round(Number(totals.totalAmount) * 100);
    const paidCents = Math.round(Number(tendered) * 100);

    if (paidCents < needCents) {
      const need = needCents / 100;
      const paid = paidCents / 100;
      throw new Error(
        `Insufficient amount tendered — need ₱${need.toFixed(2)} (computed on server${discount ? ", discount applied" : ", no matching discount"}), received ₱${paid.toFixed(2)}`
      );
    }

    const changeGiven = (paidCents - needCents) / 100;

    const canSavePaymentRef = await hasSalesPaymentReferenceColumn(conn);
    const saleColumns = [
      "user_id",
      "customer_id",
      "sale_date",
      "subtotal",
      "discount_amount",
      "tax_amount",
      "total_amount",
      "payment_method",
      "amount_tendered",
      "change_given",
      "status",
    ];
    const saleValuesSql = ["?", "?", "NOW()", "?", "?", "?", "?", "?", "?", "?", "'completed'"];
    const saleParams = [
      user_id,
      customerIdNormalized,
      totals.subtotal,
      totals.discountAmount,
      totals.taxAmount,
      totals.totalAmount,
      paymentMethodNormalized,
      tendered,
      changeGiven,
    ];

    if (canSavePaymentRef) {
      saleColumns.push("payment_reference");
      saleValuesSql.push("?");
      saleParams.push(paymentReferenceNormalized);
    }

    const [saleResult] = await conn.query(
      `INSERT INTO sales (${saleColumns.join(", ")}) VALUES (${saleValuesSql.join(", ")})`,
      saleParams
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
    if (customerIdNormalized) {
      const points = Math.floor(totals.totalAmount / 100);
      if (points > 0) {
        await conn.query(
          "UPDATE customer SET loyalty_points = loyalty_points + ? WHERE customer_id = ?",
          [points, customerIdNormalized]
        );
      }
    }

    await conn.commit();

    return ok(
      res,
      {
        sale_id,
        ...totals,
        payment_method: paymentMethodNormalized,
        payment_reference: paymentReferenceNormalized,
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