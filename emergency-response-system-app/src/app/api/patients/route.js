import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query(`
      SELECT p.*, array_agg(pc.condition_name) FILTER (WHERE pc.condition_name IS NOT NULL) as conditions
      FROM patients p
      LEFT JOIN patient_conditions pc ON p.patient_id = pc.patient_id
      GROUP BY p.patient_id ORDER BY p.patient_id
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, phone, blood_type } = await request.json();
    const result = await query(
      `INSERT INTO patients (name, phone, blood_type) VALUES ($1, $2, $3) RETURNING *`,
      [name, phone, blood_type]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
