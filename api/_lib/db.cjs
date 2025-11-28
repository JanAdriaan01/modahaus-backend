// _lib/db.cjs
// PostgreSQL connection to Neon using Pool (with SSL)

const { Pool } = require('pg');

// Load DATABASE_URL from Vercel environment variables
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not defined in environment!');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Neon requires SSL
});

// Catch unexpected errors on idle clients
pool.on('error', (err) => {
  console.error('Unexpected DB error:', err);
});

// Export query helper
module.exports = {
  query: async (text, params) => {
    try {
      console.log('DB QUERY:', text, params); // Optional: remove logging in production
      const result = await pool.query(text, params);
      return result;
    } catch (err) {
      console.error('DB query error:', err);
      throw err; // Let the calling API handler handle errors
    }
  },
  pool
};
