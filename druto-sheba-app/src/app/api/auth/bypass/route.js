import { NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_development_only');

export async function POST(req) {
  try {
    const adminCookie = req.cookies.get('admin_session');
    if (!adminCookie) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { password } = body;
    if (!password) {
      return NextResponse.json({ error: 'Password verification required' }, { status: 400 });
    }

    // Verify Admin JWT
    const { payload } = await jwtVerify(adminCookie.value, JWT_SECRET);
    if (payload.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    // Fetch the admin user record from the database to check their password hash
    const userResult = await query('SELECT * FROM Staff_Users WHERE User_ID = $1 OR user_id = $1', [payload.userId]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash || user.Password_Hash);
    
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Incorrect password. Verification failed.' }, { status: 401 });
    }

    const adminUsername = payload.username;
    const bypassUsername = `Bypass Dispatcher: ${adminUsername} (Admin)`;

    // Generate Dispatcher JWT for bypass
    const token = await new SignJWT({
        userId: payload.userId,
        username: bypassUsername,
        role: 'Dispatcher'
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h') // Short expiration for safety
      .sign(JWT_SECRET);

    const response = NextResponse.json({ success: true }, { status: 200 });

    // Set dispatcher_session cookie
    response.cookies.set({
      name: 'dispatcher_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

    return response;
  } catch (error) {
    console.error('Bypass API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
