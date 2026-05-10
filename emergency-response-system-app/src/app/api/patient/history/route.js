import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const res = await query(
      `SELECT tl.trip_id, er.timestamp_created, er.severity_level, 
              h.name as hospital_name, er.status, b.total_amount
       FROM trip_logs tl
       JOIN emergency_requests er ON tl.trip_id = er.request_id
       JOIN hospitals h ON tl.hospital_id = h.hospital_id
       LEFT JOIN billing b ON tl.trip_id = b.trip_id
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
      fare: t.total_amount ? '৳' + parseFloat(t.total_amount).toLocaleString() : 'Pending'
    }));

    return NextResponse.json(trips);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
