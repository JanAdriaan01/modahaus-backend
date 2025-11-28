// _lib/db.js
// Handles PostgreSQL connection to Neon DB using pool
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) console.error('DATABASE_URL not defined in environment!');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Neon requires SSL
});

pool.on('error', (err) => {
  console.error('Unexpected DB error:', err);
});

module.exports = {
  query: async (text, params) => {
    try {
      console.log('DB QUERY:', text, params);
      const result = await pool.query(text, params);
      return result;
    } catch (err) {
      console.error('DB query error:', err);
      throw err; // propagate to auth.js
    }
  },
  pool
};