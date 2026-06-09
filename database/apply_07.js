const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../druto-sheba-app/.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim().replace(/^"|"$/g, '');
});

const pool = new Pool({
  connectionString: env.PG_CONNECTION_STRING,
  ssl: env.PG_CONNECTION_STRING.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function main() {
  const filePath = path.join(__dirname, '07_doctor_assigning.sql');
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log('Applying: 07_doctor_assigning.sql');
  try {
    await pool.query(sql);
    console.log('Successfully applied 07_doctor_assigning.sql');
  } catch (err) {
    console.error('Error applying sql:', err);
  } finally {
    await pool.end();
  }
}

main();
