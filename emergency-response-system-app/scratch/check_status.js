const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim().replace(/^"|"$/g, '');
});

const pool = new Pool({
  connectionString: env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false }
});

async function checkStatusEnum() {
  try {
    // Check if it's a domain or enum
    const res = await pool.query(`
      SELECT e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'request_status' OR t.typname = 'status'
    `);
    console.log('Enum Values:', res.rows.map(r => r.enumlabel));
    
    // Also check current data in the table to see what's actually there
    const dataRes = await pool.query("SELECT DISTINCT status FROM emergency_requests");
    console.log('Current statuses in table:', dataRes.rows.map(r => r.status));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkStatusEnum();
