import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { vehicle_id, lat, lng } = await req.json();

    if (!vehicle_id || !lat || !lng) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await query(`
      UPDATE ambulances 
      SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)
      WHERE license_plate = $3 OR vehicle_id::text = $3
    `, [lng, lat, vehicle_id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Location Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
