import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const results = await Promise.all([
      query(`SELECT COUNT(*) as total, 
             COUNT(*) FILTER (WHERE status = 'Pending') as pending,
             COUNT(*) FILTER (WHERE status = 'Active') as active
             FROM emergency_requests WHERE status IN ('Pending', 'Active')`),
      query(`SELECT current_status, COUNT(*) as count FROM ambulances GROUP BY current_status`),
      query(`SELECT COUNT(*) as count FROM ambulances WHERE current_status = 'Maintenance_Required'`),
      query(`SELECT SUM(general_beds) as total_general, SUM(icu_beds) as total_icu FROM hospitals`),
      query(`SELECT shift_status, COUNT(*) as count FROM drivers GROUP BY shift_status`),
      query(`
        SELECT 
          v.*,
          COALESCE(json_agg(DISTINCT pc.condition_name) FILTER (WHERE pc.condition_name IS NOT NULL), '[]') as conditions,
          (SELECT json_build_object('name', contact_name, 'phone', phone, 'relationship', relationship) 
           FROM patient_emergency_contacts 
           WHERE patient_id = v.patient_id LIMIT 1) as emergency_contact
        FROM active_dashboard_view v
        LEFT JOIN patient_conditions pc ON v.patient_id = pc.patient_id
        GROUP BY v.request_id, v.patient_id, v.patient_name, v.blood_type, v.allergies,
                 v.primary_specialization, v.patient_lon, v.patient_lat, v.severity_level,
                 v.emergency_type, v.requested_for, v.timestamp_created, v.request_status,
                 v.assigned_ambulance, v.destination_hospital, v.hospital_type,
                 v.ambulance_lon, v.ambulance_lat, v.driver_id, v.driver_name
        ORDER BY 
          CASE v.severity_level 
            WHEN 'Critical' THEN 1 
            WHEN 'High' THEN 2 
            WHEN 'Medium' THEN 3 
            WHEN 'Low' THEN 4 
          END
      `),
      query(`SELECT tl.trip_id, tl.time_dispatched, p.name as patient_name, h.name as hospital_name, a.license_plate
             FROM trip_logs tl
             JOIN emergency_requests er ON tl.trip_id = er.request_id::text
             JOIN patients p ON er.patient_id = p.patient_id
             JOIN hospitals h ON tl.hospital_id = h.hospital_id
             JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
             ORDER BY tl.time_dispatched DESC LIMIT 5`),
      query(`SELECT * FROM chat_messages ORDER BY timestamp ASC`),
      query(`SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (tl.time_dispatched - er.timestamp_created)) / 60), 0) as avg_response_time
             FROM trip_logs tl
             JOIN emergency_requests er ON tl.trip_id = er.request_id::text`),
      query(`SELECT COALESCE(p.address, 'Unknown Area') as area
             FROM emergency_requests er
             JOIN patients p ON er.patient_id = p.patient_id
             GROUP BY p.address
             ORDER BY COUNT(*) DESC
             LIMIT 1`),
      query(`SELECT TO_CHAR(DATE_TRUNC('day', timestamp_created), 'DD Mon') as day, COUNT(*) as count 
             FROM emergency_requests 
             WHERE timestamp_created > NOW() - INTERVAL '7 days'
             GROUP BY day ORDER BY MIN(timestamp_created) ASC`),
      query(`
        SELECT COALESCE(p.primary_specialization, 'General Care') as spec, COUNT(*) as count 
        FROM emergency_requests er
        JOIN patients p ON er.patient_id = p.patient_id
        GROUP BY p.primary_specialization 
        ORDER BY count DESC 
        LIMIT 5
      `),
      query(`SELECT * FROM drivers`),
      query(`SELECT *, ST_X(current_location::geometry) as lon, ST_Y(current_location::geometry) as lat FROM ambulances`),
      query(`SELECT * FROM hospitals`),
    ]);

    const [activeRequests, fleetStatus, maintenanceStatus, bedStatus, driverStatus, dashboardView, recentTrips, chatMessages, responseStats, hotspotStats, trendStats, specStats, driversList, ambulancesList, hospitalsList] = results;

    const fleet = {};
    fleetStatus.rows.forEach(r => { fleet[r.current_status] = parseInt(r.count); });

    const drivers = {};
    driverStatus.rows.forEach(r => { drivers[r.shift_status] = parseInt(r.count); });

    // Generate last 7 days to ensure graph always has 7 points
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const found = trendStats.rows.find(r => r.day === dayStr);
      trend.push({
        day: dayStr,
        count: found ? parseInt(found.count) : 0
      });
    }

    return NextResponse.json({
      stats: {
        activeEmergencies: parseInt(activeRequests.rows[0].total),
        pendingRequests: parseInt(activeRequests.rows[0].pending),
        activeDispatches: parseInt(activeRequests.rows[0].active),
        availableAmbulances: fleet['Available'] || 0,
        dispatchedAmbulances: fleet['Dispatched'] || 0,
        totalGeneralBeds: parseInt(bedStatus.rows[0].total_general),
        totalIcuBeds: parseInt(bedStatus.rows[0].total_icu),
        onDutyDrivers: drivers['On_Duty'] || 0,
        maintenanceAlerts: parseInt(maintenanceStatus.rows[0].count),
      },
      activeView: dashboardView.rows,
      recentTrips: recentTrips.rows,
      chatMessages: chatMessages.rows,
      insights: {
        avgResponseTime: parseFloat(responseStats.rows[0]?.avg_response_time || 0).toFixed(1),
        hotspot: hotspotStats.rows[0]?.area || 'N/A'
      },
      trend: trend,
      specializationStats: specStats.rows,
      drivers: driversList.rows,
      ambulances: ambulancesList.rows,
      hospitals: hospitalsList.rows,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
