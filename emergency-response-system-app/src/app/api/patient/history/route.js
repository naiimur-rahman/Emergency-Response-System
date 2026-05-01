import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const res = await query(
      `SELECT tl.trip_id, er.timestamp_created, er.severity_level, 
              h.name as hospital_name, er.status
       FROM trip_logs tl
       JOIN emergency_requests er ON tl.request_id = er.request_id
       JOIN hospitals h ON tl.hospital_id = h.hospital_id
       ORDER BY er.timestamp_created DESC
       LIMIT 10`
    );

    const trips = res.rows.map(t => ({
      id: t.trip_id,
      date: new Date(t.timestamp_created).toLocaleString(),
      hospital: t.hospital_name,
      from: 'Emergency Location', 
      severity: t.severity_level,
      status: t.status,
      fare: '৳' + (Math.floor(Math.random() * 1500) + 500) // Random fare for invoice display
    }));

    return NextResponse.json(trips);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
