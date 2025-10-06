const { sql, poolPromise } = require('./Backend/db');

async function testConnection() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT 1 AS test');
        console.log('✅ DB Connected, test query result:', result.recordset);
        process.exit(0);
    } catch (err) {
        console.error('❌ DB Connection Failed:', err);
        process.exit(1);
    }
}

testConnection();
