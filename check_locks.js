import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;
const envLocal = fs.readFileSync('druto-sheba-app/.env.local', 'utf8');
const dbUrl = envLocal.match(/(?:PG_CONNECTION_STRING|DATABASE_URL)=(.*)/)?.[1];
const pool = new Pool({ connectionString: dbUrl.trim(), ssl: { rejectUnauthorized: false } });
async function run() {
  try {
    const res = await pool.query(`SELECT pid, wait_event_type, wait_event, state, query FROM pg_stat_activity WHERE state = 'active'`);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally { pool.end(); }
}
run();
