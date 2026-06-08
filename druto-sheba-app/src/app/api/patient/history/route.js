import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get('patient_id');
    
    let queryText = `
      SELECT tl.trip_id, er.request_id, er.timestamp_created, er.severity_level, 
             h.name as hospital_name, er.status, b.total_amount,
             (SELECT COUNT(*) FROM Trip_Feedback WHERE Trip_ID = tl.trip_id) as has_rating
      FROM trip_logs tl
      JOIN emergency_requests er ON tl.trip_id = er.request_id
      JOIN hospitals h ON tl.hospital_id = h.hospital_id
      LEFT JOIN billing b ON tl.trip_id = b.trip_id
    `;
    let queryParams = [];

    if (patient_id) {
      queryText += ' WHERE er.patient_id = $1 ';
      queryParams.push(patient_id);
    }
    
    queryText += ' ORDER BY er.timestamp_created DESC LIMIT 10';

    const res = await query(queryText, queryParams);

    const trips = res.rows.map(t => ({
      id: t.trip_id || t.request_id,
      date: new Date(t.timestamp_created).toLocaleString(),
      hospital: t.hospital_name,
      from: 'Emergency Location', 
      severity: t.severity_level,
      status: t.status,
      fare: t.total_amount ? '৳' + parseFloat(t.total_amount).toLocaleString() : 'Pending',
      hasRating: parseInt(t.has_rating) > 0
    }));

    return NextResponse.json(trips);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
