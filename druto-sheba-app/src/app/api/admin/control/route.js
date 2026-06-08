import { query } from '@/lib/db';
import { mockData } from '@/lib/mockData';
import { NextResponse } from 'next/server';

async function safeQuery(sql, params = []) {
  try {
    return await query(sql, params);
  } catch {
    return { rows: [], rowCount: 0 };
  }
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const [users, ambulances, audit, pricing] = await Promise.all([
    safeQuery('SELECT user_id, username, role, created_at, blocked FROM staff_users ORDER BY user_id'),
    safeQuery('SELECT * FROM ambulances ORDER BY vehicle_id'),
    safeQuery('SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 25'),
    safeQuery('SELECT * FROM pricing_config ORDER BY config_id LIMIT 1'),
  ]);

  return NextResponse.json({
    users: users.rows.length ? users.rows : (mockData.staffUsers || []),
    ambulances: ambulances.rows.length ? ambulances.rows : mockData.ambulances,
    pricing: pricing.rows[0] || mockData.pricingConfig,
    audit: audit.rows.length ? audit.rows : (mockData.auditLogs || []),
  });
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (body.type === 'user') {
      const user = await query(`
        INSERT INTO staff_users (username, password_hash, role)
        VALUES ($1, $2, $3)
        RETURNING user_id, username, role, created_at
      `, [body.username, body.password_hash || '$2b$10$lbCO/.i1PVdVx5uQl2m1AuwAN8is2IxOhLWsOmLV1qcpbgW.1x9vS', body.role || 'Dispatcher']);
      return NextResponse.json({ success: true, user: user.rows[0] }, { status: 201 });
    }

    if (body.type === 'ambulance') {
      const ambulance = await query(`
        INSERT INTO ambulances (license_plate, equipment_level, current_status, hub, next_service_date)
        VALUES ($1, $2, 'Available', $3, $4)
        RETURNING *
      `, [body.license_plate, body.equipment_level || 'Basic', body.hub || 'Central Hub', body.next_service_date || null]);
      return NextResponse.json({ success: true, ambulance: ambulance.rows[0] }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unsupported create type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

    if (body.type === 'pricing') {
      mockData.pricingConfig = {
        ...mockData.pricingConfig,
        base_fare: Number(body.base_fare),
        per_km_charge: Number(body.per_km_charge),
        night_multiplier: Number(body.night_multiplier),
        critical_surcharge: Number(body.critical_surcharge),
      };
      await safeQuery(`
        INSERT INTO pricing_config (config_id, base_fare, per_km_charge, night_multiplier, critical_surcharge)
        VALUES (1, $1, $2, $3, $4)
        ON CONFLICT (config_id) DO UPDATE
        SET base_fare = EXCLUDED.base_fare,
            per_km_charge = EXCLUDED.per_km_charge,
            night_multiplier = EXCLUDED.night_multiplier,
            critical_surcharge = EXCLUDED.critical_surcharge
      `, [body.base_fare, body.per_km_charge, body.night_multiplier, body.critical_surcharge]);
      return NextResponse.json({ success: true, pricing: mockData.pricingConfig });
    }

    if (body.type === 'user') {
      const updated = await query(`
        UPDATE staff_users
        SET role = COALESCE($1, role),
            blocked = COALESCE($2, blocked)
        WHERE user_id = $3
        RETURNING user_id, username, role, created_at, blocked
      `, [body.role || null, body.blocked, body.user_id]);
      return NextResponse.json({ success: true, user: updated.rows[0] });
    }

    if (body.type === 'ambulance') {
      const updated = await query(`
        UPDATE ambulances
        SET current_status = COALESCE($1, current_status),
            equipment_level = COALESCE($3, equipment_level),
            hub = COALESCE($4, hub),
            next_service_date = COALESCE($5, next_service_date)
        WHERE vehicle_id = $2
        RETURNING *
      `, [body.current_status || null, body.vehicle_id, body.equipment_level || null, body.hub || null, body.next_service_date || null]);
      return NextResponse.json({ success: true, ambulance: updated.rows[0] });
    }

    return NextResponse.json({ error: 'Unsupported update type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (type === 'user') {
      const deleted = await query('DELETE FROM staff_users WHERE user_id = $1 RETURNING user_id', [id]);
      return NextResponse.json({ success: true, deleted: deleted.rows[0] });
    }

    return NextResponse.json({ error: 'Unsupported delete type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
