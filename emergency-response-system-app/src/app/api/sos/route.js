import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { lat, lon, name, phone, blood_type, severity = 'Critical', patient_id, hospital_id } = await request.json();

    if (!hospital_id) {
       return NextResponse.json({ error: 'Hospital ID required for dispatch' }, { status: 400 });
    }

    // Step 1: Resolve patient
    let patientId;
    if (patient_id) {
      patientId = patient_id;
    } else if (phone) {
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
    } else {
      return NextResponse.json({ error: 'No patient identity provided' }, { status: 400 });
    }

    // Step 2: Create emergency request
    const reqResult = await query(
      `INSERT INTO emergency_requests (patient_id, pickup_coords, severity_level, status)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, 'Pending')
       RETURNING request_id`,
      [patientId, lon, lat, severity]
    );
    const requestId = reqResult.rows[0].request_id;

    // Step 3: Get hospital info for response
    const hospitalInfo = await query(`
        SELECT name, ROUND(ST_Distance(location_coords::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) AS distance_m
        FROM hospitals WHERE hospital_id = $3
    `, [lon, lat, hospital_id]);
    const hospital = hospitalInfo.rows[0];
    const distanceKm = hospital ? (parseFloat(hospital.distance_m) / 1000) : 0;

    // Step 4: Dispatch via fn_automated_dispatch
    let dispatched = false;
    let dispatchMessage = 'Waiting for dispatcher...';
    let finalHospital = hospital ? hospital.name : 'Unknown';
    let finalAmbulance = 'Searching...';

    try {
      const dispatchResult = await query('SELECT fn_automated_dispatch($1, $2, $3) as result', [requestId, 1, hospital_id]);
      dispatchMessage = dispatchResult.rows[0].result;
      dispatched = dispatchMessage.startsWith('DISPATCH SUCCESS');
      
      if (dispatched) {
        const actualTrip = await query(`
          SELECT a.license_plate
          FROM trip_logs tl
          JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
          WHERE tl.trip_id = $1
        `, [requestId]);
        
        if (actualTrip.rows.length > 0) {
          finalAmbulance = actualTrip.rows[0].license_plate;
        }
      }
    } catch (e) {
      dispatchMessage = 'Auto-dispatch failed: ' + e.message;
    }

    const baseFare = 500;
    const perKmRate = 25;
    const severityCharge = severity === 'Critical' ? 500 : severity === 'High' ? 300 : 0;

    return NextResponse.json({
      success: true,
      request_id: requestId,
      dispatched,
      dispatch_message: dispatchMessage,
      nearest_hospital: finalHospital,
      distance_km: distanceKm.toFixed(2),
      ambulance: finalAmbulance,
      estimated_fare: Math.round(baseFare + (distanceKm * perKmRate) + severityCharge),
      eta_minutes: Math.max(3, Math.round(distanceKm * 3))
    });
  } catch (error) {
    console.error('SOS API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
