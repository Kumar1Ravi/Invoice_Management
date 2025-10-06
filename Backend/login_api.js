// backend/login_api.js
const express = require("express");
const router = express.Router();       // ✅ declare router only once
const bcrypt = require("bcrypt");      // or bcryptjs
const { poolPromise } = require("./db"); // DB connection
const sql = require("mssql");

// ---------------------
// Login API
// ---------------------
router.post("/login", async (req, res) => {
    try {
        const { empcode, password } = req.body;

        // Check missing credentials
        if (!empcode || !password) {
            return res.json({ success: false, message: "Missing credentials" });
        }

        // Connect to SQL Server
        const pool = await poolPromise;
        const result = await pool.request()
            .input("Emp_Code", sql.VarChar, empcode)
            .query("SELECT Emp_Code, Emp_Name, Password FROM Login_User WHERE Emp_Code = @Emp_Code");

        if (result.recordset.length === 0) {
            return res.json({ success: false, message: "Employee Code not found" });
        }

        const user = result.recordset[0];

        // Fix PHP bcrypt hash ($2y$ → $2b$)
        let hash = user.Password;
        if (hash.startsWith("$2y$")) {
            hash = "$2b$" + hash.slice(4);
        }

        // Compare password
        const match = await bcrypt.compare(password, hash);
        if (!match) {
            return res.json({ success: false, message: "Invalid password" });
        }

        // Save session (ensure express-session is set up in server.js)
        if (!req.session) req.session = {};
        req.session.empcode = user.Emp_Code;
        req.session.empname = user.Emp_Name;

        res.json({ success: true, empname: user.Emp_Name });

    } catch (err) {
        console.error("Login API error:", err); // 🔹 detailed error logging
        res.json({ success: false, message: "Server error. Please try again later." });
    }
});

// GET /api/user - get logged-in user's name
router.get("/user", async (req, res) => {
    try {
        if (!req.session.empcode) {
            return res.json({ success: false, message: "Not logged in" });
        }

        // Fetch from DB if needed (optional if session has name)
        const empname = req.session.empname || null;
        res.json({ success: true, empname });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error" });
    }
});

// ---------------------
// Logout API
// ---------------------
router.post("/logout", (req, res) => {
    if (!req.session) return res.json({ success: true }); // Already logged out

    req.session.destroy(err => {
        if(err) return res.json({ success: false, message: "Logout failed" });
        res.json({ success: true });
    });
});

module.exports = router;