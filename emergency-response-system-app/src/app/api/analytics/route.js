import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [hospitalRank, zoneAnalysis, maintenanceStats, inventoryAlerts] = await Promise.all([
      // Hospital Rank by ICU Beds (Window Function)
      query(`
        SELECT Name, ICU_Beds, General_Beds,
        RANK() OVER (ORDER BY ICU_Beds DESC) as icu_rank
        FROM Hospitals
      `),
      // Zone-based Emergency analysis (Spatial Join)
      query(`
        SELECT dz.Zone_Name, COUNT(er.Request_ID) as count
        FROM Dispatch_Zones dz
        LEFT JOIN Emergency_Requests er ON ST_Contains(dz.Zone_Boundary, er.Pickup_Coords)
        GROUP BY dz.Zone_ID, dz.Zone_Name
        ORDER BY count DESC
      `),
      // Maintenance Costs (Running Total)
      query(`
        SELECT a.License_Plate, ml.Maintenance_Type, ml.Cost, ml.Date_Started,
        SUM(ml.Cost) OVER (PARTITION BY ml.Vehicle_ID ORDER BY ml.Date_Started) as running_total
        FROM Maintenance_Logs ml
        JOIN Ambulances a ON ml.Vehicle_ID = a.Vehicle_ID
      `),
      // Inventory Alerts (CTE + Case)
      query(`
        SELECT a.License_Plate, vi.Item_Name, vi.Quantity,
        CASE WHEN vi.Quantity <= 2 THEN 'LOW' ELSE 'OK' END as status
        FROM Vehicle_Inventory vi
        JOIN Ambulances a ON vi.Vehicle_ID = a.Vehicle_ID
        WHERE vi.Quantity <= 5
      `)
    ]);

    return NextResponse.json({
      hospitalRank: hospitalRank.rows,
      zoneAnalysis: zoneAnalysis.rows,
      maintenanceStats: maintenanceStats.rows,
      inventoryAlerts: inventoryAlerts.rows
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
