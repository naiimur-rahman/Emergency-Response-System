import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await query(`
      SELECT 
        b.Bill_ID,
        b.Trip_ID,
        p.Name as patient_name,
        b.Amount,
        b.Tax,
        b.Total_Amount,
        b.Payment_Status,
        b.Date_Issued
      FROM Billing b
      JOIN Patients p ON b.Patient_ID = p.Patient_ID
      ORDER BY b.Date_Issued DESC
    `);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { bill_id, status } = await request.json();
    if (!bill_id || !status) return NextResponse.json({ error: 'Missing bill_id or status' }, { status: 400 });

    const res = await query(`
      UPDATE Billing 
      SET Payment_Status = $1 
      WHERE Bill_ID = $2 
      RETURNING *
    `, [status, bill_id]);

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
