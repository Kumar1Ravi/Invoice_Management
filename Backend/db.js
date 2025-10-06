const { sql } = require('@vercel/postgres');

// Vercel Postgres handles connection automatically via POSTGRES_URL env var
// No need for manual connection setup

module.exports = { sql };
