import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [hospitalRank, zoneAnalysis, maintenanceStats, inventoryAlerts, costTrend, recentReviews] = await Promise.all([
      // ... (queries stay the same)
      query(`
        SELECT Name, ICU_Beds, General_Beds,
        RANK() OVER (ORDER BY ICU_Beds DESC) as icu_rank
        FROM Hospitals
      `),
      query(`
        SELECT dz.Zone_Name, COUNT(er.Request_ID) as count
        FROM Dispatch_Zones dz
        LEFT JOIN Emergency_Requests er ON ST_Contains(dz.Zone_Boundary, er.Pickup_Coords)
        GROUP BY dz.Zone_ID, dz.Zone_Name
        ORDER BY count DESC
      `),
      query(`
        SELECT a.License_Plate, ml.Maintenance_Type, ml.Cost, ml.Date_Started,
        SUM(ml.Cost) OVER (PARTITION BY ml.Vehicle_ID ORDER BY ml.Date_Started) as running_total
        FROM Maintenance_Logs ml
        JOIN Ambulances a ON ml.Vehicle_ID = a.Vehicle_ID
      `),
      query(`
        SELECT a.License_Plate, vi.Item_Name, vi.Quantity,
        CASE WHEN vi.Quantity <= 2 THEN 'LOW' ELSE 'OK' END as status
        FROM Vehicle_Inventory vi
        JOIN Ambulances a ON vi.Vehicle_ID = a.Vehicle_ID
        WHERE vi.Quantity <= 5
      `),
      query(`
        SELECT TO_CHAR(DATE_TRUNC('day', Date_Started), 'DD Mon') as day, SUM(Cost) as total_cost
        FROM Maintenance_Logs
        GROUP BY day ORDER BY MIN(Date_Started) ASC
      `),
      query(`
        SELECT tf.*, p.name as patient_name
        FROM Trip_Feedback tf
        JOIN Trip_Logs tl ON tf.trip_id = tl.trip_id
        JOIN Emergency_Requests er ON tl.trip_id = er.request_id
        JOIN Patients p ON er.patient_id = p.patient_id
        ORDER BY tf.submitted_at DESC LIMIT 5
      `)
    ]);

    return NextResponse.json({
      hospitalRank: hospitalRank.rows,
      zoneAnalysis: zoneAnalysis.rows,
      maintenanceStats: maintenanceStats.rows,
      inventoryAlerts: inventoryAlerts.rows,
      costTrend: costTrend.rows,
      recentReviews: recentReviews.rows
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
