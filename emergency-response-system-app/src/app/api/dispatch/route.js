import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { request_id, dispatcher_id = 1 } = await request.json();
    console.log(`Dispatching request ${request_id}...`);
    const result = await query('SELECT fn_automated_dispatch($1, $2) as result', [request_id, dispatcher_id]);
    const message = result.rows[0].result;
    console.log(`Dispatch result: ${message}`);
    const success = message.startsWith('DISPATCH SUCCESS');
    return NextResponse.json({ success, message }, { status: success ? 200 : 422 });
  } catch (error) {
    console.error('Dispatch API Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
