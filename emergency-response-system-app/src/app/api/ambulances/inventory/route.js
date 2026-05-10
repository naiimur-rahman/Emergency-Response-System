import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const vehicle_id = searchParams.get('vehicle_id');

  try {
    let query = `
      SELECT vi.*, a.License_Plate, a.Unit_Type
      FROM Vehicle_Inventory vi
      JOIN Ambulance_Units a ON vi.Vehicle_ID = a.Vehicle_ID
    `;
    const params = [];

    if (vehicle_id) {
      query += ` WHERE vi.Vehicle_ID = $1`;
      params.push(vehicle_id);
    }
    
    query += ` ORDER BY vi.Expiry_Date ASC`;
    
    const result = await db.query(query, params);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { vehicle_id, item_name, quantity, expiry_date } = await req.json();

    if (!vehicle_id || !item_name || quantity === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const query = `
      INSERT INTO Vehicle_Inventory (Vehicle_ID, Item_Name, Quantity, Expiry_Date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [vehicle_id, item_name, quantity, expiry_date || null];
    
    const result = await db.query(query, values);
    return NextResponse.json({ success: true, item: result.rows[0] });
  } catch (err) {
    console.error('Error adding inventory item:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const inventory_id = searchParams.get('inventory_id');

  if (!inventory_id) {
    return NextResponse.json({ error: 'inventory_id is required' }, { status: 400 });
  }

  try {
    const query = `DELETE FROM Vehicle_Inventory WHERE Inventory_ID = $1 RETURNING *`;
    const result = await db.query(query, [inventory_id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting inventory item:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
