import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { lat, lon, name, phone, blood_type, severity = 'Critical' } = await request.json();

    // Step 1: Find or create patient
    let patientId;
    const existing = await query('SELECT patient_id FROM patients WHERE phone = $1 LIMIT 1', [phone]);
    if (existing.rows.length > 0) {
      patientId = existing.rows[0].patient_id;
    } else {
      const newPatient = await query(
        'INSERT INTO patients (name, phone, blood_type) VALUES ($1, $2, $3) RETURNING patient_id',
        [name, phone, blood_type || null]
      );
      patientId = newPatient.rows[0].patient_id;
    }

    // Step 2: Create emergency request
    const reqResult = await query(
      `INSERT INTO emergency_requests (patient_id, pickup_coords, severity_level, status)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, 'Pending')
       RETURNING request_id`,
      [patientId, lon, lat, severity]
    );
    const requestId = reqResult.rows[0].request_id;

    // Step 3: Find nearest hospital with distance + fare estimate
    const nearestHospital = await query(`
      SELECT hospital_id, name,
        ROUND(ST_Distance(location_coords::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) AS distance_m
      FROM hospitals
      WHERE icu_beds > 0 OR general_beds > 0
      ORDER BY location_coords <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
      LIMIT 1
    `, [lon, lat]);

    // Step 4: Find nearest available ambulance
    const nearestAmbulance = await query(`
      SELECT vehicle_id, license_plate, equipment_level
      FROM ambulances
      WHERE current_status = 'Available'
      LIMIT 1
    `);

    const hospital = nearestHospital.rows[0] || null;
    const ambulance = nearestAmbulance.rows[0] || null;
    const distanceKm = hospital ? (parseFloat(hospital.distance_m) / 1000) : 0;
    
    // Fare: Base ৳500 + ৳25/km + severity surcharge
    const baseFare = 500;
    const perKmRate = 25;
    const severityCharge = severity === 'Critical' ? 500 : severity === 'High' ? 300 : 0;
    const estimatedFare = Math.round(baseFare + (distanceKm * perKmRate) + severityCharge);

    // Step 5: Auto-dispatch if resources available
    let dispatched = false;
    let dispatchMessage = 'Waiting for dispatcher...';
    if (ambulance && hospital) {
      try {
        const dispatchResult = await query('SELECT fn_automated_dispatch($1, $2) as result', [requestId, 1]);
        dispatchMessage = dispatchResult.rows[0].result;
        dispatched = dispatchMessage.startsWith('DISPATCH SUCCESS');
      } catch (e) {
        dispatchMessage = 'Auto-dispatch failed: ' + e.message;
      }
    }

    return NextResponse.json({
      success: true,
      request_id: requestId,
      dispatched,
      dispatch_message: dispatchMessage,
      nearest_hospital: hospital ? hospital.name : 'Searching...',
      distance_km: distanceKm.toFixed(2),
      ambulance: ambulance ? ambulance.license_plate : 'All units busy',
      estimated_fare: estimatedFare,
      eta_minutes: Math.max(3, Math.round(distanceKm * 3)),
    });
  } catch (error) {
    console.error('SOS API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
