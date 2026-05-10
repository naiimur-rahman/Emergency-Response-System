import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req) {
  try {
    const { trip_id, rating, comments } = await req.json();

    if (!trip_id || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const query = `
      INSERT INTO Ratings_Reviews (Trip_ID, Rating, Comments)
      VALUES ($1, $2, $3)
      ON CONFLICT (Trip_ID) DO UPDATE SET Rating = EXCLUDED.Rating, Comments = EXCLUDED.Comments
      RETURNING *
    `;
    const values = [trip_id, rating, comments || null];
    
    const result = await db.query(query, values);
    return NextResponse.json({ success: true, review: result.rows[0] });
  } catch (err) {
    console.error('Error adding rating:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
