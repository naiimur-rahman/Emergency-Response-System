import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const driver_id = searchParams.get('driver_id');

  try {
    const res = await query(
      `SELECT tl.trip_id, er.timestamp_created, p.name as patient_name, 
              h.name as hospital_name, er.status
       FROM trip_logs tl
       JOIN emergency_requests er ON tl.request_id = er.request_id
       JOIN patients p ON er.patient_id = p.patient_id
       JOIN hospitals h ON tl.hospital_id = h.hospital_id
       WHERE tl.driver_id = $1 AND er.status = 'Resolved'
       ORDER BY er.timestamp_created DESC`,
      [driver_id || 1]
    );

    const trips = res.rows.map(t => ({
      id: t.trip_id,
      date: new Date(t.timestamp_created).toLocaleString(),
      patient: t.patient_name,
      from: 'Emergency Location', // We'd use PostGIS reverse geocoding here normally
      to: t.hospital_name,
      fare: '৳' + (Math.floor(Math.random() * 1000) + 500), // Random fare for display
      rating: (Math.random() * (5 - 4) + 4).toFixed(1), // Random rating 4.0-5.0
      time: Math.floor(Math.random() * 45) + 15 + 'm'
    }));

    return NextResponse.json({ 
      earnings: '৳' + (trips.length * 850), 
      rating: 4.8, 
      trips 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
