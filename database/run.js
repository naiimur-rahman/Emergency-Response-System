const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../druto-sheba-app/.env.local');

if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local not found at ' + envPath);
  process.exit(1);
}

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

async function runFile(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    console.error('Error: file not found at ' + filePath);
    return;
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log('Applying: ' + filename + '...');
  await pool.query(sql);
}

async function main() {
  const action = process.argv[2]; // 'schema', 'seed', or 'both'

  try {
    console.log('==========================================');
    console.log('🚀 DATABASE MANAGEMENT TOOL');
    console.log('==========================================');

    if (action === 'schema' || action === 'both' || !action) {
      await runFile('schema.sql');
    }

    if (action === 'seed' || action === 'both') {
      await runFile('seed.sql');
    }

    console.log('------------------------------------------');
    console.log('✅ SUCCESS: Operation completed.');
    console.log('==========================================');
  } catch (err) {
    console.error('❌ FAILURE: Operation failed.');
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
