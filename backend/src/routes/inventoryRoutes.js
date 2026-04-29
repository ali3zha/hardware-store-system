const express = require("express");
const {
  getCategories,
  getSuppliers,
  getProducts,
  createProduct,
  updateProduct,
  getStockMovements
} = require("../controllers/inventoryController");

const router = express.Router();

router.get("/categories", getCategories);
router.get("/suppliers", getSuppliers);
router.get("/products", getProducts);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.get("/stock-movements", getStockMovements);

module.exports = router;