import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { queryName } = await request.json();
    let sql = '';

    if (queryName === 'dispatch') {
      sql = `
        SELECT 
            h.Name AS Hospital_Name,
            h.ICU_Beds,
            s.Spec_Name AS Matched_Specialty,
            ROUND(ST_Distance(h.Location_Coords::geography, ST_SetSRID(ST_MakePoint(90.4125, 23.7925), 4326)::geography)::numeric / 1000, 2) AS Distance_KM,
            CASE 
                WHEN s.Spec_Name ILIKE '%Hypertension%' THEN '🏆 EXACT SPECIALTY MATCH'
                ELSE 'Generic Emergency'
            END AS Match_Quality
        FROM Hospitals h
        LEFT JOIN Hospital_Specializations hs ON h.Hospital_ID = hs.Hospital_ID
        LEFT JOIN Specializations s ON hs.Spec_ID = s.Spec_ID
        WHERE h.ICU_Beds > 0
        ORDER BY (s.Spec_Name ILIKE '%Hypertension%') DESC, Distance_KM ASC
        LIMIT 5;
      `;
    } else if (queryName === 'maintenance') {
      sql = `
        SELECT 
            License_Plate,
            Equipment_Level,
            Trips_Since_Maintenance,
            CASE 
                WHEN Trips_Since_Maintenance >= 50 THEN '🔴 CRITICAL: IMMEDIATE SERVICE REQUIRED'
                WHEN Trips_Since_Maintenance >= 40 THEN '🟡 WARNING: SERVICE SOON'
                ELSE '🟢 HEALTHY'
            END AS Fleet_Status,
            ROUND(AVG(Trips_Since_Maintenance) OVER (), 1) as Fleet_Avg_Usage
        FROM Ambulances
        ORDER BY Trips_Since_Maintenance DESC;
      `;
    } else if (queryName === 'zones') {
      sql = `
        SELECT 
            dz.Zone_Name,
            dz.Priority_Level,
            COUNT(er.Request_ID) AS Total_Emergencies,
            RANK() OVER (ORDER BY COUNT(er.Request_ID) DESC) as Danger_Rank
        FROM Dispatch_Zones dz
        LEFT JOIN Emergency_Requests er ON ST_Contains(dz.Zone_Boundary, er.Pickup_Coords)
        GROUP BY dz.Zone_ID, dz.Zone_Name, dz.Priority_Level
        ORDER BY Danger_Rank ASC;
      `;
    } else if (queryName === 'audit') {
      sql = `
        SELECT 
            Audit_ID,
            Table_Name,
            Operation,
            Changed_At,
            New_Values->>'status' AS New_Status,
            Old_Values->>'status' AS Old_Status,
            CASE 
                WHEN (Old_Values->>'status') IS DISTINCT FROM (New_Values->>'status')
                THEN 'Status Transition Detected'
                ELSE 'No Change'
            END AS Audit_Flag
        FROM Audit_Log
        ORDER BY Changed_At DESC
        LIMIT 10;
      `;
    } else {
      return NextResponse.json({ error: 'Invalid query name' }, { status: 400 });
    }

    const res = await query(sql);
    return NextResponse.json({ rows: res.rows, sql });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
