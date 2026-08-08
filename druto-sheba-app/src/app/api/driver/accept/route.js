import { query, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action;
    const driver_id = body.driver_id;
    const request_id = String(body.request_id).trim(); // Clean the ID

    console.log('driver action:', {driver_id, action, request_id});

    let newStatus = 'Active';
    if (action === 'Accept') newStatus = 'En Route';
    if (action === 'Picked' || action === 'ArrivedPatient') newStatus = 'Picked Up';
    if (action === 'Arrived' || action === 'EnRouteHospital') newStatus = 'Arrived';
    if (action === 'Complete') newStatus = 'Resolved';

    await transaction(async (client) => {
      // lock row to prevent race condition
      const check = await client.query('SELECT status FROM emergency_requests WHERE CAST(request_id AS TEXT) = $1 FOR UPDATE', [request_id]);

      if (check.rows.length === 0) {
        throw new Error(`Request ${request_id} not found`);
      }

      const allowedStatuses = ['Broadcast', 'Pending', 'Active', 'En Route', 'Picked Up', 'Arrived'];
      if (!allowedStatuses.includes(check.rows[0].status)) {
        throw new Error('Invalid request state');
      }

      // If accepting from broadcast, we must initialize the trip
      if (action === 'Accept') {
        // If it is already Active, we don't need to re-initialize everything
        if (check.rows[0].status !== 'Active') {
          // Check if Trip_Log already exists
          const existingTrip = await client.query("SELECT vehicle_id, driver_id FROM trip_logs WHERE trip_id = $1", [request_id]);
          
          let vehicle_id;
          if (existingTrip.rowCount > 0) {
            vehicle_id = existingTrip.rows[0].vehicle_id;
            // Update the driver_id in case it was broadcasted or assigned to someone else
            await client.query("UPDATE trip_logs SET driver_id = $1 WHERE trip_id = $2", [driver_id, request_id]);
            // Make sure the vehicle is marked as dispatched
            await client.query("UPDATE ambulances SET current_status = $1 WHERE vehicle_id = $2", ['Dispatched', vehicle_id]);
          } else {
            // find ambulance
            const ambRes = await client.query("SELECT vehicle_id FROM ambulances WHERE current_status = 'Available' LIMIT 1");
            if (ambRes.rowCount === 0) throw new Error('No available ambulances found.');
            vehicle_id = ambRes.rows[0].vehicle_id;

            // get hospital from emergency request
            const reqRes = await client.query("SELECT hospital_id FROM emergency_requests WHERE request_id = $1", [request_id]);
            let hospital_id = reqRes.rows[0]?.hospital_id;

            if (!hospital_id) {
              const hospRes = await client.query("SELECT hospital_id FROM hospitals LIMIT 1");
              hospital_id = hospRes.rows[0]?.hospital_id;
            }

            // create trip log
            await client.query(`
              INSERT INTO Trip_Logs (Trip_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
              VALUES ($1, $2, $3, $4, 1)
            `, [request_id, vehicle_id, driver_id || 1, hospital_id]);

            // reserve ambulance
            await client.query("UPDATE ambulances SET current_status = $1 WHERE vehicle_id = $2", ['Dispatched', vehicle_id]);
          }
        }
      }

      // Update main request status
      await client.query(
        'UPDATE emergency_requests SET status = $1 WHERE request_id = $2',
        [newStatus, request_id]
      );

      if (action === 'Picked' || action === 'ArrivedPatient') {
        await client.query(
          'UPDATE trip_logs SET time_arrived_scene = COALESCE(time_arrived_scene, CURRENT_TIMESTAMP) WHERE trip_id = $1',
          [request_id]
        );
      }

      if (action === 'Arrived' || action === 'EnRouteHospital' || action === 'Complete') {
        await client.query(
          'UPDATE trip_logs SET time_reached_hospital = COALESCE(time_reached_hospital, CURRENT_TIMESTAMP) WHERE trip_id = $1',
          [request_id]
        );
      }

      if (driver_id) {
        await client.query(
          'UPDATE drivers SET shift_status = $1 WHERE driver_id = $2',
          [action === 'Complete' ? 'Available' : 'On_Trip', driver_id]
        );
      }

      // Handle completion cleanup
      if (action === 'Complete') {
        const tripRes = await client.query('SELECT vehicle_id FROM trip_logs WHERE trip_id = $1 LIMIT 1', [request_id]);
        if (tripRes.rowCount > 0) {
          await client.query(`
            UPDATE ambulances 
            SET current_status = $1 
            WHERE vehicle_id = $2
          `, ['Available', tripRes.rows[0].vehicle_id]);
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Action successful' });
  } catch (error) {
    console.error('Accept API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
