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

async function testDispatch() {
  try {
    console.log('Testing Dispatch for Request #1...');
    const res = await pool.query('SELECT fn_automated_dispatch(1, 1) as result');
    console.log('Response:', res.rows[0].result);
  } catch (err) {
    console.error('SQL ERROR DETECTED:');
    console.error(err.message);
    if (err.hint) console.error('HINT:', err.hint);
    if (err.where) console.error('LOCATION:', err.where);
  } finally {
    await pool.end();
  }
}

testDispatch();
