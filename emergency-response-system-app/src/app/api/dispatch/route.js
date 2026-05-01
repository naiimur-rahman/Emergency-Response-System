import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { request_id, dispatcher_id = 1 } = await request.json();
    console.log(`Dispatching request ${request_id}...`);
    
    // Call the automated dispatch function
    const result = await query('SELECT fn_automated_dispatch($1, $2) as result', [request_id, dispatcher_id]);
    const message = result.rows[0].result;
    
    console.log(`Dispatch result: ${message}`);
    
    // Check for success - the SQL returns "SUCCESS: ..."
    const isSuccess = message.toLowerCase().includes('success');
    
    return NextResponse.json({ 
      success: isSuccess, 
      message: message 
    }, { 
      status: isSuccess ? 200 : 400 
    });
    
  } catch (error) {
    console.error('Dispatch API Error:', error.message);
    return NextResponse.json({ 
      success: false, 
      message: 'Network or database error: ' + error.message 
    }, { 
      status: 500 
    });
  }
}
