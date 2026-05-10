import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.pwkdehymrayzdzgcaxzv:Sohan786%4001994749847@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    // 1. Add 'Broadcast' to the req_status enum
    await client.query("ALTER TYPE req_status ADD VALUE IF NOT EXISTS 'Broadcast'");
    console.log("✅ Migration 1: Added 'Broadcast' to req_status enum");

    // 2. Check current enum values for confirmation
    const res = await client.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'req_status'
      ORDER BY e.enumsortorder
    `);
    console.log("✅ Current req_status values:", res.rows.map(r => r.enumlabel).join(', '));
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
