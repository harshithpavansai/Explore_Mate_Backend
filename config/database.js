/**
 * Database connection facade.
 *
 * Development defaults to an in-memory adapter so the Flutter app can talk to a
 * working API without requiring PostgreSQL on day one. Set DB_MODE=postgres or
 * DATABASE_URL to use the real PostgreSQL pool.
 */
if (process.env.DB_MODE !== 'postgres' && !process.env.DATABASE_URL) {
  module.exports = require('./memoryDatabase');
  return;
}

const { Pool } = require('pg');

const useSSL = (process.env.PG_SSL || 'false').toLowerCase() === 'true';

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'exploremate',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      ssl: useSSL ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool({ ...poolConfig, max: 20, idleTimeoutMillis: 30_000 });

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[pg] Unexpected idle client error', err.message);
});

/**
 * Convenience query wrapper.
 * @param {string} text SQL with $1, $2 ... placeholders
 * @param {Array} params positional parameters
 */
const query = (text, params) => pool.query(text, params);

/**
 * Run a sequence of statements inside a single transaction.
 * @param {(client: import('pg').PoolClient) => Promise<any>} fn
 */
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, withTransaction };
