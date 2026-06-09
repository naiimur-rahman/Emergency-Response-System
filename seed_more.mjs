import fs from 'fs';
import pkg from 'pg';
import { mockData } from './druto-sheba-app/src/lib/mockData.js';

const { Pool } = pkg;
const envLocal = fs.readFileSync('druto-sheba-app/.env.local', 'utf8');
const dbUrl = envLocal.match(/(?:PG_CONNECTION_STRING|DATABASE_URL)=(.*)/)?.[1];
const pool = new Pool({ connectionString: dbUrl.trim(), ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    console.log("Seeding more data...");
    
    // Maintenance Logs
    for (const ml of mockData.maintenanceLogs) {
      await pool.query(`
        INSERT INTO maintenance_logs (vehicle_id, maintenance_type, cost, description, date_started, date_completed)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [ml.vehicle_id, ml.maintenance_type, ml.cost, ml.description, ml.date_started, ml.date_completed]);
    }
    console.log("Seeded maintenance logs.");

    // Vehicle Inventory
    for (const vi of mockData.vehicleInventory) {
      await pool.query(`
        INSERT INTO vehicle_inventory (vehicle_id, item_name, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [vi.vehicle_id, vi.item_name, vi.quantity]);
    }
    console.log("Seeded vehicle inventory.");

    // Trip Feedback
    for (const tf of mockData.tripFeedback) {
      await pool.query(`
        INSERT INTO trip_feedback (trip_id, rating, comments, submitted_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [tf.request_id || tf.trip_id, tf.rating, tf.comments, tf.submitted_at || new Date().toISOString()]);
    }
    console.log("Seeded trip feedback.");

    console.log("Done!");
  } catch(e) {
    console.error(e);
  } finally { pool.end(); }
}
run();
