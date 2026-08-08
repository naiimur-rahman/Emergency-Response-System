import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trip_id = searchParams.get('trip_id');
    
    let result;
    if (!trip_id || trip_id === 'staff_chat') {
      result = await query(
        'SELECT message_id, trip_id, sender, message_text as text, timestamp FROM chat_messages WHERE trip_id IS NULL ORDER BY timestamp ASC'
      );
    } else {
      result = await query(
        'SELECT message_id, trip_id, sender, message_text as text, timestamp FROM chat_messages WHERE trip_id = $1 ORDER BY timestamp ASC',
        [trip_id]
      );
    }
    
    return NextResponse.json({ success: true, messages: result.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { trip_id, text, sender } = await request.json();
    
    const dbTripId = (!trip_id || trip_id === 'staff_chat') ? null : trip_id;
    
    await query(
      'INSERT INTO chat_messages (trip_id, sender, message_text) VALUES ($1, $2, $3)',
      [dbTripId, sender, text]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
