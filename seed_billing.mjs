import fs from 'fs';
import pkg from 'pg';
import { mockData } from './druto-sheba-app/src/lib/mockData.js';

const { Pool } = pkg;
const envLocal = fs.readFileSync('druto-sheba-app/.env.local', 'utf8');
const dbUrl = envLocal.match(/(?:PG_CONNECTION_STRING|DATABASE_URL)=(.*)/)?.[1];
const pool = new Pool({ connectionString: dbUrl.trim(), ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    console.log("Seeding billing data...");
    
    // Billing
    for (const b of mockData.billing) {
      const tripLog = mockData.tripLogs.find(tl => tl.trip_id === b.trip_id);
      const mappedTripId = tripLog ? tripLog.request_id : b.trip_id;
      const status = b.payment_status === 'Pending' ? 'Unpaid' : b.payment_status;

      await pool.query(`
        INSERT INTO Billing (trip_id, patient_id, amount, tax, payment_status, date_issued)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [mappedTripId, b.patient_id, b.amount, b.tax, status, b.date_issued]);
    }
    console.log("Seeded billing.");

    console.log("Done!");
  } catch(e) {
    console.error(e);
  } finally { pool.end(); }
}
run();
