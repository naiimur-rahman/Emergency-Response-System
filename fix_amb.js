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
    await pool.query(`
      UPDATE ambulances
      SET current_location = hub::geometry,
          hub = 'Central Hub'
      WHERE hub LIKE '0101%';
    `);
    console.log("Fixed ambulances table data!");
  } catch (err) {
    console.error("Error fixing:", err);
  } finally {
    pool.end();
  }
}

run();
