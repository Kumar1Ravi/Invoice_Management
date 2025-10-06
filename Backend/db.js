const sql = require('mssql');

const config = {
    user: 'Kumar_IMS',
    password: 'Kumar@17071992',
    server: 'KUMARR\\SQLEXPRESS', // Use double backslash
    database: 'Kumar_IMS',
    options: {
        encrypt: false, // true if using Azure
        trustServerCertificate: true // required for local dev
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
