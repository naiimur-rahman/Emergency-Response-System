import { query, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action;
    const driver_id = body.driver_id;
    const request_id = String(body.request_id).trim(); // Clean the ID

    console.log(`[API] Driver ${driver_id} performing ${action} on Request ${request_id}`);

    let newStatus = 'Active';
    if (action === 'Accept') newStatus = 'En Route';
    if (action === 'Picked') newStatus = 'Picked Up';
    if (action === 'Arrived') newStatus = 'Arrived';
    if (action === 'Complete') newStatus = 'Resolved';

    await transaction(async (client) => {
      // 1. Double check if someone else already took it (Atomic check)
      const check = await client.query('SELECT status FROM emergency_requests WHERE CAST(request_id AS TEXT) = $1 FOR UPDATE', [request_id]);

      if (check.rows.length === 0) {
        throw new Error(`Mission ${request_id} not found in database.`);
      }

      const allowedStatuses = ['Broadcast', 'Pending', 'Active', 'En Route', 'Picked Up', 'Arrived'];
      if (!allowedStatuses.includes(check.rows[0].status)) {
        throw new Error('This mission is in a state that cannot be modified or has already been completed.');
      }

      // If accepting from broadcast, we must initialize the trip
      if (action === 'Accept') {
        // If it is already Active, we don't need to re-initialize everything
        if (check.rows[0].status !== 'Active') {
          // 2. Find an available ambulance
          const ambRes = await client.query("SELECT vehicle_id FROM ambulances WHERE current_status = 'Available' LIMIT 1");
          if (ambRes.rowCount === 0) throw new Error('No available ambulances found.');
          const vehicle_id = ambRes.rows[0].vehicle_id;

          // 3. Find a hospital
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
      }

      // Update main request status
      await client.query(
        'UPDATE emergency_requests SET status = $1 WHERE request_id = $2',
        [newStatus, request_id]
      );

      // Handle completion cleanup
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
    console.error('Accept API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
