import { NextResponse } from 'next/server';

export async function POST(request) {
  return NextResponse.json({ success: true, message: 'Test API reached' });
}
