const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../emergency-response-system-app/.env.local');

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

const seedFile = path.join(__dirname, './02_seed.sql');

if (!fs.existsSync(seedFile)) {
  console.error('Error: Seed file not found at ' + seedFile);
  process.exit(1);
}

const seedSql = fs.readFileSync(seedFile, 'utf8');

async function runSeed() {
  try {
    console.log('==========================================');
    console.log('🚀 DATABASE SEED TOOL');
    console.log('==========================================');
    console.log('Applying: ' + path.basename(seedFile));
    
    await pool.query(seedSql);
    
    console.log('------------------------------------------');
    console.log('✅ SUCCESS: Seed data applied successfully.');
    console.log('==========================================');
  } catch (err) {
    console.error('❌ FAILURE: Seeding failed.');
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

runSeed();
