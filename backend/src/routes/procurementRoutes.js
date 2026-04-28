const express = require("express");
const {
  createPurchaseOrder,
  receivePurchaseOrder
} = require("../controllers/procurementController");

const router = express.Router();

router.post("/purchase-orders", createPurchaseOrder);
router.post("/purchase-orders/:id/receive", receivePurchaseOrder);

module.exports = router;