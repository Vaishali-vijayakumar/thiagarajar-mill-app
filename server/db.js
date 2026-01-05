const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Use DATABASE_URL if available (standard for cloud providers), 
// otherwise use individual credentials or default to local (which requires setup)
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false // Cloud DBs usually require SSL
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
  } else {
    console.log('Connected to PostgreSQL database');
    release();
  }
});

const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res.rows;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
};

const run = async (text, params) => {
    try {
        const res = await pool.query(text, params);
        // Postgres returns rowCount for updates/inserts
        return { changes: res.rowCount, rows: res.rows }; 
    } catch (err) {
        console.error('Database run error:', err);
        throw err;
    }
}

const get = async (text, params) => {
    try {
        const res = await pool.query(text, params);
        return res.rows[0];
    } catch (err) {
        console.error('Database get error:', err);
        throw err;
    }
}

module.exports = {
  query,
  run,
  get,
  pool
};
