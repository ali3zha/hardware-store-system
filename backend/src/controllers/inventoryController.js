const pool = require("../config/db");

exports.getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT category_id, name, description FROM category ORDER BY name ASC"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const [result] = await pool.query(
      "INSERT INTO category (name, description) VALUES (?, ?)",
      [String(name).trim(), description ? String(description).trim() : null]
    );

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: { category_id: result.insertId },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSuppliers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT supplier_id, name, contact_person, phone, email, address FROM supplier ORDER BY name ASC"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const { name, contact_person, phone, email, address } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Supplier name is required" });
    }

    const [result] = await pool.query(
      `INSERT INTO supplier (name, contact_person, phone, email, address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        contact_person ? String(contact_person).trim() : null,
        phone ? String(phone).trim() : null,
        email ? String(email).trim() : null,
        address ? String(address).trim() : null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: { supplier_id: result.insertId },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         p.*,
         c.name AS category_name,
         s.name AS supplier_name
       FROM product p
       JOIN category c ON c.category_id = p.category_id
       JOIN supplier s ON s.supplier_id = p.supplier_id
       ORDER BY p.product_id ASC`
    );
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

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM product WHERE product_id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    if (error && error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete product because it is already used in transactions",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStockMovements = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         sm.movement_id,
         sm.product_id,
         p.name AS product_name,
         c.name AS category_name,
         sm.user_id,
         u.full_name AS user_name,
         sm.type,
         sm.quantity,
         sm.reason,
         sm.moved_at,
         p.selling_price
       FROM stock_movement sm
       JOIN product p ON p.product_id = sm.product_id
       JOIN category c ON c.category_id = p.category_id
       JOIN users u ON u.user_id = sm.user_id
       ORDER BY sm.moved_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT customer_id, full_name, phone, email, loyalty_points
       FROM customer
       ORDER BY customer_id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { full_name, phone, email } = req.body;
    if (!full_name || !String(full_name).trim()) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }

    const [result] = await pool.query(
      "INSERT INTO customer (full_name, phone, email) VALUES (?, ?, ?)",
      [
        String(full_name).trim(),
        phone ? String(phone).trim() : null,
        email ? String(email).trim() : null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: { customer_id: result.insertId },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDiscounts = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         discount_id,
         name,
         type,
         value,
         valid_from,
         valid_until,
         applies_to,
         status
       FROM discount
       ORDER BY discount_id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};