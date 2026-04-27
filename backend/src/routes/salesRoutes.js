const express = require("express");
const { createSale } = require("../controllers/salesController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("admin", "manager", "cashier"), createSale);

module.exports = router;