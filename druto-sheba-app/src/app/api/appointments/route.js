import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    if (patientId) {
      const result = await query(
        `SELECT da.*,
                d.name AS doctor_name, d.phone AS doctor_phone,
                h.name AS hospital_name,
                s.spec_name
         FROM doctor_assignments da
         JOIN doctors d ON da.doctor_id = d.doctor_id
         LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id
         LEFT JOIN specializations s ON d.spec_id = s.spec_id
         WHERE da.patient_id = $1::integer
         ORDER BY da.assignment_id DESC`,
        [patientId]
      );

      const formatted = result.rows.map(row => ({
        assignment_id: row.assignment_id,
        patient_id: row.patient_id,
        doctor_id: row.doctor_id,
        appointment_date: row.appointment_date,
        appointment_time: row.appointment_time,
        status: row.status,
        payment_status: row.payment_status,
        payment_reminder_sent: row.payment_reminder_sent,
        doctors: {
          name: row.doctor_name,
          phone: row.doctor_phone,
          hospitals: { name: row.hospital_name },
          specializations: { spec_name: row.spec_name }
        }
      }));

      return NextResponse.json(formatted);
    } else {
      // Admin dashboard view
      const result = await query(
        `SELECT da.*,
                p.name AS patient_name,
                d.name AS doctor_name
         FROM doctor_assignments da
         JOIN patients p ON da.patient_id = p.patient_id
         JOIN doctors d ON da.doctor_id = d.doctor_id
         ORDER BY da.assignment_id DESC`
      );

      const formatted = result.rows.map(row => ({
        assignment_id: row.assignment_id,
        patient_id: row.patient_id,
        doctor_id: row.doctor_id,
        appointment_date: row.appointment_date,
        appointment_time: row.appointment_time,
        status: row.status,
        payment_status: row.payment_status,
        payment_reminder_sent: row.payment_reminder_sent,
        patients: { name: row.patient_name },
        doctors: { name: row.doctor_name }
      }));

      return NextResponse.json(formatted);
    }
  } catch (error) {
    console.error('Fetch appointments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time } = await request.json();

    if (!patient_id || !doctor_id || !appointment_date) {
      return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
    }

    const timeString = appointment_time || '10:00:00';

    const result = await query(
      `INSERT INTO doctor_assignments (patient_id, doctor_id, appointment_date, appointment_time)
       VALUES ($1::integer, $2::integer, $3::date, $4::time)
       RETURNING *`,
      [patient_id, doctor_id, appointment_date, timeString]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Create appointment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { assignment_id, status, payment_status, payment_reminder_sent, appointment_date, appointment_time } = await request.json();

    if (!assignment_id) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    const setClauses = [];
    const params = [];

    let finalPaymentStatus = payment_status;

    // Automatic cancellation refund/NA logic
    if (status === 'Cancelled') {
      const currentRes = await query('SELECT payment_status FROM doctor_assignments WHERE assignment_id = $1::integer', [assignment_id]);
      if (currentRes.rows.length > 0) {
        const currentPay = currentRes.rows[0].payment_status;
        if (currentPay === 'Paid') {
          finalPaymentStatus = 'Refunded';
        } else if (currentPay === 'Unpaid') {
          finalPaymentStatus = 'N/A';
        }
      }
    }

    if (status !== undefined) {
      params.push(status);
      setClauses.push(`status = $${params.length}::assignment_status`);
    }

    if (finalPaymentStatus !== undefined) {
      params.push(finalPaymentStatus);
      setClauses.push(`payment_status = $${params.length}`);
    }

    if (payment_reminder_sent !== undefined) {
      params.push(payment_reminder_sent);
      setClauses.push(`payment_reminder_sent = $${params.length}::boolean`);
    }

    if (appointment_date !== undefined) {
      params.push(appointment_date);
      setClauses.push(`appointment_date = $${params.length}::date`);
    }

    if (appointment_time !== undefined) {
      params.push(appointment_time);
      setClauses.push(`appointment_time = $${params.length}::time`);
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    params.push(assignment_id);
    const sql = `
      UPDATE doctor_assignments 
      SET ${setClauses.join(', ')}
      WHERE assignment_id = $${params.length}::integer 
      RETURNING *
    `;

    const result = await query(sql, params);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Appointment assignment not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Update appointment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
