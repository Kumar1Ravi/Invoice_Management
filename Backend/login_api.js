// backend/login_api.js
const express = require("express");
const router = express.Router();       // ✅ declare router only once
const bcrypt = require("bcrypt");      // or bcryptjs
const db = require("./db"); // DB connection
const { sql, poolPromise } = db;

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

        // Query database
        let user;
        if (poolPromise) {
            // MSSQL
            const pool = await poolPromise;
            const result = await pool.request()
                .input("Emp_Code", sql.VarChar, empcode)
                .query("SELECT Emp_Code, Emp_Name, Password FROM Login_User WHERE Emp_Code = @Emp_Code");
            if (result.recordset.length === 0) {
                return res.json({ success: false, message: "Employee Code not found" });
            }
            user = result.recordset[0];
            user.emp_code = user.Emp_Code;
            user.emp_name = user.Emp_Name;
            user.password = user.Password;
        } else {
            // Postgres
            const result = await sql`SELECT emp_code, emp_name, password FROM login_user WHERE emp_code = ${empcode}`;
            if (result.rows.length === 0) {
                return res.json({ success: false, message: "Employee Code not found" });
            }
            user = result.rows[0];
        }

        // Fix PHP bcrypt hash ($2y$ → $2b$)
        let hash = user.password;
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
        req.session.empcode = user.emp_code;
        req.session.empname = user.emp_name;

        res.json({ success: true, empname: user.emp_name });

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