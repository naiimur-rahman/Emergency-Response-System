const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../druto-sheba-app/.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
  const match = line.match(/^([^#\s][^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const pool = new Pool({
  connectionString: env.PG_CONNECTION_STRING
});

async function grantPerms() {
  const client = await pool.connect();
  try {
    const tables = ['doctors', 'doctor_schedules', 'doctor_assignments', 'hospitals', 'specializations'];
    for (const table of tables) {
      await client.query(`GRANT ALL ON TABLE ${table} TO anon, authenticated, service_role`);
      console.log(`Granted access to ${table}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

grantPerms();
