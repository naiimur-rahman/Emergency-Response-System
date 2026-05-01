import { query, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query(`
      SELECT h.*, 
             ST_Y(location_coords::geometry) as lat, ST_X(location_coords::geometry) as lon,
             COALESCE(json_agg(s.spec_name) FILTER (WHERE s.spec_name IS NOT NULL), '[]') as specializations
      FROM hospitals h
      LEFT JOIN hospital_specializations hs ON h.hospital_id = hs.hospital_id
      LEFT JOIN specializations s ON hs.spec_id = s.spec_id
      GROUP BY h.hospital_id
      ORDER BY h.hospital_id
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, lat, lon, general_beds, icu_beds, type, spec_ids } = await request.json();
    
    const result = await transaction(async (client) => {
      // 1. Insert Hospital
      const hospRes = await client.query(
        `INSERT INTO hospitals (name, location_coords, general_beds, icu_beds, type)
         VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6) RETURNING *`,
        [name, lon, lat, general_beds || 0, icu_beds || 0, type || 'Private']
      );
      
      const newHospital = hospRes.rows[0];

      // 2. Link Specializations if provided
      if (spec_ids && Array.isArray(spec_ids)) {
        for (const spec_id of spec_ids) {
          await client.query(
            `INSERT INTO hospital_specializations (hospital_id, spec_id, specialist_count)
             VALUES ($1, $2, $3)`,
            [newHospital.hospital_id, spec_id, 1] // Default 1 specialist per spec
          );
        }
      }

      return newHospital;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Hospital creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { hospital_id, general_beds, icu_beds } = await request.json();
    const result = await query(
      `UPDATE hospitals SET general_beds = $1, icu_beds = $2 WHERE hospital_id = $3 RETURNING *`,
      [general_beds, icu_beds, hospital_id]
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
