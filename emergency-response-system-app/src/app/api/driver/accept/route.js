import { query, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { request_id, action } = await request.json(); 

    let newStatus = 'Active'; // Fallback
    if (action === 'Accept') newStatus = 'En Route';
    if (action === 'Picked') newStatus = 'Picked Up';
    if (action === 'Arrived') newStatus = 'Arrived';
    if (action === 'Complete') newStatus = 'Resolved';

    // Execute within an ACID transaction
    await transaction(async (client) => {
      await client.query(
        'UPDATE emergency_requests SET status = $1 WHERE request_id = $2',
        [newStatus, request_id]
      );

      if (action === 'Complete') {
         // Free up the ambulance
         await client.query(`
           UPDATE ambulances 
           SET current_status = 'Available' 
           WHERE vehicle_id = (SELECT vehicle_id FROM trip_logs WHERE request_id = $1 LIMIT 1)
         `, [request_id]);
      }
    });

    return NextResponse.json({ success: true, message: `Dispatch ${action}ed successfully.` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
