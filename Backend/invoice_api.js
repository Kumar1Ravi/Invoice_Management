// backend/invoice_api.js
const express = require("express");
const router = express.Router();
const { poolPromise } = require("./db");

// GET /api/invoices - Fetch all invoice data
router.get("/invoices", async (req, res) => {
    try {
        console.log("📊 Invoice API called");
        
        // Optional: Check if user is logged in (comment out if causing issues)
        // if (!req.session || !req.session.empcode) {
        //     return res.json({ success: false, message: "Not logged in" });
        // }

        const pool = await poolPromise;

        const sql = `
            SELECT
                ROW_NUMBER() OVER (ORDER BY SAP_ID) AS SNo,
                SAP_ID,
                GIS_ID,
                Employee_Name,
                Source_Country,
                Destination_Country,
                Service_Provider_Fee,
                Service_Provider_Fee_Tax,
                Govt_Fee,
                VFS_Fee,
                Misc_Other_Exp,
                Tax,
                Total_Invoice_Amount,
                User_Status
            FROM Vendor_Invoice
        `;

        console.log("📝 Executing query...");
        const result = await pool.request().query(sql);
        console.log("✅ Query executed. Records found:", result.recordset.length);

        res.json({
            success: true,
            invoices: result.recordset
        });

    } catch (err) {
        console.error("❌ Invoice API error:", err);
        res.json({ 
            success: false, 
            message: "Server error: " + err.message
        });
    }
});

module.exports = router;

