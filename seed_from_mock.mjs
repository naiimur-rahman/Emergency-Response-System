import fs from 'fs';
import pkg from 'pg';
import { mockData } from './druto-sheba-app/src/lib/mockData.js';

const { Pool } = pkg;

const envLocal = fs.readFileSync('druto-sheba-app/.env.local', 'utf8');
const dbUrl = envLocal.match(/(?:PG_CONNECTION_STRING|DATABASE_URL)=(.*)/)?.[1];

const pool = new Pool({
  connectionString: dbUrl.trim(),
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Starting seed from mockData.js...");
    
    // Clear tables
    await pool.query(`
      TRUNCATE TABLE trip_feedback, maintenance_logs, trip_logs, emergency_requests, patients, hospital_specializations, specializations, hospitals, ambulances, drivers, vehicle_inventory, patient_conditions, chat_messages, dispatch_zones RESTART IDENTITY CASCADE;
    `);

    // Seed Specializations
    for (const s of mockData.specializations) {
      await pool.query(`INSERT INTO specializations (spec_id, spec_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [s.spec_id, s.name]);
    }
    await pool.query(`ALTER SEQUENCE specializations_spec_id_seq RESTART WITH 100;`);

    // Seed Hospitals
    for (const h of mockData.hospitals) {
      await pool.query(`
        INSERT INTO hospitals (hospital_id, name, location_coords, general_beds, icu_beds, type)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7)
      `, [h.hospital_id, h.name, h.lon, h.lat, h.general_beds, h.icu_beds, h.type]);
      
      if (h.specializations && h.specializations.length > 0) {
        for (const spec of h.specializations) {
          const specRes = await pool.query('SELECT spec_id FROM specializations WHERE spec_name = $1', [spec]);
          if (specRes.rows.length > 0) {
            await pool.query('INSERT INTO hospital_specializations (hospital_id, spec_id) VALUES ($1, $2)', [h.hospital_id, specRes.rows[0].spec_id]);
          } else {
             const newSpec = await pool.query('INSERT INTO specializations (spec_name) VALUES ($1) RETURNING spec_id', [spec]);
             await pool.query('INSERT INTO hospital_specializations (hospital_id, spec_id) VALUES ($1, $2)', [h.hospital_id, newSpec.rows[0].spec_id]);
          }
        }
      }
    }
    console.log(`Seeded ${mockData.hospitals.length} hospitals.`);

    // Seed Patients
    for (const p of mockData.patients) {
      await pool.query(`
        INSERT INTO patients (patient_id, name, phone, blood_type, allergies)
        VALUES ($1, $2, $3, $4, $5)
      `, [p.patient_id, p.name, p.phone, p.blood_type, p.allergies]);
      
      if (p.conditions && p.conditions.length > 0) {
        for (const c of p.conditions) {
          await pool.query(`INSERT INTO patient_conditions (patient_id, condition_name) VALUES ($1, $2)`, [p.patient_id, c]);
        }
      }
    }
    console.log(`Seeded ${mockData.patients.length} patients.`);

    // Seed Drivers
    for (const d of mockData.drivers) {
      await pool.query(`
        INSERT INTO drivers (driver_id, name, license_no, shift_status)
        VALUES ($1, $2, $3, $4)
      `, [d.driver_id, d.name, d.license_no, d.shift_status]);
    }
    console.log(`Seeded ${mockData.drivers.length} drivers.`);

    // Seed Ambulances
    for (let i = 0; i < mockData.ambulances.length; i++) {
      const a = mockData.ambulances[i];
      await pool.query(`
        INSERT INTO ambulances (vehicle_id, license_plate, equipment_level, current_status, hub, current_location)
        VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326))
      `, [a.vehicle_id, a.license_plate, a.equipment_level, a.current_status, a.hub || 'Central Hub', a.lon || 90.4100, a.lat || 23.7750]);
      if (i % 5 === 0) console.log(`Seeded ${i + 1} ambulances...`);
    }
    console.log(`Seeded ${mockData.ambulances.length} ambulances.`);

    // Seed Emergency Requests
    for (let i = 0; i < mockData.emergencyRequests.length; i++) {
      const er = mockData.emergencyRequests[i];
      await pool.query(`
        INSERT INTO emergency_requests (request_id, patient_id, pickup_coords, severity_level, emergency_type, requested_for, status, timestamp_created)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8, $9)
      `, [er.request_id, er.patient_id, er.lon, er.lat, er.severity_level, er.emergency_type, er.requested_for, er.status, er.timestamp_created]);
      if (i % 5 === 0) console.log(`Seeded ${i + 1} emergency requests...`);
    }
    console.log(`Seeded ${mockData.emergencyRequests.length} emergency requests.`);

    // Seed Trip Logs
    for (const tl of mockData.tripLogs) {
      await pool.query(`
        INSERT INTO trip_logs (trip_id, vehicle_id, driver_id, hospital_id, dispatcher_id, time_dispatched, time_reached_hospital)
        VALUES ($1, $2, $3, $4, 1, $5, $6)
      `, [tl.request_id, tl.vehicle_id, tl.driver_id, tl.hospital_id, tl.time_dispatched, tl.time_reached_hospital]);
    }
    console.log(`Seeded ${mockData.tripLogs.length} trip logs.`);

    console.log("Mock data migration complete!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    pool.end();
  }
}

run();
