const { query } = require('../src/lib/db');

async function migrate() {
  try {
    await query("ALTER TYPE req_status ADD VALUE IF NOT EXISTS 'Broadcast'");
    console.log("Migration successful: Added 'Broadcast' to req_status");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    process.exit();
  }
}

migrate();
