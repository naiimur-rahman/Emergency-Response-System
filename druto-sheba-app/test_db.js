const fs = require('fs');
const { Pool } = require('pg');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const dbUrl = envLocal.match(/(?:PG_CONNECTION_STRING|DATABASE_URL)=(.*)/)?.[1];

if (!dbUrl) {
  console.log("No DB URL found");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl.trim(),
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query('SELECT * FROM staff_users LIMIT 5');
    console.log(res.rows);
    
    if (res.rows.length === 0) {
      console.log("No users found! We need to seed the database.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
