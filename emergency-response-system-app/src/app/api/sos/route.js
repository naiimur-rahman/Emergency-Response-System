import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// Maps patient-facing condition names → hospital specialization keywords
// This bridges the gap between what patients select in their profile
// and what hospitals list as their specializations in the DB
const CONDITION_TO_SPECIALIZATION = {
  // 🔴 Critical conditions
  'Heart Attack':     'Cardiology',
  'Heart Failure':    'Cardiology',
  'Stroke':           'Neurology',
  'Severe Trauma':    'Trauma Surgery',
  'Major Burn':       'Burn Unit',
  'Cardiac Arrest':   'Cardiology',
  'Brain Hemorrhage': 'Neurology',
  'Spinal Injury':    'Orthopedics',

  // 🟠 Chronic conditions
  'Type 2 Diabetes':  'Nephrology',
  'Type 1 Diabetes':  'Nephrology',
  'Hypertension':     'Cardiology',
  'Asthma':           'Cardiology',
  'Kidney Disease':   'Nephrology',
  'Epilepsy':         'Neurology',
  'COPD':             'Cardiology',
  'Liver Disease':    'Nephrology',
  'Cancer':           'Oncology',
  'Leukemia':         'Oncology',
  'Sickle Cell Disease': 'Nephrology',
  'Thyroid Disorder': null,

  // 🟡 Moderate conditions
  'Pregnancy':        'Obstetrics',
  'Bone Fracture':    'Orthopedics',
  'Appendicitis':     'Trauma Surgery',
  'Pneumonia':        'Cardiology',
  'Dengue Fever':     null,
  'Severe Allergy':   null,
  'Gallstones':       'Trauma Surgery',
  'Hernia':           'Trauma Surgery',

  // 🔵 Minor conditions
  'Food Allergy':     null,
  'Minor Burn':       'Burn Unit',
  'Fever':            null,
  'General Pain':     null,
  'Migraine':         'Neurology',
  'Skin Infection':   null,
  'Acid Reflux':      null,
  'Anemia':           'Nephrology',
};

function mapConditionToSpecialization(conditionName) {
  if (!conditionName) return null;
  // Direct map lookup
  if (CONDITION_TO_SPECIALIZATION[conditionName] !== undefined) {
    return CONDITION_TO_SPECIALIZATION[conditionName];
  }
  // Fuzzy fallback: check if the condition contains a known specialization keyword
  const specKeywords = ['Cardiology', 'Neurology', 'Orthopedics', 'Trauma', 'Burn', 'Obstetrics', 'Pediatrics', 'Nephrology', 'Oncology'];
  for (const kw of specKeywords) {
    if (conditionName.toLowerCase().includes(kw.toLowerCase())) return kw;
  }
  return null;
}

export async function POST(request) {
  try {
    const { lat, lon, name, phone, blood_type, severity = 'Critical', patient_id } = await request.json();

    // Step 1: Resolve patient — use patient_id if logged in, else phone lookup
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

    // Step 2: Get the patient's conditions and resolve the best specialization
    const conditionsResult = await query(
      'SELECT condition_name FROM patient_conditions WHERE patient_id = $1',
      [patientId]
    );
    const patientConditions = conditionsResult.rows.map(r => r.condition_name);

    // Priority: Critical conditions first, then chronic, then general
    const PRIORITY_ORDER = [
      'Heart Failure', 'Stroke', 'Severe Trauma', 'Major Burn',
      'Type 2 Diabetes', 'Hypertension', 'Asthma', 'Kidney Disease', 'Epilepsy',
      'Pregnancy', 'Minor Burn', 'Food Allergy', 'Fever', 'General Pain',
    ];
    
    // Find the highest-priority condition and its specialization
    let primarySpecialization = null;
    let matchedCondition = null;
    for (const pc of PRIORITY_ORDER) {
      if (patientConditions.includes(pc)) {
        const spec = mapConditionToSpecialization(pc);
        if (spec) {
          primarySpecialization = spec;
          matchedCondition = pc;
          break;
        }
      }
    }
    // Fallback: try any condition the patient has
    if (!primarySpecialization) {
      for (const cond of patientConditions) {
        const spec = mapConditionToSpecialization(cond);
        if (spec) {
          primarySpecialization = spec;
          matchedCondition = cond;
          break;
        }
      }
    }

    // Step 3: Create emergency request
    const reqResult = await query(
      `INSERT INTO emergency_requests (patient_id, pickup_coords, severity_level, status)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, 'Pending')
       RETURNING request_id`,
      [patientId, lon, lat, severity]
    );
    const requestId = reqResult.rows[0].request_id;

    // Step 4: Find BEST hospital — specialization-aware + distance-ranked
    let hospitalQuery;
    let hospitalParams;
    
    if (primarySpecialization) {
      // Specialization-aware query: match hospital specialty, rank by match quality then distance
      hospitalQuery = `
        SELECT DISTINCT h.hospital_id, h.name,
          ROUND(ST_Distance(h.location_coords::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) AS distance_m,
          CASE WHEN s.spec_name = $3 THEN 1 ELSE 0 END AS spec_match
        FROM hospitals h
        LEFT JOIN hospital_specializations hs ON h.hospital_id = hs.hospital_id
        LEFT JOIN specializations s ON hs.spec_id = s.spec_id
        WHERE (h.icu_beds > 0 OR h.general_beds > 0)
        ORDER BY spec_match DESC, distance_m ASC
        LIMIT 1
      `;
      hospitalParams = [lon, lat, primarySpecialization];
    } else {
      // No specialization needed — just nearest hospital
      hospitalQuery = `
        SELECT hospital_id, name,
          ROUND(ST_Distance(location_coords::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) AS distance_m
        FROM hospitals
        WHERE icu_beds > 0 OR general_beds > 0
        ORDER BY location_coords <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
        LIMIT 1
      `;
      hospitalParams = [lon, lat];
    }

    const nearestHospital = await query(hospitalQuery, hospitalParams);

    // Step 5: Find nearest available ambulance
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

    // Step 6: Auto-dispatch if resources available
    let dispatched = false;
    let dispatchMessage = 'Waiting for dispatcher...';
    let finalHospital = hospital ? hospital.name : 'Searching...';
    let finalAmbulance = ambulance ? ambulance.license_plate : 'All units busy';
    let finalDistance = distanceKm;
    let matchInfo = matchedCondition
      ? `Matched: ${matchedCondition} → ${primarySpecialization}`
      : 'General dispatch (no specialization needed)';

    if (ambulance && hospital) {
      try {
        const dispatchResult = await query('SELECT fn_automated_dispatch($1, $2) as result', [requestId, 1]);
        dispatchMessage = dispatchResult.rows[0].result;
        dispatched = dispatchMessage.startsWith('DISPATCH SUCCESS');
        
        if (dispatched) {
          // Fetch actual assigned resources from the DB to sync UI
          const actualTrip = await query(`
            SELECT h.name as hospital_name, a.license_plate,
              ST_Distance(h.location_coords::geography, er.pickup_coords::geography) as distance_m
            FROM trip_logs tl
            JOIN hospitals h ON tl.hospital_id = h.hospital_id
            JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
            JOIN emergency_requests er ON tl.trip_id = er.request_id
            WHERE tl.trip_id = $1
          `, [requestId]);
          
          if (actualTrip.rows.length > 0) {
            finalHospital = actualTrip.rows[0].hospital_name;
            finalAmbulance = actualTrip.rows[0].license_plate;
            finalDistance = parseFloat(actualTrip.rows[0].distance_m) / 1000;
          }
        }
      } catch (e) {
        dispatchMessage = 'Auto-dispatch failed: ' + e.message;
      }
    }

    return NextResponse.json({
      success: true,
      request_id: requestId,
      dispatched,
      dispatch_message: dispatchMessage,
      nearest_hospital: finalHospital,
      distance_km: finalDistance.toFixed(2),
      ambulance: finalAmbulance,
      estimated_fare: Math.round(baseFare + (finalDistance * perKmRate) + severityCharge),
      eta_minutes: Math.max(3, Math.round(finalDistance * 3)),
      specialization_match: matchInfo,
    });
  } catch (error) {
    console.error('SOS API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
