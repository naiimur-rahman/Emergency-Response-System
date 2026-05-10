import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

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
        a.license_plate
      FROM trip_logs tl
      JOIN emergency_requests er ON tl.trip_id = er.request_id
      JOIN patients p ON er.patient_id = p.patient_id
      JOIN hospitals h ON tl.hospital_id = h.hospital_id
      JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
      WHERE er.status IN ('Pending', 'Active', 'En Route', 'Picked Up', 'Arrived')
      ORDER BY tl.time_dispatched DESC
      LIMIT 1
    `);

    return NextResponse.json({ active_trip: res.rows[0] || null });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
