const fs = require('fs');
const { Pool } = require('pg');

const envLocal = fs.readFileSync('druto-sheba-app/.env.local', 'utf8');
const dbUrl = envLocal.match(/(?:PG_CONNECTION_STRING|DATABASE_URL)=(.*)/)?.[1];

const pool = new Pool({
  connectionString: dbUrl.trim(),
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query(`
CREATE OR REPLACE VIEW active_dashboard_view AS
 SELECT er.request_id,
    er.patient_id,
    p.name AS patient_name,
    p.blood_type,
    p.allergies,
    er.primary_specialization,
    st_x((er.pickup_coords)::geometry) AS patient_lon,
    st_y((er.pickup_coords)::geometry) AS patient_lat,
    er.severity_level,
    er.emergency_type,
    er.requested_for,
    er.timestamp_created,
    er.status AS request_status,
    a.license_plate AS assigned_ambulance,
    h.name AS destination_hospital,
    h.type AS hospital_type,
    st_x((a.current_location)::geometry) AS ambulance_lon,
    st_y((a.current_location)::geometry) AS ambulance_lat,
    tl.driver_id,
    d.name AS driver_name
   FROM (((((emergency_requests er
     JOIN patients p ON ((er.patient_id = p.patient_id)))
     LEFT JOIN trip_logs tl ON (((er.request_id)::text = (tl.trip_id)::text)))
     LEFT JOIN ambulances a ON ((tl.vehicle_id = a.vehicle_id)))
     LEFT JOIN hospitals h ON ((tl.hospital_id = h.hospital_id)))
     LEFT JOIN drivers d ON ((tl.driver_id = d.driver_id)))
  WHERE (er.status = ANY (ARRAY['Broadcast'::req_status, 'Pending'::req_status, 'Active'::req_status, 'En Route'::req_status, 'Picked Up'::req_status, 'Arrived'::req_status]));
    `);
    console.log("View created successfully!");
  } catch (err) {
    console.error("Error creating view:", err);
  } finally {
    pool.end();
  }
}

run();
