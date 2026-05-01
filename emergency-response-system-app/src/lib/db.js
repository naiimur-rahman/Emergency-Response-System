import { Pool } from 'pg';

let pool;

if (!global.pgPool) {
  global.pgPool = new Pool({
    user: process.env.PG_USER || process.env.USER || 'naimurrahman',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'nexus_response',
    password: process.env.PG_PASSWORD || '',
    port: parseInt(process.env.PG_PORT || '5432'),
    max: 20,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 5000,
  });
}

pool = global.pgPool;

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text: text.substring(0, 80), duration, rows: res.rowCount });
  }
  return res;
}

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export default pool;
