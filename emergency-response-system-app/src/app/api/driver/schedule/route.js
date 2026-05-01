import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const driver_id = searchParams.get('driver_id');

  try {
    const res = await query(
      `SELECT shift_date as date, start_time, end_time 
       FROM shift_schedules 
       WHERE driver_id = $1 
       ORDER BY shift_date ASC, start_time ASC`,
      [driver_id || 1]
    );

    const shifts = res.rows.map(s => {
      const startHour = parseInt(s.start_time.split(':')[0]);
      let shiftType = 'Morning';
      if (startHour >= 14 && startHour < 22) shiftType = 'Evening';
      if (startHour >= 22 || startHour < 6) shiftType = 'Night';

      return {
        day: new Date(s.date).toLocaleDateString('en-US', { weekday: 'long' }),
        date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        shift: shiftType,
        time: `${s.start_time.substring(0,5)} - ${s.end_time.substring(0,5)}`,
        status: new Date(s.date) < new Date() ? 'Completed' : 'Upcoming',
        type: 'Regular'
      };
    });

    return NextResponse.json({ shifts });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
