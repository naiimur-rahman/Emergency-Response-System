import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

/** Run a query safely — returns empty rows on failure instead of throwing */
async function safeQuery(sql, params = []) {
  try {
    return await query(sql, params);
  } catch (e) {
    console.error('[Analytics] Query failed:', e.message.substring(0, 120));
    return { rows: [], rowCount: 0 };
  }
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      hospitalRank, zoneAnalysis, maintenanceStats, inventoryAlerts,
      costTrend, recentReviews, responseTime, specDist, trendStats
    ] = await Promise.all([
      safeQuery(`
        SELECT Name, ICU_Beds, General_Beds,
        RANK() OVER (ORDER BY ICU_Beds DESC) as icu_rank
        FROM Hospitals
      `),
      safeQuery(`
        SELECT dz.Zone_Name, COUNT(er.Request_ID) as count
        FROM Dispatch_Zones dz
        LEFT JOIN Emergency_Requests er ON ST_Contains(dz.Zone_Boundary, er.Pickup_Coords)
        GROUP BY dz.Zone_ID, dz.Zone_Name
        ORDER BY count DESC
      `),
      safeQuery(`
        SELECT a.License_Plate, ml.Maintenance_Type, ml.Cost, ml.Date_Started,
        SUM(ml.Cost) OVER (PARTITION BY ml.Vehicle_ID ORDER BY ml.Date_Started) as running_total
        FROM Maintenance_Logs ml
        JOIN Ambulances a ON ml.Vehicle_ID = a.Vehicle_ID
        ORDER BY ml.Date_Started DESC
      `),
      safeQuery(`
        SELECT a.License_Plate, vi.Item_Name, vi.Quantity,
        CASE WHEN vi.Quantity <= 2 THEN 'LOW' ELSE 'OK' END as status
        FROM Vehicle_Inventory vi
        JOIN Ambulances a ON vi.Vehicle_ID = a.Vehicle_ID
        WHERE vi.Quantity <= 5
      `),
      safeQuery(`
        SELECT TO_CHAR(DATE_TRUNC('day', Date_Started), 'DD Mon') as day, SUM(Cost) as total_cost
        FROM Maintenance_Logs
        GROUP BY day ORDER BY MIN(Date_Started) ASC
      `),
      safeQuery(`
        SELECT tf.*, p.name as patient_name
        FROM Trip_Feedback tf
        JOIN Trip_Logs tl ON tf.trip_id = tl.trip_id
        JOIN Emergency_Requests er ON tl.trip_id = er.request_id
        JOIN Patients p ON er.patient_id = p.patient_id
        ORDER BY tf.submitted_at DESC LIMIT 5
      `),
      safeQuery(`
        SELECT 
          CASE 
            WHEN (EXTRACT(EPOCH FROM (tl.time_dispatched - er.timestamp_created)) / 60) < 5 THEN '< 5 min'
            WHEN (EXTRACT(EPOCH FROM (tl.time_dispatched - er.timestamp_created)) / 60) < 10 THEN '5-10 min'
            WHEN (EXTRACT(EPOCH FROM (tl.time_dispatched - er.timestamp_created)) / 60) < 15 THEN '10-15 min'
            ELSE '15+ min'
          END as range,
          COUNT(*) as count
        FROM trip_logs tl
        JOIN emergency_requests er ON tl.trip_id = er.request_id
        GROUP BY range
      `),
      safeQuery(`
        SELECT COALESCE(primary_specialization, 'General Care') as spec, COUNT(*) as count
        FROM emergency_requests
        GROUP BY spec ORDER BY count DESC
      `),
      safeQuery(`
        SELECT TO_CHAR(DATE_TRUNC('day', timestamp_created), 'DD Mon') as day, COUNT(*) as count 
        FROM emergency_requests 
        WHERE timestamp_created > NOW() - INTERVAL '7 days'
        GROUP BY day ORDER BY MIN(timestamp_created) ASC
      `)
    ]);

    // Zero-pad trend for consistency — always 7 days
    const requestTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const found = trendStats.rows.find(r => r.day === dayStr);
      requestTrend.push({
        day: dayStr,
        count: found ? parseInt(found.count) : 0
      });
    }

    return NextResponse.json({
      hospitalRank: hospitalRank.rows,
      zoneAnalysis: zoneAnalysis.rows,
      maintenanceStats: maintenanceStats.rows,
      inventoryAlerts: inventoryAlerts.rows,
      costTrend: costTrend.rows,
      recentReviews: recentReviews.rows,
      responseTime: responseTime.rows,
      specDist: specDist.rows,
      requestTrend
    });
  } catch (error) {
    console.error('[Analytics] Unexpected error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
