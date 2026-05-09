import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

const CONDITION_TO_SPECIALIZATION = {
  // 🔴 Critical
  'Heart Attack':     'Cardiology',
  'Heart Failure':    'Cardiology',
  'Stroke':           'Neurology',
  'Severe Trauma':    'Trauma Surgery',
  'Major Burn':       'Burn Unit',
  'Cardiac Arrest':   'Cardiology',
  'Brain Hemorrhage': 'Neurology',
  'Spinal Injury':    'Orthopedics',
  // 🟠 Chronic
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
  // 🟡 Moderate
  'Pregnancy':        'Obstetrics',
  'Bone Fracture':    'Orthopedics',
  'Appendicitis':     'Trauma Surgery',
  'Pneumonia':        'Cardiology',
  'Gallstones':       'Trauma Surgery',
  'Hernia':           'Trauma Surgery',
  // 🔵 Minor
  'Minor Burn':       'Burn Unit',
  'Migraine':         'Neurology',
  'Anemia':           'Nephrology',
};

function mapConditionToSpecialization(conditionName) {
  if (!conditionName) return null;
  if (CONDITION_TO_SPECIALIZATION[conditionName] !== undefined) {
    return CONDITION_TO_SPECIALIZATION[conditionName];
  }
  const specKeywords = ['Cardiology', 'Neurology', 'Orthopedics', 'Trauma', 'Burn', 'Obstetrics', 'Pediatrics', 'Nephrology', 'Oncology'];
  for (const kw of specKeywords) {
    if (conditionName.toLowerCase().includes(kw.toLowerCase())) return kw;
  }
  return null;
}

export async function POST(request) {
  try {
    const { lat, lon, severity = 'Critical', patient_id } = await request.json();

    if (!patient_id) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    // Step 1: Get patient conditions
    const conditionsResult = await query(
      'SELECT condition_name FROM patient_conditions WHERE patient_id = $1',
      [patient_id]
    );
    const patientConditions = conditionsResult.rows.map(r => r.condition_name);

    const PRIORITY_ORDER = [
      'Heart Attack', 'Heart Failure', 'Stroke', 'Severe Trauma', 'Major Burn', 'Cardiac Arrest',
      'Type 2 Diabetes', 'Hypertension', 'Asthma', 'Kidney Disease', 'Epilepsy',
      'Pregnancy', 'Minor Burn', 'Food Allergy', 'Fever', 'General Pain',
    ];
    
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

    // Step 2: Query top 5 hospitals
    let hospitalQuery;
    let hospitalParams;

    if (primarySpecialization) {
      hospitalQuery = `
        SELECT DISTINCT h.hospital_id, h.name,
          ROUND(ST_Distance(h.location_coords::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) AS distance_m,
          CASE WHEN s.spec_name = $3 THEN 1 ELSE 0 END AS spec_match
        FROM hospitals h
        LEFT JOIN hospital_specializations hs ON h.hospital_id = hs.hospital_id
        LEFT JOIN specializations s ON hs.spec_id = s.spec_id
        WHERE (h.icu_beds > 0 OR h.general_beds > 0)
        ORDER BY spec_match DESC, distance_m ASC
        LIMIT 5
      `;
      hospitalParams = [lon, lat, primarySpecialization];
    } else {
      hospitalQuery = `
        SELECT hospital_id, name,
          ROUND(ST_Distance(location_coords::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) AS distance_m,
          0 AS spec_match
        FROM hospitals
        WHERE icu_beds > 0 OR general_beds > 0
        ORDER BY location_coords <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
        LIMIT 5
      `;
      hospitalParams = [lon, lat];
    }

    const hospitals = await query(hospitalQuery, hospitalParams);

    // Calculate ETA and Fare
    const baseFare = 500;
    const perKmRate = 25;
    const severityCharge = severity === 'Critical' ? 500 : severity === 'High' ? 300 : 0;

    const recommendations = hospitals.rows.map(h => {
      const distanceKm = parseFloat(h.distance_m) / 1000;
      return {
        hospital_id: h.hospital_id,
        name: h.name,
        distance_km: distanceKm.toFixed(2),
        eta_minutes: Math.max(3, Math.round(distanceKm * 3)),
        estimated_fare: Math.round(baseFare + (distanceKm * perKmRate) + severityCharge),
        spec_match: h.spec_match === 1,
      };
    });

    return NextResponse.json({
      success: true,
      matched_condition: matchedCondition,
      primary_specialization: primarySpecialization,
      hospitals: recommendations
    });

  } catch (error) {
    console.error('Recommend API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
