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
    const tables = [
      'hospitals', 'ambulances', 'drivers', 'patients', 'emergency_requests', 'trip_logs'
    ];
    for (const table of tables) {
      const res = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${res.rows[0].count}`);
    }
  } catch (err) {
    console.error("Error checking db:", err);
  } finally {
    pool.end();
  }
}

run();
