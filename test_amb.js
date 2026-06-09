const fs = require('fs');
const { Pool } = require('pg');

const envLocal = fs.readFileSync('druto-sheba-app/.env.local', 'utf8');
const dbUrl = envLocal.match(/(?:PG_CONNECTION_STRING|DATABASE_URL)=(.*)/)?.[1];

const pool = new Pool({
  connectionString: dbUrl.trim(),
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query('SELECT * FROM ambulances LIMIT 1');
    console.log(res.rows[0]);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    pool.end();
  }
}

run();
