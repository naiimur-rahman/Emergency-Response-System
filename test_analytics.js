import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;
const envLocal = fs.readFileSync('druto-sheba-app/.env.local', 'utf8');
const dbUrl = envLocal.match(/(?:PG_CONNECTION_STRING|DATABASE_URL)=(.*)/)?.[1];
const pool = new Pool({ connectionString: dbUrl.trim(), ssl: { rejectUnauthorized: false } });

async function safeQuery(sql) {
  try { return await pool.query(sql); }
  catch (e) { console.error('Query failed:', e.message); return { rows: [] }; }
}

async function run() {
    await safeQuery(`SELECT Name, ICU_Beds, General_Beds, RANK() OVER (ORDER BY ICU_Beds DESC) as icu_rank FROM Hospitals LIMIT 1`);
    await safeQuery(`SELECT dz.Zone_Name, COUNT(er.Request_ID) as count FROM Dispatch_Zones dz LEFT JOIN Emergency_Requests er ON ST_Contains(dz.Zone_Boundary, er.Pickup_Coords) GROUP BY dz.Zone_ID, dz.Zone_Name LIMIT 1`);
    await safeQuery(`SELECT a.License_Plate, ml.Maintenance_Type, ml.Cost, ml.Date_Started, SUM(ml.Cost) OVER (PARTITION BY ml.Vehicle_ID ORDER BY ml.Date_Started) as running_total FROM Maintenance_Logs ml JOIN Ambulances a ON ml.Vehicle_ID = a.Vehicle_ID LIMIT 1`);
    await safeQuery(`SELECT a.License_Plate, vi.Item_Name, vi.Quantity, CASE WHEN vi.Quantity <= 2 THEN 'LOW' ELSE 'OK' END as status FROM Vehicle_Inventory vi JOIN Ambulances a ON vi.Vehicle_ID = a.Vehicle_ID LIMIT 1`);
    await safeQuery(`SELECT TO_CHAR(DATE_TRUNC('day', Date_Started), 'DD Mon') as day, SUM(Cost) as total_cost FROM Maintenance_Logs GROUP BY day LIMIT 1`);
    await safeQuery(`SELECT tf.*, p.name as patient_name FROM Trip_Feedback tf JOIN Trip_Logs tl ON tf.trip_id = tl.trip_id JOIN Emergency_Requests er ON tl.trip_id = er.request_id JOIN Patients p ON er.patient_id = p.patient_id LIMIT 1`);
    await safeQuery(`SELECT CASE WHEN (EXTRACT(EPOCH FROM (tl.time_dispatched - er.timestamp_created)) / 60) < 5 THEN '< 5 min' ELSE '15+ min' END as range, COUNT(*) as count FROM trip_logs tl JOIN emergency_requests er ON tl.trip_id = er.request_id GROUP BY range LIMIT 1`);
    await safeQuery(`SELECT COALESCE(primary_specialization, 'General Care') as spec, COUNT(*) as count FROM emergency_requests GROUP BY spec LIMIT 1`);
    await safeQuery(`SELECT TO_CHAR(DATE_TRUNC('day', timestamp_created), 'DD Mon') as day, COUNT(*) as count FROM emergency_requests GROUP BY day LIMIT 1`);
    pool.end();
}
run();
