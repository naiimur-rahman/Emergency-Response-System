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
    const triggerSql = fs.readFileSync('database/05_automated_triggers.sql', 'utf8');
    await pool.query(triggerSql);
    console.log("Triggers and Views seeded successfully!");
  } catch (err) {
    console.error("Error seeding triggers:", err);
  } finally {
    pool.end();
  }
}

run();
