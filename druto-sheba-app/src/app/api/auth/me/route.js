import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_development_only');

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const portal = searchParams.get('portal');

    const adminCookie = req.cookies.get('admin_session');
    const dispatcherCookie = req.cookies.get('dispatcher_session');
    
    let sessionCookie;
    if (portal === 'dispatcher') {
      sessionCookie = dispatcherCookie || adminCookie;
    } else if (portal === 'admin') {
      sessionCookie = adminCookie || dispatcherCookie;
    } else {
      sessionCookie = adminCookie || dispatcherCookie;
    }

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);
    return NextResponse.json({ role: payload.role, username: payload.username });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}
