-- Create and select database
CREATE DATABASE IF NOT EXISTS pos_inventory_db;
USE pos_inventory_db;

-- 1) Category
CREATE TABLE IF NOT EXISTS category (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255)
) ENGINE=InnoDB;

-- 2) Supplier
CREATE TABLE IF NOT EXISTS supplier (
  supplier_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(150),
  phone VARCHAR(30),
  email VARCHAR(150) UNIQUE,
  address VARCHAR(255)
) ENGINE=InnoDB;

-- 3) User/Staff
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','manager','cashier','staff') NOT NULL DEFAULT 'staff',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB;

-- 4) Customer
CREATE TABLE IF NOT EXISTS customer (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150) UNIQUE,
  loyalty_points INT NOT NULL DEFAULT 0,
  CHECK (loyalty_points >= 0)
) ENGINE=InnoDB;

-- 5) Discount
CREATE TABLE IF NOT EXISTS discount (
  discount_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  type ENUM('percentage','fixed') NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  applies_to ENUM('all','category','product') NOT NULL DEFAULT 'all',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  CHECK (value >= 0),
  CHECK (valid_until >= valid_from)
) ENGINE=InnoDB;

-- 6) Product
CREATE TABLE IF NOT EXISTS product (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  supplier_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(80) NOT NULL UNIQUE,
  barcode VARCHAR(80) UNIQUE,
  cost_price DECIMAL(12,2) NOT NULL,
  selling_price DECIMAL(12,2) NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 0,
  unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  CHECK (cost_price >= 0),
  CHECK (selling_price >= 0),
  CHECK (stock_qty >= 0),
  CHECK (reorder_level >= 0),
  CONSTRAINT fk_product_category
    FOREIGN KEY (category_id) REFERENCES category(category_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_product_supplier
    FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 7) Sales
CREATE TABLE IF NOT EXISTS sales (
  sale_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  customer_id INT NULL,
  sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_method ENUM('cash','gcash','card','bank_transfer','other') NOT NULL DEFAULT 'cash',
  amount_tendered DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  change_given DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('completed','voided','refunded','pending') NOT NULL DEFAULT 'completed',
  CHECK (subtotal >= 0),
  CHECK (discount_amount >= 0),
  CHECK (tax_amount >= 0),
  CHECK (total_amount >= 0),
  CHECK (amount_tendered >= 0),
  CHECK (change_given >= 0),
  CONSTRAINT fk_sales_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_customer
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- 8) Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
  sale_item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sale_id BIGINT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(12,2) NOT NULL,
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  CHECK (discount_pct >= 0 AND discount_pct <= 100),
  CHECK (line_total >= 0),
  CONSTRAINT fk_sale_items_sale
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sale_items_product
    FOREIGN KEY (product_id) REFERENCES product(product_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 9) Stock Movement
CREATE TABLE IF NOT EXISTS stock_movement (
  movement_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  type ENUM('in','out','adjustment') NOT NULL,
  quantity INT NOT NULL,
  reason VARCHAR(255),
  moved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (quantity > 0),
  CONSTRAINT fk_stock_movement_product
    FOREIGN KEY (product_id) REFERENCES product(product_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_stock_movement_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 10) Purchase Order
CREATE TABLE IF NOT EXISTS purchase_order (
  po_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  user_id INT NOT NULL,
  order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_date DATETIME NULL,
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('draft','ordered','partially_received','received','cancelled') NOT NULL DEFAULT 'draft',
  CHECK (total_cost >= 0),
  CONSTRAINT fk_po_supplier
    FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_po_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 11) Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  po_item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  po_id BIGINT NOT NULL,
  product_id INT NOT NULL,
  qty_ordered INT NOT NULL,
  qty_received INT NOT NULL DEFAULT 0,
  unit_cost DECIMAL(12,2) NOT NULL,
  CHECK (qty_ordered > 0),
  CHECK (qty_received >= 0),
  CHECK (qty_received <= qty_ordered),
  CHECK (unit_cost >= 0),
  CONSTRAINT fk_po_items_po
    FOREIGN KEY (po_id) REFERENCES purchase_order(po_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_po_items_product
    FOREIGN KEY (product_id) REFERENCES product(product_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;