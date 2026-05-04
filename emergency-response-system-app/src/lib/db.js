import { Pool } from 'pg';
import { mockData } from './mockData';

let pool;
const forceDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

try {
  if (!forceDemoMode && !global.pgPool && (process.env.PG_CONNECTION_STRING || process.env.PG_HOST)) {
    const ssl = process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
    global.pgPool = process.env.PG_CONNECTION_STRING
      ? new Pool({
          connectionString: process.env.PG_CONNECTION_STRING,
          ssl,
          max: 20,
          idleTimeoutMillis: 60000,
          connectionTimeoutMillis: 5000,
        })
      : new Pool({
          user: process.env.PG_USER || process.env.USER,
          host: process.env.PG_HOST,
          database: process.env.PG_DATABASE,
          password: process.env.PG_PASSWORD || '',
          port: parseInt(process.env.PG_PORT || '5432', 10),
          ssl,
          max: 20,
          idleTimeoutMillis: 60000,
          connectionTimeoutMillis: 5000,
        });
  }
  pool = global.pgPool;
} catch {
  console.warn('Database pool initialization failed, using demo data.');
}

export async function query(text, params = []) {
  if (!pool) {
    return handleMockQuery(text, params);
  }

  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('Database query failed, using demo data:', err.message);
    return handleMockQuery(text, params);
  }
}

export async function transaction(callback) {
  if (!pool) {
    return callback({ query: handleMockQuery });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

function result(rows) {
  return { rows, rowCount: rows.length };
}

function normalizeSql(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function getPatient(patientId) {
  return mockData.patients.find((p) => Number(p.patient_id) === Number(patientId));
}

function getHospital(hospitalId) {
  return mockData.hospitals.find((h) => Number(h.hospital_id) === Number(hospitalId));
}

function getAmbulance(vehicleId) {
  return mockData.ambulances.find((a) => Number(a.vehicle_id) === Number(vehicleId));
}

function getDriver(driverId) {
  return mockData.drivers.find((d) => Number(d.driver_id) === Number(driverId));
}

function getRequest(requestId) {
  return mockData.emergencyRequests.find((r) => Number(r.request_id) === Number(requestId));
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key];
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

/**
 * AI-powered suggestion for severity and specialization based on description
 */
export function suggestSeverity(description = '') {
  const text = description.toLowerCase();
  
  const rules = [
    { keywords: ['heart', 'chest', 'cardiac', 'stroke'], level: 'Critical', spec: 'Cardiology' },
    { keywords: ['brain', 'seizure', 'paralysis', 'head'], level: 'Critical', spec: 'Neurology' },
    { keywords: ['fracture', 'bone', 'accident', 'fall'], level: 'High', spec: 'Orthopedics' },
    { keywords: ['bleed', 'stab', 'gunshot', 'trauma'], level: 'Critical', spec: 'Trauma Surgery' },
    { keywords: ['fire', 'burn', 'acid'], level: 'High', spec: 'Burn Unit' },
    { keywords: ['child', 'baby', 'pediatric'], level: 'Medium', spec: 'Pediatrics' },
    { keywords: ['breath', 'asthma', 'lung'], level: 'High', spec: 'General Care' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(k => text.includes(k))) {
      return { severity: rule.level, specialization: rule.spec };
    }
  }

  return { severity: 'Medium', specialization: 'General Care' };
}

function activeTripRows({ driverId, onlyActive = true } = {}) {
  // Get all active/pending emergency requests
  const activeRequests = mockData.emergencyRequests.filter((req) => 
    !onlyActive || ['Pending', 'Active', 'En Route', 'Picked Up', 'Arrived'].includes(req.status)
  );

  return activeRequests
    .map((request) => {
      // Find trip log if it exists
      const trip = mockData.tripLogs.find((t) => Number(t.request_id) === Number(request.request_id));
      const patient = getPatient(request.patient_id);
      const hospital = trip ? getHospital(trip.hospital_id) : null;
      const ambulance = trip ? getAmbulance(trip.vehicle_id) : null;
      const driver = trip ? getDriver(trip.driver_id) : null;

      return {
        ...trip,
        request_id: request.request_id,
        patient_id: patient?.patient_id,
        patient_lon: request.patient_lon,
        patient_lat: request.patient_lat,
        severity_level: request.severity_level,
        request_status: request.status,
        status: request.status,
        timestamp_created: request.timestamp_created,
        patient_name: patient?.name,
        patient_phone: patient?.phone,
        blood_type: patient?.blood_type,
        hospital_name: hospital?.name,
        hospital_type: hospital?.type,
        hospital_lon: hospital?.lon,
        hospital_lat: hospital?.lat,
        license_plate: ambulance?.license_plate,
        assigned_ambulance: ambulance?.license_plate,
        destination_hospital: hospital?.name,
        driver_name: driver?.name,
      };
    })
    .filter((row) => !driverId || Number(row.driver_id) === Number(driverId))
    .sort((a, b) => new Date(b.timestamp_created) - new Date(a.timestamp_created));
}

function dispatchRequest(requestId) {
  const request = getRequest(requestId);
  if (!request) return 'DISPATCH FAILED: Request not found.';

  // Check if there's already a trip for this request
  const existingTrip = mockData.tripLogs.find((t) => Number(t.request_id) === Number(request.request_id));
  
  let ambulance, driver, hospital;

  if (existingTrip) {
    ambulance = getAmbulance(existingTrip.vehicle_id);
    driver = getDriver(existingTrip.driver_id);
    hospital = getHospital(existingTrip.hospital_id);
  }

  // If no existing resources, find new ones
  if (!ambulance) ambulance = mockData.ambulances.find((a) => a.current_status === 'Available');
  if (!driver) driver = mockData.drivers.find((d) => ['On_Duty', 'Available'].includes(d.shift_status));
  
  if (!hospital) {
    const requiredSpec = request.primary_specialization || suggestSeverity(request.special_notes || '').specialization;
    
    // First try to find a hospital with the required specialization and available beds
    hospital = mockData.hospitals.find((h) => 
      (h.icu_beds > 0 || h.general_beds > 0) && 
      (requiredSpec === 'General Care' || (h.specializations || []).includes(requiredSpec))
    );

    // Fallback to any hospital with beds
    if (!hospital) {
      hospital = mockData.hospitals.find((h) => h.icu_beds > 0 || h.general_beds > 0);
    }
  }

  if (!ambulance) return 'DISPATCH FAILED: No available ambulances found.';
  if (!driver) return 'DISPATCH FAILED: No on-duty drivers found.';
  if (!hospital) return 'DISPATCH FAILED: No hospital with available beds found.';

  request.status = 'Active';
  ambulance.current_status = 'Dispatched';

  if (!existingTrip) {
    mockData.tripLogs.unshift({
      trip_id: Math.max(...mockData.tripLogs.map((t) => t.trip_id), 1000) + 1,
      request_id: request.request_id,
      vehicle_id: ambulance.vehicle_id,
      driver_id: driver.driver_id,
      hospital_id: hospital.hospital_id,
      time_dispatched: new Date().toISOString(),
      time_completed: null,
    });
    
    // Add an initial dispatcher message
    if (!mockData.chatMessages) mockData.chatMessages = [];
    mockData.chatMessages.push({
      trip_id: Math.max(...mockData.tripLogs.map((t) => t.trip_id), 1000),
      sender: 'Dispatcher',
      text: `Unit ${ambulance.license_plate}, proceed to patient location. Severity: ${request.severity_level}.`,
      timestamp: new Date().toISOString()
    });
  }

  return `DISPATCH SUCCESS: ${ambulance.license_plate} assigned to ${hospital.name}${request.primary_specialization ? ` (Specialization: ${request.primary_specialization})` : ''}.`;
}

function handleMockQuery(text, params = []) {
  const sql = normalizeSql(text);

  if (sql.includes('fn_automated_dispatch')) {
    return result([{ result: dispatchRequest(params[0]) }]);
  }

  if (sql.startsWith('insert into patients')) {
    const patient = {
      patient_id: Math.max(...mockData.patients.map((p) => p.patient_id)) + 1,
      id: Math.max(...mockData.patients.map((p) => p.patient_id)) + 1,
      name: params[0],
      phone: params[1],
      blood_type: params[2],
      conditions: [],
    };
    mockData.patients.push(patient);
    return result([patient]);
  }

  if (sql.startsWith('insert into emergency_requests')) {
    const request = {
      request_id: Math.max(...mockData.emergencyRequests.map((r) => r.request_id)) + 1,
      id: Math.max(...mockData.emergencyRequests.map((r) => r.request_id)) + 1,
      patient_id: params[0],
      patient_lon: params[1],
      patient_lat: params[2],
      lon: params[1],
      lat: params[2],
      lng: params[1],
      severity_level: params[3],
      severity: params[3],
      status: 'Pending',
      timestamp_created: new Date().toISOString(),
    };
    mockData.emergencyRequests.push(request);
    return result([request]);
  }

  if (sql.startsWith('insert into hospitals')) {
    const hospital = {
      hospital_id: Math.max(...mockData.hospitals.map((h) => h.hospital_id)) + 1,
      id: Math.max(...mockData.hospitals.map((h) => h.hospital_id)) + 1,
      name: params[0],
      lon: params[1],
      lng: params[1],
      lat: params[2],
      general_beds: params[3],
      icu_beds: params[4],
      type: params[5],
      specializations: [],
    };
    mockData.hospitals.push(hospital);
    return result([hospital]);
  }

  if (sql.startsWith('insert into drivers')) {
    const driver = {
      driver_id: Math.max(...mockData.drivers.map((d) => d.driver_id)) + 1,
      id: Math.max(...mockData.drivers.map((d) => d.driver_id)) + 1,
      name: params[0],
      license_no: params[1],
      license: params[1],
      shift_status: 'Off_Duty',
      status: 'Off_Duty',
    };
    mockData.drivers.push(driver);
    return result([driver]);
  }

  if (sql.startsWith('insert into ambulances')) {
    const ambulance = {
      vehicle_id: Math.max(...mockData.ambulances.map((a) => a.vehicle_id)) + 1,
      id: Math.max(...mockData.ambulances.map((a) => a.vehicle_id)) + 1,
      license_plate: params[0],
      equipment_level: params[1],
      current_status: 'Available',
    };
    mockData.ambulances.push(ambulance);
    return result([ambulance]);
  }

  if (sql.startsWith('insert into maintenance_logs')) {
    const log = {
      log_id: Math.max(...mockData.maintenanceLogs.map((m) => m.log_id)) + 1,
      vehicle_id: params[0],
      maintenance_type: params[1],
      description: params[2],
      cost: params[3],
      date_started: new Date().toISOString().slice(0, 10),
      date_completed: null,
      technician_name: params[4],
    };
    mockData.maintenanceLogs.push(log);
    const ambulance = getAmbulance(params[0]);
    if (ambulance) ambulance.current_status = 'Maintenance_Required';
    return result([log]);
  }

  if (sql.startsWith('update emergency_requests')) {
    const request = getRequest(params[1]);
    if (request) request.status = params[0];
    return result(request ? [request] : []);
  }

  if (sql.startsWith('update ambulances')) {
    const ambulance = getAmbulance(params[1]);
    if (ambulance) ambulance.current_status = params[0] || 'Available';
    return result(ambulance ? [ambulance] : []);
  }

  if (sql.startsWith('update drivers')) {
    const driver = getDriver(params[1]);
    if (driver) {
      driver.shift_status = params[0];
      driver.status = params[0];
    }
    return result(driver ? [driver] : []);
  }

  if (sql.startsWith('update hospitals')) {
    const hospital = getHospital(params[2]);
    if (hospital) {
      hospital.general_beds = params[0];
      hospital.icu_beds = params[1];
    }
    return result(hospital ? [hospital] : []);
  }

  if (sql.startsWith('update maintenance_logs')) {
    const log = mockData.maintenanceLogs.find((m) => Number(m.log_id) === Number(params[1]));
    if (log) {
      log.date_completed = new Date().toISOString().slice(0, 10);
      log.cost = params[0] || log.cost;
      const ambulance = getAmbulance(log.vehicle_id);
      if (ambulance) ambulance.current_status = 'Available';
    }
    return result(log ? [log] : []);
  }

  if (sql.startsWith('delete from drivers')) {
    const index = mockData.drivers.findIndex((d) => Number(d.driver_id) === Number(params[0]));
    return result(index >= 0 ? [mockData.drivers.splice(index, 1)[0]] : []);
  }

  if (sql.startsWith('delete from ambulances')) {
    const index = mockData.ambulances.findIndex((a) => Number(a.vehicle_id) === Number(params[0]));
    return result(index >= 0 ? [mockData.ambulances.splice(index, 1)[0]] : []);
  }

  if (sql.includes('from active_dashboard_view')) {
    return result(activeTripRows().map((row) => {
      const patient = getPatient(row.patient_id);
      const suggestions = suggestSeverity((patient?.conditions || []).join(' ') + ' ' + (row.special_notes || ''));
      return { 
        ...row, 
        conditions: patient?.conditions || [],
        suggested_spec: suggestions.specialization,
        suggested_severity: suggestions.severity
      };
    }));
  }

  if (sql.includes('from trip_logs')) {
    const rows = activeTripRows({ driverId: sql.includes('where tl.driver_id') ? params[0] : null, onlyActive: false });
    if (sql.includes("er.status = 'resolved'")) return result(rows.filter((r) => r.request_status === 'Resolved'));
    if (sql.includes("er.status in ('pending'")) return result(rows.filter((r) => ['Pending', 'Active', 'En Route', 'Picked Up', 'Arrived'].includes(r.request_status)));
    return result(rows);
  }

  if (sql.includes('from billing')) {
    return result(mockData.billing.map((bill) => ({ ...bill, patient_name: getPatient(bill.patient_id)?.name })));
  }

  if (sql.includes('from maintenance_logs')) {
    const rows = mockData.maintenanceLogs.map((log) => ({ ...log, ...getAmbulance(log.vehicle_id) }));
    if (sql.includes('sum(cost)')) return result([{ total: rows.filter((r) => r.date_completed).reduce((sum, r) => sum + Number(r.cost || 0), 0) }]);
    if (sql.includes('date_completed is null')) return result(rows.filter((r) => !r.date_completed));
    if (sql.includes('date_completed is not null')) return result(rows.filter((r) => r.date_completed));
    return result(rows);
  }

  if (sql.includes('from vehicle_inventory')) {
    return result(mockData.vehicleInventory.map((item) => ({
      ...item,
      license_plate: getAmbulance(item.vehicle_id)?.license_plate,
      status: item.quantity <= 2 ? 'LOW' : 'OK',
    })));
  }

  if (sql.includes('from dispatch_zones')) {
    return result(mockData.dispatchZones);
  }

  if (sql.includes('from shift_schedules')) {
    return result(mockData.shiftSchedules.filter((s) => !params[0] || Number(s.driver_id) === Number(params[0])));
  }

  if (sql.includes('from emergency_requests')) {
    if (sql.includes('count(*)')) {
      const active = mockData.emergencyRequests.filter((r) => ['Pending', 'Active'].includes(r.status));
      return result([{ total: active.length, pending: active.filter((r) => r.status === 'Pending').length, active: active.filter((r) => r.status === 'Active').length }]);
    }
    return result(mockData.emergencyRequests.map((request) => ({ ...request, ...getPatient(request.patient_id) })));
  }

  if (sql.includes('from ambulances')) {
    if (sql.includes('count(*)')) {
      if (sql.includes("current_status = 'maintenance_required'")) {
        return result([{ count: mockData.ambulances.filter((a) => a.current_status === 'Maintenance_Required').length }]);
      }
      const grouped = Object.entries(countBy(mockData.ambulances, 'current_status'))
        .map(([current_status, count]) => ({ current_status, count }));
      return result(grouped);
    }
    if (sql.includes("current_status = 'available'")) {
      return result(mockData.ambulances.filter((a) => a.current_status === 'Available'));
    }
    return result(mockData.ambulances);
  }

  if (sql.includes('from drivers')) {
    if (sql.includes('count(*)')) {
      const grouped = Object.entries(countBy(mockData.drivers, 'shift_status'))
        .map(([shift_status, count]) => ({ shift_status, count }));
      return result(grouped);
    }
    return result(mockData.drivers);
  }

  if (sql.includes('from hospitals')) {
    if (sql.includes('sum(general_beds)')) {
      return result([{
        total_general: mockData.hospitals.reduce((sum, h) => sum + Number(h.general_beds), 0),
        total_icu: mockData.hospitals.reduce((sum, h) => sum + Number(h.icu_beds), 0),
      }]);
    }
    if (sql.includes('rank()')) {
      return result([...mockData.hospitals]
        .sort((a, b) => b.icu_beds - a.icu_beds)
        .map((h, index) => ({ name: h.name, icu_beds: h.icu_beds, general_beds: h.general_beds, icu_rank: index + 1 })));
    }
    if (sql.includes('distance_m')) {
      return result([{ ...mockData.hospitals[0], distance_m: 4200 }]);
    }
    return result(mockData.hospitals);
  }

  if (sql.includes('from patients')) {
    if (sql.includes('where phone')) return result(mockData.patients.filter((p) => p.phone === params[0]));
    return result(mockData.patients);
  }

  if (sql.includes('from specializations')) {
    return result(mockData.specializations);
  }

  if (sql.includes('from chat_messages')) {
    const rows = [...(mockData.chatMessages || [])].sort(
      (a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
    );
    return result(rows);
  }

  return result([]);
}

export default pool;
