// backend/analysis_api.js
const express = require("express");
const router = express.Router();
const { poolPromise } = require("./db");

// GET /api/duplicates - Fetch duplicate analysis data
router.get("/duplicates", async (req, res) => {
    try {
        console.log("📊 Fetching duplicate analysis data...");

        if (!poolPromise) {
            // Mock data for testing
            console.log("📝 Returning mock duplicate data");
            const mockRecords = [
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
                    DUP_True_Duplicate: 1,
                    Duplicate_Status: "Duplicate",
                    SourceTable: "Vend",
                    User_Status: "Active",
                    SortOrder: 1,
                    DUP_SG_Status: 1,
                    DUP_SGLT_Status: 0,
                    DUP_SGG_Status: 1,
                    DUP_SGV_Status: 0,
                    DUP_SGM_Status: 0,
                    DUP_SGT_Status: 0,
                    DUP_SGTA_Status: 0
                },
                {
                    SNo: null,
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
                    DUP_True_Duplicate: null,
                    Duplicate_Status: null,
                    SourceTable: "Cons",
                    User_Status: null,
                    SortOrder: 2,
                    DUP_SG_Status: null,
                    DUP_SGLT_Status: null,
                    DUP_SGG_Status: null,
                    DUP_SGV_Status: null,
                    DUP_SGM_Status: null,
                    DUP_SGT_Status: null,
                    DUP_SGTA_Status: null
                }
            ];
            res.json({
                success: true,
                records: mockRecords
            });
            return;
        }

        const pool = await poolPromise;

        const sql = `
            SELECT
                ROW_NUMBER() OVER (ORDER BY V.SAP_ID, V.GIS_ID) AS SNo,
                V.SAP_ID, V.GIS_ID, V.Employee_Name, V.Source_Country, V.Destination_Country,
                V.Service_Provider_Fee, V.Service_Provider_Fee_Tax, V.Govt_Fee, V.VFS_Fee,
                V.Misc_Other_Exp, V.Tax, V.Total_Invoice_Amount,
                V.DUP_True_Duplicate, V.Duplicate_Status, 'Vend' AS SourceTable,
                V.User_Status, 1 AS SortOrder,
                V.DUP_SG_Status, V.DUP_SGLT_Status, V.DUP_SGG_Status, V.DUP_SGV_Status,
                V.DUP_SGM_Status, V.DUP_SGT_Status, V.DUP_SGTA_Status
            FROM Vendor_Invoice V
            WHERE EXISTS (
                SELECT 1 FROM Invoice_Consolidated C
                WHERE V.SAP_ID = C.SAP_ID AND V.GIS_ID = C.GIS_ID
            )
            UNION
            SELECT
                NULL AS SNo,
                C.SAP_ID, C.GIS_ID, C.Employee_Name, C.Source_Country, C.Destination_Country,
                C.Service_Provider_Fee, C.Service_Provider_Fee_Tax, C.Govt_Fee, C.VFS_Fee,
                C.Misc_Other_Exp, C.Tax, C.Total_Invoice_Amount,
                NULL AS DUP_True_Duplicate, NULL AS Duplicate_Status, 'Cons' AS SourceTable,
                NULL AS User_Status, 2 AS SortOrder,
                NULL AS DUP_SG_Status, NULL AS DUP_SGLT_Status, NULL AS DUP_SGG_Status, NULL AS DUP_SGV_Status,
                NULL AS DUP_SGM_Status, NULL AS DUP_SGT_Status, NULL AS DUP_SGTA_Status
            FROM Invoice_Consolidated C
            WHERE EXISTS (
                SELECT 1 FROM Vendor_Invoice V
                WHERE V.SAP_ID = C.SAP_ID AND V.GIS_ID = C.GIS_ID
            )
            ORDER BY SAP_ID, GIS_ID, SortOrder
        `;

        const result = await pool.request().query(sql);

        console.log(`✅ Fetched ${result.recordset.length} duplicate records`);

        res.json({
            success: true,
            records: result.recordset
        });

    } catch (err) {
        console.error("❌ Duplicate API error:", err);
        res.json({
            success: false,
            message: "Server error: " + err.message
        });
    }
});

// POST /api/update-status - Update User Status for a record
router.post("/update-status", async (req, res) => {
    try {
        const { sapId, status } = req.body;

        if (!sapId || !status) {
            return res.json({
                success: false,
                message: "Invalid SAP ID or status"
            });
        }

        console.log(`📝 Updating status for SAP_ID ${sapId} to ${status}`);

        if (!poolPromise) {
            console.log("📝 Mock status update");
            res.json({
                success: true,
                message: "Status updated successfully"
            });
            return;
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('status', status)
            .input('sapId', sapId)
            .query('UPDATE Vendor_Invoice SET User_Status = @status WHERE SAP_ID = @sapId');

        console.log(`✅ Status updated successfully`);

        res.json({
            success: true,
            message: "Status updated successfully"
        });

    } catch (err) {
        console.error("❌ Update status error:", err);
        res.json({
            success: false,
            message: "Failed to update status: " + err.message
        });
    }
});

// POST /api/clear-user-status - Clear all User Status values
router.post("/clear-user-status", async (req, res) => {
    try {
        console.log("🧹 Clearing all User Status values...");

        if (!poolPromise) {
            console.log("🧹 Mock clear user status");
            res.json({
                success: true,
                message: "All User Status values cleared"
            });
            return;
        }

        const pool = await poolPromise;
        await pool.request().query("UPDATE Vendor_Invoice SET User_Status = ''");

        console.log("✅ All User Status values cleared");

        res.json({
            success: true,
            message: "All User Status values cleared"
        });

    } catch (err) {
        console.error("❌ Clear status error:", err);
        res.json({
            success: false,
            message: "Failed to clear status: " + err.message
        });
    }
});

// POST /api/clear-duplicate-validation - Clear duplicate validation
router.post("/clear-duplicate-validation", async (req, res) => {
    try {
        console.log("🧹 Clearing duplicate validation...");

        if (!poolPromise) {
            console.log("🧹 Mock clear duplicate validation");
            res.json({
                success: true,
                message: "Duplicate validation cleared"
            });
            return;
        }

        const pool = await poolPromise;
        await pool.request().query(`
            UPDATE Vendor_Invoice SET
                DUP_True_Duplicate = 0,
                Duplicate_Status = 'Not Checked',
                DUP_SG_Status = 0,
                DUP_SGL_Status = 0,
                DUP_SGLT_Status = 0,
                DUP_SGG_Status = 0,
                DUP_SGV_Status = 0,
                DUP_SGM_Status = 0,
                DUP_SGT_Status = 0,
                DUP_SGTA_Status = 0
        `);

        console.log("✅ Duplicate validation cleared");

        res.json({
            success: true,
            message: "Duplicate validation cleared"
        });

    } catch (err) {
        console.error("❌ Clear validation error:", err);
        res.json({
            success: false,
            message: "Failed to clear validation: " + err.message
        });
    }
});

// POST /api/run-duplicate-check - Execute duplicate check procedures
router.post("/run-duplicate-check", async (req, res) => {
    try {
        console.log("🔍 Running duplicate check procedures...");

        if (!poolPromise) {
            console.log("🔍 Mock duplicate check");
            res.json({
                success: true,
                message: "Duplicate check completed successfully"
            });
            return;
        }

        const pool = await poolPromise;

        const procedures = [
            "sp_UpdateVendorInvoiceValidation",
            "sp_FindDuplicateVendorInvoice",
            "sp_UpdateDuplicateStatus"
        ];

        for (const proc of procedures) {
            console.log(`⚙️ Executing ${proc}...`);
            await pool.request().execute(proc);
        }

        console.log("✅ All duplicate check procedures completed");

        res.json({
            success: true,
            message: "Duplicate check completed successfully"
        });

    } catch (err) {
        console.error("❌ Duplicate check error:", err);
        res.json({
            success: false,
            message: "Duplicate check failed: " + err.message
        });
    }
});

module.exports = router;

