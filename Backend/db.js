if (process.env.POSTGRES_URL) {
    // Use Vercel Postgres
    const { sql } = require('@vercel/postgres');
    module.exports = { sql };
} else {
    // Use local MSSQL
    const sql = require('mssql');

    const config = {
        user: process.env.DB_USER || 'Kumar_IMS',
        password: process.env.DB_PASSWORD || 'Kumar@17071992',
        server: process.env.DB_SERVER || 'KUMARR\\SQLEXPRESS',
        database: process.env.DB_NAME || 'Kumar_IMS',
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true' || false,
            trustServerCertificate: process.env.DB_TRUST_CERT === 'true' || true
        }
    };

    const poolPromise = sql.connect(config)
        .then(pool => {
            console.log('✅ Connected to SQL Server');
            return pool;
        })
        .catch(err => {
            console.error('❌ SQL Server Connection Error: ', err);
        });

    module.exports = { sql, poolPromise };
}
