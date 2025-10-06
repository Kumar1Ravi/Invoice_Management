// backend/invoice_cons_api.js
const express = require("express");
const router = express.Router();
const { poolPromise } = require("./db");
const sql = require("mssql");

// ----------------------
// GET /api/invoice-cons/gis-list
// Fetch GIS IDs for SAP ID
// ----------------------
router.get("/invoice-cons/gis-list", async (req, res) => {
    try {
        const { sap_id } = req.query;
        console.log("📋 Fetching GIS list for SAP_ID:", sap_id);

        if (!sap_id) {
            return res.json({ success: false, message: "SAP ID is required" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('sap_id', sql.BigInt, parseInt(sap_id))
            .query('SELECT DISTINCT GIS_ID FROM Invoice_Consolidated WHERE SAP_ID = @sap_id ORDER BY GIS_ID');

        console.log(`✅ Found ${result.recordset.length} GIS IDs`);

        res.json({
            success: true,
            gisList: result.recordset
        });

    } catch (err) {
        console.error("❌ GIS list error:", err);
        res.json({ success: false, message: "Server error: " + err.message });
    }
});

// ----------------------
// GET /api/invoice-cons/details
// Fetch invoice details by SAP_ID & GIS_ID
// ----------------------
router.get("/invoice-cons/details", async (req, res) => {
    try {
        const { sap_id, gis_id } = req.query;
        console.log("📄 Fetching invoice - SAP_ID:", sap_id, "GIS_ID:", gis_id);

        if (!sap_id || !gis_id) {
            return res.json({ success: false, message: "SAP ID and GIS ID are required" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('sap_id', sql.BigInt, parseInt(sap_id))
            .input('gis_id', sql.BigInt, parseInt(gis_id))
            .query('SELECT * FROM Invoice_Consolidated WHERE SAP_ID = @sap_id AND GIS_ID = @gis_id');

        if (result.recordset.length === 0) {
            return res.json({ success: false, message: "Invoice not found" });
        }

        console.log("✅ Invoice found");

        res.json({ success: true, invoice: result.recordset[0] });

    } catch (err) {
        console.error("❌ Invoice details error:", err);
        res.json({ success: false, message: "Server error: " + err.message });
    }
});

// ----------------------
// POST /api/invoice-cons/save
// Save or update invoice
// ----------------------
router.post("/invoice-cons/save", async (req, res) => {
    try {
        const invoiceData = req.body;
        console.log("💾 Saving invoice for SAP_ID:", invoiceData.SAP_ID);

        const pool = await poolPromise;
        const request = pool.request();

        // Filter out empty values
        const columns = Object.keys(invoiceData).filter(key => invoiceData[key] !== '');

        // Add parameters
        columns.forEach(col => {
            const value = invoiceData[col];

            if (['SAP_ID', 'GIS_ID'].includes(col)) {
                request.input(col, sql.BigInt, parseInt(value) || null);
            } 
            else if (col.toLowerCase().includes('date')) {
                // Use null if empty, else send YYYY-MM-DD string
                request.input(col, sql.Date, value ? value : null);
            } 
            else if (['Service_Provider_Fee','Service_Provider_Fee_Tax','Service_Tax_Total','Govt_Fee','VFS_Fee','Misc_Other_Exp','Tax','Total_Invoice_Amount'].includes(col)) {
                request.input(col, sql.Decimal(18,2), parseFloat(value) || 0);
            } 
            else {
                request.input(col, sql.NVarChar, value);
            }
        });

        // Check if record exists
        const checkResult = await pool.request()
            .input('sap_id', sql.BigInt, parseInt(invoiceData.SAP_ID))
            .input('gis_id', sql.BigInt, parseInt(invoiceData.GIS_ID))
            .query('SELECT COUNT(*) as count FROM Invoice_Consolidated WHERE SAP_ID = @sap_id AND GIS_ID = @gis_id');

        if (checkResult.recordset[0].count > 0) {
            // Update existing record
            const updateParts = columns
                .filter(col => col !== 'SAP_ID' && col !== 'GIS_ID')
                .map(col => `${col} = @${col}`)
                .join(', ');

            await request.query(`UPDATE Invoice_Consolidated SET ${updateParts} WHERE SAP_ID = @SAP_ID AND GIS_ID = @GIS_ID`);
            console.log("✅ Invoice updated");
            res.json({ success: true, message: "Invoice updated successfully" });
        } else {
            // Insert new record
            const columnsStr = columns.join(', ');
            const values = columns.map(col => `@${col}`).join(', ');
            await request.query(`INSERT INTO Invoice_Consolidated (${columnsStr}) VALUES (${values})`);
            console.log("✅ Invoice created");
            res.json({ success: true, message: "Invoice created successfully" });
        }

    } catch (err) {
        console.error("❌ Save error:", err);
        res.json({ success: false, message: "Failed to save: " + err.message });
    }
});

module.exports = router;
