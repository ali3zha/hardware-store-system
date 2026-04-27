const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { ok, fail } = require("../utils/response");

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return fail(res, "Username and password are required", 400);

    const [rows] = await pool.query(
      "SELECT user_id, full_name, username, password_hash, role, status FROM users WHERE username = ? LIMIT 1",
      [username]
    );

    if (!rows.length) return fail(res, "Invalid credentials", 401);

    const user = rows[0];
    if (user.status !== "active") return fail(res, "Account inactive", 403);

    const isHashed = user.password_hash.startsWith("$2");
    const isMatch = isHashed
      ? await bcrypt.compare(password, user.password_hash)
      : password === user.password_hash; // temporary fallback for seed data

    if (!isMatch) return fail(res, "Invalid credentials", 401);

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return ok(
      res,
      {
        token,
        user: {
          user_id: user.user_id,
          full_name: user.full_name,
          username: user.username,
          role: user.role,
        },
      },
      "Login successful"
    );
  } catch (err) {
    return fail(res, err.message, 500);
  }
};