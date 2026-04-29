const express = require("express");
const {
  getCategories,
  createCategory,
  getSuppliers,
  createSupplier,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getStockMovements,
  getCustomers,
  createCustomer,
  getDiscounts
} = require("../controllers/inventoryController");

const router = express.Router();

router.get("/categories", getCategories);
router.post("/categories", createCategory);
router.get("/suppliers", getSuppliers);
router.post("/suppliers", createSupplier);
router.get("/products", getProducts);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);
router.get("/stock-movements", getStockMovements);
router.get("/customers", getCustomers);
router.post("/customers", createCustomer);
router.get("/discounts", getDiscounts);

module.exports = router;