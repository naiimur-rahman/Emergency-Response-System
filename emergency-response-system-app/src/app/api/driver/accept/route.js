import { query, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { request_id, action, driver_id } = await request.json(); 

    let newStatus = 'Active'; 
    if (action === 'Accept') newStatus = 'En Route';
    if (action === 'Picked') newStatus = 'Picked Up';
    if (action === 'Arrived') newStatus = 'Arrived';
    if (action === 'Complete') newStatus = 'Resolved';

    await transaction(async (client) => {
      // If accepting from broadcast, we must initialize the trip
      if (action === 'Accept') {
        // 1. Double check if someone else already took it (Atomic check)
        const check = await client.query('SELECT status FROM emergency_requests WHERE request_id = $1 FOR UPDATE', [request_id]);
        if (check.rows[0].status !== 'Broadcast' && check.rows[0].status !== 'Pending') {
           throw new Error('This mission has already been claimed by another unit.');
        }

        // 2. Find an available ambulance (or assume driver has one)
        // For simplicity in this demo, we pick the first available ambulance
        const ambRes = await client.query("SELECT vehicle_id FROM ambulances WHERE current_status = 'Available' LIMIT 1");
        if (ambRes.rowCount === 0) throw new Error('No available ambulances found.');
        const vehicle_id = ambRes.rows[0].vehicle_id;

        // 3. Find a hospital (Nearest/Suitable)
        const hospRes = await client.query("SELECT hospital_id FROM hospitals LIMIT 1");
        const hospital_id = hospRes.rows[0].hospital_id;

        // 4. Create Trip Log
        await client.query(`
          INSERT INTO Trip_Logs (Trip_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
          VALUES ($1, $2, $3, $4, 1)
          ON CONFLICT (Trip_ID) DO NOTHING
        `, [request_id, vehicle_id, driver_id || 1, hospital_id]);
        
        // 5. Reserve Ambulance
        await client.query("UPDATE ambulances SET current_status = 'Dispatched' WHERE vehicle_id = $1", [vehicle_id]);
      }

      await client.query(
        'UPDATE emergency_requests SET status = $1 WHERE request_id = $2',
        [newStatus, request_id]
      );

      if (action === 'Complete') {
         await client.query(`
           UPDATE ambulances 
           SET current_status = 'Available' 
           WHERE vehicle_id = (SELECT vehicle_id FROM trip_logs WHERE trip_id = $1 LIMIT 1)
         `, [request_id]);
      }
    });

    return NextResponse.json({ success: true, message: `Mission ${action}ed successfully.` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
