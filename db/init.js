/**
 * One-shot DB initializer.
 * Reads schema.sql and applies it to the configured PostgreSQL database.
 *
 * Usage:  npm run db:init
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

(async () => {
  const sqlPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    console.log('Applying schema.sql ...');
    await pool.query(sql);
    console.log('Schema applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Schema apply failed:', err.message);
    process.exit(1);
  }
})();
