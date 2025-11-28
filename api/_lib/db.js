// _lib/db.js
import pkg from 'pg';
const { Pool } = pkg;

// Connect to PostgreSQL using environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL // Set in Vercel environment
});

export default {
  query: (text, params) => pool.query(text, params),
  pool
};