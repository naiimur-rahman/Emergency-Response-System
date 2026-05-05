import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    let sql = `
      SELECT p.*, array_agg(pc.condition_name) FILTER (WHERE pc.condition_name IS NOT NULL) as conditions
      FROM patients p
      LEFT JOIN patient_conditions pc ON p.patient_id = pc.patient_id
    `;
    const params = [];

    if (patientId) {
      sql += ` WHERE p.patient_id = $1`;
      params.push(patientId);
    }
    
    sql += ` GROUP BY p.patient_id ORDER BY p.patient_id`;

    const result = await query(sql, params);
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

export async function PATCH(request) {
  try {
    const data = await request.json();
    const { patient_id, name, phone, blood_type, address, primary_specialization, conditions } = data;

    if (!patient_id) {
      return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
    }

    // Update Patients table
    await query(
      `UPDATE patients 
       SET name = $1, phone = $2, blood_type = $3, address = $4, primary_specialization = $5 
       WHERE patient_id = $6`,
      [name, phone, blood_type, address, primary_specialization, patient_id]
    );

    // Update conditions
    await query(`DELETE FROM patient_conditions WHERE patient_id = $1`, [patient_id]);
    
    if (Array.isArray(conditions) && conditions.length > 0) {
      for (const condition of conditions) {
        await query(
          `INSERT INTO patient_conditions (patient_id, condition_name) VALUES ($1, $2)`,
          [patient_id, condition]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

