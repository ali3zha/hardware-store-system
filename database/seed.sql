USE pos_inventory_db;


-- 1) CATEGORY
INSERT INTO category (name, description) VALUES
('Paints', 'Interior and exterior paints'),
('Hand Tools', 'Manual construction and repair tools'),
('Power Tools', 'Electric and battery-powered tools'),
('Electrical', 'Wires, switches, outlets, breakers'),
('Plumbing', 'Pipes, fittings, sealants, fixtures');

-- 2) SUPPLIER
INSERT INTO supplier (name, contact_person, phone, email, address) VALUES
('BuildMart Supply Co.', 'Carlo Reyes', '09171234567', 'carlo@buildmart.ph', 'Quezon City, Metro Manila'),
('PrimeTools Distributors', 'Alyssa Cruz', '09181234567', 'alyssa@primetools.ph', 'Makati City, Metro Manila'),
('Metro Electrical Hub', 'John Dela Torre', '09191234567', 'john@metroelectrical.ph', 'Pasig City, Metro Manila');


-- 3) USERS / STAFF
INSERT INTO users (full_name, username, password_hash, role, status) VALUES
('System Admin', 'admin', 'password123', 'admin', 'active'),
('LB Mira', 'staff', 'hihihi01', 'cashier', 'active'),
('Jaina Asumbrado', 'inventory', 'hahaha02', 'inventory_staff', 'active')
('Mig Fucoy', 'staff1', 'huhuhu03', 'inventory_staff', 'active');


-- 4) CUSTOMER
INSERT INTO customer (full_name, phone, email, loyalty_points) VALUES
('Juan Dela Cruz', '09221234567', 'juan.delacruz@email.com', 50),
('Ana Villanueva', '09231234567', 'ana.v@email.com', 120),
('Mark Garcia', '09241234567', 'mark.garcia@email.com', 10);

-- 5) DISCOUNT
INSERT INTO discount (name, type, value, valid_from, valid_until, applies_to, status) VALUES
('Grand Opening 10%', 'percent', 10.00, '2026-04-01', '2026-06-30', 'all', 'active'),
('Loyalty 50 OFF', 'fixed', 50.00, '2026-04-01', '2026-12-31', 'all', 'active'),
('Paint Promo 5%', 'percent', 5.00, '2026-05-01', '2026-05-31', 'category', 'active');

-- 6) PRODUCT

INSERT INTO product
(category_id, supplier_id, name, sku, barcode, cost_price, selling_price, stock_qty, reorder_level, unit, status)
VALUES
(1, 1, 'Acrylic Latex Paint White 1L', 'PNT-001', '480000000001', 180.00, 250.00, 80, 20, 'can', 'active'),
(1, 1, 'Enamel Paint Black 1L', 'PNT-002', '480000000002', 200.00, 280.00, 60, 15, 'can', 'active'),
(2, 2, 'Hammer 16oz', 'TL-001', '480000000003', 120.00, 180.00, 40, 10, 'pc', 'active'),
(2, 2, 'Screwdriver Set (6pcs)', 'TL-002', '480000000004', 150.00, 230.00, 35, 10, 'set', 'active'),
(3, 2, 'Cordless Drill 12V', 'PT-001', '480000000005', 1800.00, 2500.00, 12, 5, 'pc', 'active'),
(4, 3, 'Electrical Wire 2.0mm (100m)', 'EL-001', '480000000006', 900.00, 1250.00, 25, 8, 'roll', 'active'),
(5, 1, 'PVC Pipe 1/2in x 3m', 'PL-001', '480000000007', 70.00, 110.00, 100, 30, 'pc', 'active');

-- 7) SALES (sample completed sale)
INSERT INTO sales
(user_id, customer_id, sale_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, amount_tendered, change_given, status)
VALUES
(2, 1, NOW(), 430.00, 43.00, 46.44, 433.44, 'cash', 500.00, 66.56, 'completed');


-- 8) SALE ITEMS (for the sale above; assumes last inserted sale_id)
INSERT INTO sale_items
(sale_id, product_id, quantity, unit_price, discount_pct, line_total)
VALUES
(LAST_INSERT_ID(), 3, 1, 180.00, 10.00, 162.00),
(LAST_INSERT_ID(), 4, 1, 230.00, 10.00, 207.00);

-- 9) STOCK MOVEMENT (sample stock out due to sale)
INSERT INTO stock_movement
(product_id, user_id, type, quantity, reason, moved_at)
VALUES
(3, 2, 'OUT', 1, 'Sale transaction', NOW()),
(4, 2, 'OUT', 1, 'Sale transaction', NOW());

-- 10) PURCHASE ORDER + ITEMS (sample)
INSERT INTO purchase_orders
(supplier_id, user_id, order_date, received_date, total_cost, status)
VALUES
(1, 3, CURDATE(), NULL, 0.00, 'pending');

INSERT INTO purchase_order_items
(po_id, product_id, qty_ordered, qty_received, unit_cost)
VALUES
(LAST_INSERT_ID(), 1, 50, 0, 180.00),
(LAST_INSERT_ID(), 2, 30, 0, 200.00);