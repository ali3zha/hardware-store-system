const express = require("express");
const {
  getProducts,
  createProduct,
  updateProduct,
  getStockMovements
} = require("../controllers/inventoryController");

const router = express.Router();

router.get("/products", getProducts);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.get("/stock-movements", getStockMovements);

module.exports = router;