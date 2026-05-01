import { query, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query('SELECT * FROM drivers ORDER BY driver_id');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, license_no, shift_date, start_time, end_time } = await request.json();
    
    const result = await transaction(async (client) => {
      // 1. Insert Driver
      const drvRes = await client.query(
        `INSERT INTO drivers (name, license_no, shift_status)
         VALUES ($1, $2, 'Off_Duty') RETURNING *`,
        [name, license_no]
      );
      
      const newDriver = drvRes.rows[0];

      // 2. Insert Schedule if provided
      if (shift_date && start_time && end_time) {
        await client.query(
          `INSERT INTO shift_schedules (driver_id, shift_date, start_time, end_time)
           VALUES ($1, $2, $3, $4)`,
          [newDriver.driver_id, shift_date, start_time, end_time]
        );
      }

      return newDriver;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Driver creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { driver_id, shift_status } = await request.json();
    const result = await query(
      `UPDATE drivers SET shift_status = $1 WHERE driver_id = $2 RETURNING *`,
      [shift_status, driver_id]
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { driver_id } = await request.json();
    const result = await query(
      `DELETE FROM drivers WHERE driver_id = $1 RETURNING *`,
      [driver_id]
    );
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
