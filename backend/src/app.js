const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const salesRoutes = require("./routes/salesRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Backend running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/sales", salesRoutes);

module.exports = app;