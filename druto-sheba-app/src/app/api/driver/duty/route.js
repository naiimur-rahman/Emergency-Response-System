import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const driver_id = searchParams.get('driver_id');

  try {
    const [activeTripRes, broadcastRes] = await Promise.all([
      query(`
        SELECT 
          tl.trip_id, tl.vehicle_id, tl.time_dispatched, tl.time_arrived_scene, tl.time_reached_hospital,
          er.request_id, er.patient_id,
          ST_X(er.pickup_coords::geometry) as patient_lon,
          ST_Y(er.pickup_coords::geometry) as patient_lat,
          er.severity_level, er.emergency_type, er.requested_for, er.status as request_status,
          p.name as patient_name, p.phone as patient_phone, p.blood_type, p.allergies,
          COALESCE(json_agg(pc.condition_name) FILTER (WHERE pc.condition_name IS NOT NULL), '[]') as conditions,
          h.name as hospital_name,
          ST_X(h.location_coords::geometry) as hospital_lon,
          ST_Y(h.location_coords::geometry) as hospital_lat,
          a.license_plate
        FROM trip_logs tl
        JOIN emergency_requests er ON tl.trip_id = er.request_id
        JOIN patients p ON er.patient_id = p.patient_id
        LEFT JOIN patient_conditions pc ON p.patient_id = pc.patient_id
        JOIN hospitals h ON tl.hospital_id = h.hospital_id
        JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
        WHERE tl.driver_id = $1 AND er.status IN ('Active', 'En Route', 'Picked Up', 'Arrived')
        GROUP BY tl.trip_id, tl.vehicle_id, tl.time_dispatched, tl.time_arrived_scene, tl.time_reached_hospital,
                 er.request_id, er.patient_id, er.pickup_coords, er.severity_level, er.emergency_type,
                 er.requested_for, er.status, p.name, p.phone, p.blood_type, p.allergies,
                 h.name, h.location_coords, a.license_plate
        LIMIT 1
      `, [driver_id]),
      query(`
        SELECT 
          er.request_id, ST_X(er.pickup_coords::geometry) as patient_lon,
          ST_Y(er.pickup_coords::geometry) as patient_lat,
          er.severity_level, er.status as request_status,
          p.name as patient_name
        FROM emergency_requests er
        JOIN patients p ON er.patient_id = p.patient_id
        WHERE er.status = 'Broadcast'
        ORDER BY er.timestamp_created DESC
      `)
    ]);

    const trip = activeTripRes.rows[0] || null;
    let chatMessages = [];
    if (trip) {
      const chatRes = await query('SELECT * FROM chat_messages WHERE trip_id = $1 ORDER BY timestamp ASC', [trip.trip_id]);
      chatMessages = chatRes.rows;
    }

    return NextResponse.json({ 
      active_trip: trip,
      broadcast_requests: broadcastRes.rows,
      chat_messages: chatMessages
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
