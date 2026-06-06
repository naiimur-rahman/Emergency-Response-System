import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, password, role } = body;

    if (!username || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['Admin', 'Dispatcher'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await query('SELECT * FROM Staff_Users WHERE Username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO Staff_Users (Username, Password_Hash, Role) VALUES ($1, $2, $3) RETURNING User_ID, Username, Role, Created_At',
      [username, passwordHash, role]
    );

    return NextResponse.json({ success: true, user: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
