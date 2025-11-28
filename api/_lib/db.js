// canonical DB helper
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL / DATABASE_URL_UNPOOLED env var');
}
const pool = new Pool({ connectionString });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};