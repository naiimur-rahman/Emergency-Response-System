import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.pwkdehymrayzdzgcaxzv:Sohan786%4001994749847@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

const client = await pool.connect();
try {
  // Get ambulance IDs
  const ambRes = await client.query('SELECT vehicle_id FROM ambulances LIMIT 5');
  const vehicleIds = ambRes.rows.map(r => r.vehicle_id);
  
  if (vehicleIds.length === 0) {
    console.log('No ambulances found, skipping maintenance seed.');
    process.exit(0);
  }

  // Seed maintenance logs with realistic data spread over last 30 days
  const maintenanceData = [
    { vehicle_id: vehicleIds[0], type: 'Oil Change', desc: 'Full synthetic oil change', cost: 2500, days_ago: 28, tech: 'Rafiq Ahmed' },
    { vehicle_id: vehicleIds[0], type: 'Tyre Replacement', desc: 'Replaced all 4 tyres', cost: 18000, days_ago: 21, tech: 'Rafiq Ahmed' },
    { vehicle_id: vehicleIds[1 % vehicleIds.length], type: 'Brake Service', desc: 'Brake pads and fluid flush', cost: 6500, days_ago: 18, tech: 'Karim Hossain' },
    { vehicle_id: vehicleIds[1 % vehicleIds.length], type: 'AC Repair', desc: 'Compressor replacement', cost: 12000, days_ago: 14, tech: 'Karim Hossain' },
    { vehicle_id: vehicleIds[2 % vehicleIds.length], type: 'Engine Service', desc: 'Major engine overhaul', cost: 35000, days_ago: 10, tech: 'Sumon Mia' },
    { vehicle_id: vehicleIds[0], type: 'Electrical Fix', desc: 'Rewired siren and lights', cost: 4200, days_ago: 7, tech: 'Rafiq Ahmed' },
    { vehicle_id: vehicleIds[2 % vehicleIds.length], type: 'Oil Change', desc: 'Routine oil change', cost: 2500, days_ago: 4, tech: 'Sumon Mia' },
    { vehicle_id: vehicleIds[1 % vehicleIds.length], type: 'Wheel Alignment', desc: 'Full alignment and balancing', cost: 3000, days_ago: 2, tech: 'Karim Hossain' },
  ];

  let inserted = 0;
  for (const m of maintenanceData) {
    const dateStarted = new Date();
    dateStarted.setDate(dateStarted.getDate() - m.days_ago);
    const dateStr = dateStarted.toISOString().slice(0, 10);
    const dateCompleted = m.days_ago > 1 ? dateStr : null;

    await client.query(`
      INSERT INTO maintenance_logs (vehicle_id, maintenance_type, description, cost, date_started, date_completed, technician_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [m.vehicle_id, m.type, m.desc, m.cost, dateStr, dateCompleted, m.tech]);
    inserted++;
  }

  console.log(`✅ Seeded ${inserted} maintenance log entries`);

  // Verify
  const verify = await client.query('SELECT COUNT(*) FROM maintenance_logs');
  console.log('✅ Total maintenance_logs rows:', verify.rows[0].count);

  // Also add primary_specialization column if it doesn't exist
  try {
    await client.query(`ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS primary_specialization VARCHAR(100)`);
    console.log('✅ Added primary_specialization column to emergency_requests');
    
    // Update existing records with default value
    await client.query(`UPDATE emergency_requests SET primary_specialization = 'General Care' WHERE primary_specialization IS NULL`);
    console.log('✅ Updated existing emergency_requests with default specialization');
  } catch(e) {
    console.log('⚠️  primary_specialization column:', e.message);
  }

} catch(e) {
  console.error('❌ Error:', e.message);
} finally {
  client.release();
  await pool.end();
}
