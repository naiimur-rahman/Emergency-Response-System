import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.pwkdehymrayzdzgcaxzv:Sohan786%4001994749847@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

const client = await pool.connect();
try {
  // Check actual columns in emergency_requests
  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'emergency_requests' 
    ORDER BY ordinal_position
  `);
  console.log('emergency_requests columns:');
  cols.rows.forEach(r => console.log(' -', r.column_name, ':', r.data_type));

  // Also check maintenance_logs columns
  const mCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'maintenance_logs' 
    ORDER BY ordinal_position
  `);
  console.log('\nmaintenance_logs columns:');
  mCols.rows.forEach(r => console.log(' -', r.column_name, ':', r.data_type));

  // Check if there's any data at all in maintenance_logs
  const mCount = await client.query('SELECT COUNT(*) FROM maintenance_logs');
  console.log('\nmaintenance_logs count:', mCount.rows[0].count);
  
  // Check if vehicle_inventory table has data
  const inv = await client.query('SELECT COUNT(*) FROM vehicle_inventory');
  console.log('vehicle_inventory count:', inv.rows[0].count);

  // Seed some maintenance logs if empty
  const ambRes = await client.query('SELECT vehicle_id FROM ambulances LIMIT 3');
  console.log('\nAmbulances available:', ambRes.rows.map(r => r.vehicle_id));
} finally {
  client.release();
  await pool.end();
}
