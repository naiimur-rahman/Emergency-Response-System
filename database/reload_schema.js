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

async function reload() {
  const client = await pool.connect();
  try {
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log("Schema cache reloaded!");
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

reload();
