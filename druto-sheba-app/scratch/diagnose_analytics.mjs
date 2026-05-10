import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.pwkdehymrayzdzgcaxzv:Sohan786%4001994749847@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

const queries = [
  ['hospitalRank', `SELECT Name, ICU_Beds, General_Beds, RANK() OVER (ORDER BY ICU_Beds DESC) as icu_rank FROM Hospitals`],
  ['zoneAnalysis', `SELECT dz.Zone_Name, COUNT(er.Request_ID) as count FROM Dispatch_Zones dz LEFT JOIN Emergency_Requests er ON ST_Contains(dz.Zone_Boundary, er.Pickup_Coords) GROUP BY dz.Zone_ID, dz.Zone_Name ORDER BY count DESC`],
  ['maintenanceStats', `SELECT a.License_Plate, ml.Maintenance_Type, ml.Cost, ml.Date_Started, SUM(ml.Cost) OVER (PARTITION BY ml.Vehicle_ID ORDER BY ml.Date_Started) as running_total FROM Maintenance_Logs ml JOIN Ambulances a ON ml.Vehicle_ID = a.Vehicle_ID`],
  ['inventoryAlerts', `SELECT a.License_Plate, vi.Item_Name, vi.Quantity, CASE WHEN vi.Quantity <= 2 THEN 'LOW' ELSE 'OK' END as status FROM Vehicle_Inventory vi JOIN Ambulances a ON vi.Vehicle_ID = a.Vehicle_ID WHERE vi.Quantity <= 5`],
  ['costTrend', `SELECT TO_CHAR(DATE_TRUNC('day', Date_Started), 'DD Mon') as day, SUM(Cost) as total_cost FROM Maintenance_Logs GROUP BY day ORDER BY MIN(Date_Started) ASC`],
  ['recentReviews', `SELECT tf.*, p.name as patient_name FROM Trip_Feedback tf JOIN Trip_Logs tl ON tf.trip_id = tl.trip_id JOIN Emergency_Requests er ON tl.trip_id = er.request_id JOIN Patients p ON er.patient_id = p.patient_id ORDER BY tf.submitted_at DESC LIMIT 5`],
  ['responseTime', `SELECT CASE WHEN (EXTRACT(EPOCH FROM (tl.time_dispatched - er.timestamp_created)) / 60) < 5 THEN '< 5 min' WHEN (EXTRACT(EPOCH FROM (tl.time_dispatched - er.timestamp_created)) / 60) < 10 THEN '5-10 min' WHEN (EXTRACT(EPOCH FROM (tl.time_dispatched - er.timestamp_created)) / 60) < 15 THEN '10-15 min' ELSE '15+ min' END as range, COUNT(*) as count FROM trip_logs tl JOIN emergency_requests er ON tl.trip_id = er.request_id GROUP BY range`],
  ['specDist', `SELECT COALESCE(primary_specialization, 'General Care') as spec, COUNT(*) as count FROM emergency_requests GROUP BY spec ORDER BY count DESC`],
  ['requestTrend', `SELECT TO_CHAR(DATE_TRUNC('day', timestamp_created), 'DD Mon') as day, COUNT(*) as count FROM emergency_requests WHERE timestamp_created > NOW() - INTERVAL '7 days' GROUP BY day ORDER BY MIN(timestamp_created) ASC`],
  ['checkTables', `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`],
];

const client = await pool.connect();
try {
  for (const [name, sql] of queries) {
    try {
      const res = await client.query(sql);
      console.log(`✅ ${name}: ${res.rowCount} row(s)`, res.rows[0] ? JSON.stringify(res.rows[0]).substring(0, 80) : '(empty)');
    } catch (e) {
      console.error(`❌ ${name}: ${e.message}`);
    }
  }
} finally {
  client.release();
  await pool.end();
}
