import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import mockData from '@/lib/mockData';

export async function POST(request) {
  try {
    const { trip_id, text, sender } = await request.json();
    
    await query(
      'INSERT INTO chat_messages (trip_id, sender, message_text) VALUES ($1, $2, $3)',
      [trip_id, sender, text]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
