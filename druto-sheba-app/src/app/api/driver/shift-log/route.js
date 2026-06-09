import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driver_id');

    if (!driverId) {
      return NextResponse.json({ error: 'driver_id is required' }, { status: 400 });
    }

    const trips = await query(`
      SELECT tl.trip_id, tl.time_dispatched, er.status, er.severity_level
      FROM trip_logs tl
      JOIN emergency_requests er ON tl.trip_id = er.request_id::text
      WHERE tl.driver_id = $1
      ORDER BY tl.time_dispatched DESC
    `, [driverId]);

    const completedTrips = trips.rows.filter((trip) => trip.status === 'Resolved').length;
    const activeTrips = trips.rows.filter((trip) => ['Active', 'En Route', 'Picked Up', 'Arrived'].includes(trip.status)).length;
    const firstTrip = trips.rows[trips.rows.length - 1];
    const shiftStart = firstTrip?.time_dispatched ? new Date(firstTrip.time_dispatched) : new Date();
    const hoursWorked = Math.max(1, Math.round(((Date.now() - shiftStart.getTime()) / 36e5) * 10) / 10);
    const estimatedEarnings = completedTrips * 450 + activeTrips * 150;

    return NextResponse.json({
      hours_worked: hoursWorked,
      trips_completed: completedTrips,
      active_trips: activeTrips,
      estimated_earnings: estimatedEarnings,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
