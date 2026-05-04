import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const res = await query(`
      SELECT 
        b.Bill_ID,
        b.Trip_ID,
        h.Name as hospital_name,
        b.Amount,
        b.Tax,
        b.Total_Amount,
        b.Payment_Status,
        b.Date_Issued
      FROM Billing b
      JOIN Trip_Logs tl ON b.Trip_ID = tl.Trip_ID
      JOIN Hospitals h ON tl.Hospital_ID = h.Hospital_ID
      WHERE b.Patient_ID = $1
      ORDER BY b.Date_Issued DESC
    `, [patientId]);
    
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
