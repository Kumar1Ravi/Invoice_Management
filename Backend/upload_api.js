const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const xlsx = require("xlsx");
const { parse } = require("csv-parse");
const { sql } = require("./db");

// Setup multer
const uploadDir = path.join(os.tmpdir(), "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Map columns to correct SQL types based on schema
function getSqlTypeForColumn(columnName, value) {
    // Handle null/undefined/empty - return empty string instead of NULL
    if (value === null || value === undefined || value === '') {
        return { type: sql.NVarChar, value: '' };
    }

    // Identity column - skip it
    if (columnName === 'SNo') {
        return null;
    }

    // BigInt columns
    if (['SAP_ID', 'GIS_ID'].includes(columnName)) {
        const num = String(value).replace(/[^\d]/g, ''); // Remove non-digits
        return { type: sql.BigInt, value: num ? parseInt(num) : '' };
    }

    // Date column
    if (columnName === 'Invoice_Date') {
        if (value === '' || value === null || value === undefined) {
            return { type: sql.NVarChar, value: '' }; // Store as empty string
        }
        try {
            const date = new Date(value);
            return { type: sql.Date, value: isNaN(date.getTime()) ? '' : date };
        } catch {
            return { type: sql.NVarChar, value: '' };
        }
    }

    // Decimal columns
    if ([
        'Service_Provider_Fee', 'Service_Provider_Fee_Tax', 
        'Govt_Fee', 'VFS_Fee', 'Misc_Other_Exp', 
        'Tax', 'Total_Invoice_Amount'
    ].includes(columnName)) {
        if (value === '' || value === null || value === undefined) {
            return { type: sql.NVarChar, value: '' }; // Store as empty string
        }
        const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
        return { type: sql.Decimal(18, 2), value: isNaN(num) ? '' : num };
    }

    // Bit (boolean) columns
    if (columnName.startsWith('DUP_')) {
        const val = String(value).toLowerCase();
        return { 
            type: sql.Bit, 
            value: ['true', '1', 'yes'].includes(val) ? 1 : 0 
        };
    }

    // Default: NVarChar for all text fields
    return { type: sql.NVarChar, value: String(value) };
}

// Insert data with proper type mapping
async function insertData(table, data) {
    if (!data || data.length === 0) {
        throw new Error("No data to insert");
    }

    const pool = await poolPromise;
    let insertedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
            const request = pool.request();
            const keys = Object.keys(row).filter(k => k !== 'SNo'); // Skip SNo
            const validKeys = [];
            
            // Add parameters with correct types
            keys.forEach(key => {
                const sqlType = getSqlTypeForColumn(key, row[key]);
                if (sqlType) {
                    request.input(key, sqlType.type, sqlType.value);
                    validKeys.push(key);
                }
            });

            if (validKeys.length === 0) {
                console.log(`⚠️ Row ${i + 1}: No valid columns to insert`);
                failedCount++;
                continue;
            }

            const cols = validKeys.join(",");
            const vals = validKeys.map(k => `@${k}`).join(",");
            
            await request.query(`INSERT INTO ${table} (${cols}) VALUES (${vals})`);
            insertedCount++;
        } catch (err) {
            console.error(`❌ Row ${i + 1} failed:`, err.message);
            failedCount++;
        }
    }

    return { insertedCount, failedCount };
}

// Vendor Upload
router.post("/upload/vendor", upload.single("vendor_file"), async (req, res) => {
    console.log("📤 Vendor upload started");
    
    try {
        if (!req.file) {
            return res.json({ success: false, message: "No file uploaded." });
        }

        console.log("📁 File:", req.file.originalname);

        const ext = path.extname(req.file.originalname).toLowerCase();
        let data = [];

        if (ext === ".csv") {
            const content = fs.readFileSync(req.file.path, "utf8");
            data = await new Promise((resolve, reject) => {
                parse(content, { 
                    columns: true, 
                    trim: true, 
                    skip_empty_lines: true
                }, (err, output) => {
                    if (err) reject(err);
                    else resolve(output);
                });
            });
        } else if (ext === ".xls" || ext === ".xlsx") {
            const workbook = xlsx.readFile(req.file.path);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
        } else {
            fs.unlinkSync(req.file.path);
            return res.json({ success: false, message: "Invalid file type." });
        }

        console.log(`✅ Parsed ${data.length} rows`);

        if (data.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.json({ success: false, message: "File is empty." });
        }

        console.log("💾 Inserting into Vendor_Invoice...");
        const result = await insertData("Vendor_Invoice", data);
        
        fs.unlinkSync(req.file.path);
        
        console.log(`✅ Inserted: ${result.insertedCount}, Failed: ${result.failedCount}`);
        
        if (result.insertedCount === 0) {
            return res.json({ 
                success: false, 
                message: `All ${result.failedCount} records failed. Check server logs.` 
            });
        }
        
        let message = `Success! ${result.insertedCount} records inserted.`;
        if (result.failedCount > 0) {
            message += ` (${result.failedCount} failed - check logs)`;
        }
        
        res.json({ success: true, message });
    } catch (err) {
        console.error("❌ Upload error:", err.message);
        
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.json({ 
            success: false, 
            message: "Upload failed: " + err.message 
        });
    }
});

// GIS Upload
router.post("/upload/gis", upload.single("gis_file"), async (req, res) => {
    console.log("📤 GIS upload started");
    
    try {
        if (!req.file) {
            return res.json({ success: false, message: "No file uploaded." });
        }

        console.log("📁 File:", req.file.originalname);

        const ext = path.extname(req.file.originalname).toLowerCase();
        let data = [];

        if (ext === ".csv") {
            const content = fs.readFileSync(req.file.path, "utf8");
            data = await new Promise((resolve, reject) => {
                parse(content, { 
                    columns: true, 
                    trim: true, 
                    skip_empty_lines: true
                }, (err, output) => {
                    if (err) reject(err);
                    else resolve(output);
                });
            });
        } else if (ext === ".xls" || ext === ".xlsx") {
            const workbook = xlsx.readFile(req.file.path);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
        } else {
            fs.unlinkSync(req.file.path);
            return res.json({ success: false, message: "Invalid file type." });
        }

        console.log(`✅ Parsed ${data.length} rows`);

        if (data.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.json({ success: false, message: "File is empty." });
        }

        console.log("💾 Inserting into New_GIS...");
        const result = await insertData("New_GIS", data);
        
        fs.unlinkSync(req.file.path);
        
        console.log(`✅ Inserted: ${result.insertedCount}, Failed: ${result.failedCount}`);
        
        if (result.insertedCount === 0) {
            return res.json({ 
                success: false, 
                message: `All ${result.failedCount} records failed. Check server logs.` 
            });
        }
        
        let message = `Success! ${result.insertedCount} records inserted.`;
        if (result.failedCount > 0) {
            message += ` (${result.failedCount} failed - check logs)`;
        }
        
        res.json({ success: true, message });
    } catch (err) {
        console.error("❌ Upload error:", err.message);
        
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.json({ 
            success: false, 
            message: "Upload failed: " + err.message 
        });
    }
});

module.exports = router;