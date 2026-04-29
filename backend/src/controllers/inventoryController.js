const pool = require("../config/db");

exports.getProducts = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM product ORDER BY product_id ASC");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const {
      category_id,
      supplier_id,
      name,
      sku,
      barcode,
      cost_price,
      selling_price,
      stock_qty,
      reorder_level,
      unit,
      status
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO product
      (category_id, supplier_id, name, sku, barcode, cost_price, selling_price, stock_qty, reorder_level, unit, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id,
        supplier_id,
        name,
        sku,
        barcode || null,
        cost_price || 0,
        selling_price,
        stock_qty,
        reorder_level,
        unit || "pc",
        status || "active"
      ]
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category_id,
      supplier_id,
      name,
      sku,
      barcode,
      cost_price,
      selling_price,
      stock_qty,
      reorder_level,
      unit,
      status
    } = req.body;

    await pool.query(
      `UPDATE product
       SET category_id=?, supplier_id=?, name=?, sku=?, barcode=?, cost_price=?, selling_price=?, stock_qty=?, reorder_level=?, unit=?, status=?
       WHERE product_id=?`,
      [
        category_id,
        supplier_id,
        name,
        sku,
        barcode || null,
        cost_price || 0,
        selling_price,
        stock_qty,
        reorder_level,
        unit || "pc",
        status || "active",
        id
      ]
    );

    res.json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStockMovements = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM stock_movement ORDER BY moved_at DESC"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};