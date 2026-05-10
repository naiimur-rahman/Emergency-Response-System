import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Fetch active maintenance (in shop)
    const activeRes = await query(`
      SELECT m.*, a.license_plate, a.equipment_level 
      FROM maintenance_logs m
      JOIN ambulances a ON m.vehicle_id = a.vehicle_id
      WHERE m.date_completed IS NULL
      ORDER BY m.date_started DESC
    `);

    // 2. Fetch maintenance history
    const historyRes = await query(`
      SELECT m.*, a.license_plate, a.equipment_level 
      FROM maintenance_logs m
      JOIN ambulances a ON m.vehicle_id = a.vehicle_id
      WHERE m.date_completed IS NOT NULL
      ORDER BY m.date_completed DESC
      LIMIT 50
    `);

    // 3. Fetch available ambulances for the "New Maintenance" dropdown
    const availableRes = await query(`
      SELECT vehicle_id, license_plate 
      FROM ambulances 
      WHERE current_status = 'Available'
    `);

    // 4. Calculate total maintenance investment
    const costRes = await query('SELECT SUM(cost) as total FROM maintenance_logs WHERE date_completed IS NOT NULL');

    return NextResponse.json({
      active: activeRes.rows,
      history: historyRes.rows,
      available_ambulances: availableRes.rows,
      total_investment: parseFloat(costRes.rows[0].total) || 0
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { vehicle_id, maintenance_type, description, estimated_cost, technician_name } = body;

    // Insert into maintenance_logs. The trigger 'trg_maintenance_status' will automatically set ambulance status to 'Maintenance'.
    const res = await query(`
      INSERT INTO maintenance_logs (vehicle_id, maintenance_type, description, cost, date_started, technician_name)
      VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
      RETURNING *
    `, [vehicle_id, maintenance_type, description, estimated_cost || 0, technician_name]);

    return NextResponse.json({ success: true, log: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { log_id, final_cost } = body;

    // Mark as completed. The trigger will automatically set ambulance status to 'Available'.
    const res = await query(`
      UPDATE maintenance_logs 
      SET date_completed = CURRENT_DATE, cost = COALESCE($1, cost)
      WHERE log_id = $2
      RETURNING *
    `, [final_cost, log_id]);

    return NextResponse.json({ success: true, log: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
