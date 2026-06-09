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
    const passwordHash = '$2b$10$auoWRTr.mNN9VZw8ZzcgoekJnIOikmzEvgjyfpBLgYilURYwS6L2C'; // corresponds to 'password123'
    
    await pool.query(`
      INSERT INTO staff_users (username, password_hash, role) 
      VALUES 
        ('admin', $1, 'Admin'),
        ('dispatcher', $1, 'Dispatcher')
      ON CONFLICT (username) DO NOTHING;
    `, [passwordHash]);

    console.log("Users seeded successfully!");
  } catch (err) {
    console.error("Error seeding users:", err);
  } finally {
    pool.end();
  }
}

run();
