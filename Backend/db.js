const sql = require('mssql');

let poolPromise = null;

if (process.env.DB_USER || process.env.DB_PASSWORD || process.env.DB_SERVER) {
    const config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: process.env.DB_NAME || 'Kumar_IMS',
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true' || false,
            trustServerCertificate: process.env.DB_TRUST_CERT === 'true' || true
        }
    };

    poolPromise = sql.connect(config)
        .then(pool => {
            console.log('✅ Connected to SQL Server');
            return pool;
        })
        .catch(err => {
            console.error('❌ SQL Server Connection Error: ', err);
        });
} else {
    console.log('ℹ️ No DB config found');
}

module.exports = { sql, poolPromise };
