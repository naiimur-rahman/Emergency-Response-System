import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query(`
      SELECT tl.*, p.name as patient_name, p.blood_type, 
             a.license_plate, d.name as driver_name, h.name as hospital_name,
             er.severity_level, er.status as request_status
      FROM trip_logs tl
      JOIN emergency_requests er ON tl.request_id = er.request_id
      JOIN patients p ON er.patient_id = p.patient_id
      JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
      JOIN drivers d ON tl.driver_id = d.driver_id
      JOIN hospitals h ON tl.hospital_id = h.hospital_id
      ORDER BY tl.time_dispatched DESC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
