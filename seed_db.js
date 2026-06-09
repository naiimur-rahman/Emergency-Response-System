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
    const seedSql = fs.readFileSync('database/06_seed_data.sql', 'utf8');
    await pool.query(seedSql);
    console.log("Database seeded successfully!");
  } catch (err) {
    console.error("Error seeding:", err);
  } finally {
    pool.end();
  }
}

run();
