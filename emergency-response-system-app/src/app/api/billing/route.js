import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

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
