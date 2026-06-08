const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.pwkdehymrayzdzgcaxzv:Sohan786%400112420186@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query("DROP VIEW IF EXISTS active_dashboard_view;");
    await client.query("ALTER TABLE Ambulances ALTER COLUMN License_Plate TYPE VARCHAR(50);");
    await client.query(`
      CREATE OR REPLACE VIEW Active_Dashboard_View AS
      SELECT 
          er.Request_ID, er.Patient_ID, p.Name AS Patient_Name, p.Blood_Type, p.Allergies,
          er.Primary_Specialization,
          ST_X(er.Pickup_Coords::geometry) AS Patient_Lon,
          ST_Y(er.Pickup_Coords::geometry) AS Patient_Lat,
          er.Severity_Level, er.Emergency_Type, er.Requested_For, er.Timestamp_Created,
          er.Status AS Request_Status, a.License_Plate AS Assigned_Ambulance,
          h.Name AS Destination_Hospital, h.Type AS Hospital_Type,
          ST_X(a.Current_Location::geometry) AS Ambulance_Lon,
          ST_Y(a.Current_Location::geometry) AS Ambulance_Lat,
          tl.Driver_ID AS Driver_ID,
          d.Name AS Driver_Name
      FROM Emergency_Requests er
      JOIN Patients p ON er.Patient_ID = p.Patient_ID
      LEFT JOIN Trip_Logs tl ON er.Request_ID = tl.Trip_ID
      LEFT JOIN Ambulances a ON tl.Vehicle_ID = a.Vehicle_ID
      LEFT JOIN Hospitals h ON tl.Hospital_ID = h.Hospital_ID
      LEFT JOIN Drivers d ON tl.Driver_ID = d.Driver_ID
      WHERE er.Status IN ('Broadcast', 'Pending', 'Active', 'En Route', 'Picked Up', 'Arrived');
    `);
    console.log("View recreated successfully!");
  } finally {
    client.release();
    pool.end();
  }
}

run();
