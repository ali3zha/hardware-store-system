const express = require("express");
const {
  getPurchaseOrders,
  getPurchaseOrderItems,
  createPurchaseOrder,
  receivePurchaseOrder
} = require("../controllers/procurementController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/purchase-orders", authMiddleware, roleMiddleware("admin", "manager", "inventory_staff"), getPurchaseOrders);
router.get("/purchase-orders/:id/items", authMiddleware, roleMiddleware("admin", "manager", "inventory_staff"), getPurchaseOrderItems);
router.post("/purchase-orders", authMiddleware, roleMiddleware("admin", "manager", "inventory_staff"), createPurchaseOrder);
router.post("/purchase-orders/:id/receive", authMiddleware, roleMiddleware("admin", "manager", "inventory_staff"), receivePurchaseOrder);

module.exports = router;