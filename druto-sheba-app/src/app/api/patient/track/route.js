import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await query(`
      SELECT 
        tl.trip_id,
        tl.time_dispatched,
        er.request_id,
        er.patient_id,
        er.pickup_coords,
        ST_X(er.pickup_coords::geometry) as patient_lon,
        ST_Y(er.pickup_coords::geometry) as patient_lat,
        er.severity_level,
        er.status as request_status,
        p.name as patient_name,
        p.phone as patient_phone,
        p.blood_type,
        h.name as hospital_name,
        ST_X(h.location_coords::geometry) as hospital_lon,
        ST_Y(h.location_coords::geometry) as hospital_lat,
        a.license_plate,
        ST_X(a.current_location::geometry) as ambulance_lon,
        ST_Y(a.current_location::geometry) as ambulance_lat,
        d.name as driver_name,
        d.phone as driver_phone
      FROM emergency_requests er
      JOIN patients p ON er.patient_id = p.patient_id
      LEFT JOIN trip_logs tl ON er.request_id::text = tl.trip_id
      LEFT JOIN hospitals h ON tl.hospital_id = h.hospital_id
      LEFT JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
      LEFT JOIN drivers d ON tl.driver_id = d.driver_id
      WHERE er.status IN ('Broadcast', 'Pending', 'Active', 'En Route', 'Picked Up', 'Arrived')
      ORDER BY er.timestamp_created DESC
      LIMIT 1
    `);

    const trip = res.rows[0] || null;
    let chatMessages = [];
    if (trip && trip.trip_id) {
      const chatRes = await query('SELECT * FROM chat_messages WHERE trip_id = $1 ORDER BY timestamp ASC', [trip.trip_id]);
      chatMessages = chatRes.rows;
    }

    return NextResponse.json({ active_trip: trip, chat_messages: chatMessages });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
