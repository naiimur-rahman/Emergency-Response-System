const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Path to your project's .env file
const envPath = path.join(__dirname, '../emergency-response-system-app/.env.local');

if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local not found at ' + envPath);
  process.exit(1);
}

// 2. Parse Environment Variables
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim().replace(/^"|"$/g, '');
});

// 3. Setup Database Connection
const pool = new Pool({
  connectionString: env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false }
});

// 4. Migration File Selection
// Pointing to the "Safe Mode" Schema (No DROP commands)
const migrationFile = path.join(__dirname, './01_schema.sql');

if (!fs.existsSync(migrationFile)) {
  console.error('Error: Migration file not found at ' + migrationFile);
  process.exit(1);
}

const migrationSql = fs.readFileSync(migrationFile, 'utf8');

async function runMigration() {
  try {
    console.log('==========================================');
    console.log('🚀 DATABASE MIGRATION TOOL');
    console.log('==========================================');
    console.log('Applying: ' + path.basename(migrationFile));
    
    await pool.query(migrationSql);
    
    console.log('------------------------------------------');
    console.log('✅ SUCCESS: Database updated successfully.');
    console.log('==========================================');
  } catch (err) {
    console.error('❌ FAILURE: Migration failed.');
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
