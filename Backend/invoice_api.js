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

        if (!poolPromise) {
            // Mock data for testing
            console.log("📝 Returning mock invoice data");
            const mockInvoices = [
                {
                    SNo: 1,
                    SAP_ID: "SAP001",
                    GIS_ID: "GIS001",
                    Employee_Name: "John Doe",
                    Source_Country: "USA",
                    Destination_Country: "Canada",
                    Service_Provider_Fee: 100.00,
                    Service_Provider_Fee_Tax: 10.00,
                    Govt_Fee: 50.00,
                    VFS_Fee: 20.00,
                    Misc_Other_Exp: 5.00,
                    Tax: 15.00,
                    Total_Invoice_Amount: 200.00,
                    User_Status: "Active"
                },
                {
                    SNo: 2,
                    SAP_ID: "SAP002",
                    GIS_ID: "GIS002",
                    Employee_Name: "Jane Smith",
                    Source_Country: "UK",
                    Destination_Country: "Germany",
                    Service_Provider_Fee: 150.00,
                    Service_Provider_Fee_Tax: 15.00,
                    Govt_Fee: 75.00,
                    VFS_Fee: 30.00,
                    Misc_Other_Exp: 10.00,
                    Tax: 22.50,
                    Total_Invoice_Amount: 302.50,
                    User_Status: "Pending"
                }
            ];
            res.json({
                success: true,
                invoices: mockInvoices
            });
            return;
        }

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

