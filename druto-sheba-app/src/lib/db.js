import { Pool } from 'pg';
import { mockData } from './mockData';

let pool;
const forceDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

try {
  if (!forceDemoMode && !global.pgPool && (process.env.PG_CONNECTION_STRING || process.env.PG_HOST)) {
    console.log('CONNECTING TO DB: ', process.env.PG_CONNECTION_STRING || process.env.PG_DATABASE);
    const ssl = process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
    global.pgPool = process.env.PG_CONNECTION_STRING
      ? new Pool({
          connectionString: process.env.PG_CONNECTION_STRING,
          ssl,
          max: 20,
          idleTimeoutMillis: 60000,
          connectionTimeoutMillis: 10000,
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
          connectionTimeoutMillis: 10000,
        });
  }
  pool = global.pgPool;
} catch {
  console.warn('Database pool initialization failed, using demo data.');
}

export async function query(text, params = []) {
  if (!pool && !forceDemoMode) {
    console.warn('Database not connected and Demo Mode is OFF. Returning empty result.');
    return { rows: [], rowCount: 0 };
  }
  
  if (!pool || forceDemoMode) {
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
    console.error('Database query failed:', err.message);
    throw err; // Throw instead of falling back to fake data
  }
}

export async function transaction(callback) {
  if (!pool && !forceDemoMode) {
    throw new Error('Database not connected and Demo Mode is OFF.');
  }

  if (!pool || forceDemoMode) {
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

function addAudit(tableName, operation, recordId, summary, changedBy = 'demo-user') {
  if (!mockData.auditLogs) mockData.auditLogs = [];
  mockData.auditLogs.unshift({
    audit_id: Math.max(...mockData.auditLogs.map((a) => a.audit_id || 0), 0) + 1,
    table_name: tableName,
    operation,
    record_id: Number(recordId) || 0,
    changed_by: changedBy,
    changed_at: new Date().toISOString(),
    summary,
  });
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key];
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Suggestion for severity and specialization based on description
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
    !onlyActive || ['Pending', 'Broadcast', 'Active', 'En Route', 'Picked Up', 'Arrived', 'Admitted'].includes(req.status)
  );

  return activeRequests
    .map((request) => {
      // Find trip log if it exists
      const trip = mockData.tripLogs.find((t) => Number(t.request_id) === Number(request.request_id));
      const patient = getPatient(request.patient_id);
      const hospital = trip ? getHospital(trip.hospital_id) : null;
      const ambulance = trip ? getAmbulance(trip.vehicle_id) : null;
      const driver = trip ? getDriver(trip.driver_id) : null;

      const bill = trip ? (mockData.billing || []).find((b) => String(b.trip_id) === String(trip.trip_id)) : null;
      const feedback = trip ? (mockData.tripFeedback || []).find((f) => String(f.trip_id) === String(trip.trip_id)) : null;

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
        allergies: patient?.allergies,
        conditions: patient?.conditions || [],
        emergency_type: request.emergency_type || 'General',
        requested_for: request.requested_for || 'Self',
        hospital_name: hospital?.name,
        hospital_type: hospital?.type,
        hospital_lon: hospital?.lon,
        hospital_lat: hospital?.lat,
        license_plate: ambulance?.license_plate,
        assigned_ambulance: ambulance?.license_plate,
        destination_hospital: hospital?.name,
        driver_name: driver?.name,
        total_amount: bill?.total_amount || null,
        has_rating: feedback ? 1 : 0,
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
      message_text: `Unit ${ambulance.license_plate}, proceed to patient location. Severity: ${request.severity_level}.`,
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

  if (sql.startsWith('insert into trip_logs')) {
    const trip = {
      trip_id: params[0],
      request_id: params[0], // Add request_id here since activeTripRows searches by it
      vehicle_id: params[1],
      driver_id: params[2],
      hospital_id: params[3],
      dispatcher_id: params[4],
      time_dispatched: new Date().toISOString(),
    };
    mockData.tripLogs.unshift(trip);
    return result([trip]);
  }

  if (sql.startsWith('insert into patients')) {
    const patient = {
      patient_id: Math.max(...mockData.patients.map((p) => p.patient_id)) + 1,
      id: Math.max(...mockData.patients.map((p) => p.patient_id)) + 1,
      name: params[0],
      phone: params[1],
      blood_type: params[2],
      allergies: params[3] || '',
      conditions: [],
    };
    mockData.patients.push(patient);
    addAudit('Patients', 'INSERT', patient.patient_id, `Patient ${patient.name} registered`);
    return result([patient]);
  }

  if (sql.startsWith('insert into staff_users')) {
    const user = {
      user_id: Math.max(...(mockData.staffUsers || []).map((u) => u.user_id), 0) + 1,
      username: params[0],
      password_hash: params[1],
      role: params[2],
      created_at: new Date().toISOString(),
    };
    if (!mockData.staffUsers) mockData.staffUsers = [];
    mockData.staffUsers.push(user);
    return result([user]);
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
      emergency_type: params[4] || 'General',
      requested_for: params[5] || 'Self',
      status: 'Pending',
      timestamp_created: new Date().toISOString(),
    };
    mockData.emergencyRequests.push(request);
    addAudit('Emergency_Requests', 'INSERT', request.request_id, `Emergency request created for ${request.requested_for}`);
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
      hub: params[2] || 'Central Hub',
      next_service_date: params[3] || null,
    };
    mockData.ambulances.push(ambulance);
    addAudit('Ambulances', 'INSERT', ambulance.vehicle_id, `${ambulance.license_plate} registered`);
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

  if (sql.startsWith('insert into trip_feedback')) {
    const feedback = {
      feedback_id: Math.max(...mockData.tripFeedback.map((f) => f.feedback_id), 0) + 1,
      trip_id: params[0],
      rating: params[1],
      comments: params[2],
      submitted_at: new Date().toISOString(),
    };
    
    // Handle ON CONFLICT (Trip_ID) DO UPDATE
    const existingIndex = mockData.tripFeedback.findIndex(f => String(f.trip_id) === String(params[0]));
    if (existingIndex >= 0) {
      mockData.tripFeedback[existingIndex] = { ...mockData.tripFeedback[existingIndex], rating: params[1], comments: params[2] };
      return result([mockData.tripFeedback[existingIndex]]);
    }
    
    mockData.tripFeedback.push(feedback);
    return result([feedback]);
  }

  if (sql.startsWith('insert into patient_conditions')) {
    const patient = getPatient(params[0]);
    if (patient) {
      if (!patient.conditions) patient.conditions = [];
      if (!patient.conditions.includes(params[1])) patient.conditions.push(params[1]);
    }
    return result(patient ? [{ patient_id: params[0], condition_name: params[1] }] : []);
  }

  if (sql.startsWith('insert into vehicle_inventory')) {
    const item = {
      inventory_id: Math.max(...mockData.vehicleInventory.map((i) => i.inventory_id || 0), 0) + 1,
      vehicle_id: params[0],
      item_name: params[1],
      quantity: Number(params[2] || 0),
      expiry_date: params[3] || null,
      last_restocked: new Date().toISOString(),
    };
    mockData.vehicleInventory.push(item);
    addAudit('Vehicle_Inventory', 'INSERT', item.inventory_id, `${item.item_name} logged for vehicle ${item.vehicle_id}`);
    return result([item]);
  }

  if (sql.startsWith('delete from patient_conditions')) {
    const patient = getPatient(params[0]);
    if (patient) patient.conditions = [];
    return result([]);
  }

  if (sql.startsWith('delete from vehicle_inventory')) {
    const index = mockData.vehicleInventory.findIndex((i) => Number(i.inventory_id) === Number(params[0]));
    return result(index >= 0 ? [mockData.vehicleInventory.splice(index, 1)[0]] : []);
  }

  if (sql.startsWith('update patients')) {
    const patient = getPatient(params[5]);
    if (patient) {
      patient.name = params[0] ?? patient.name;
      patient.phone = params[1] ?? patient.phone;
      patient.blood_type = params[2] ?? patient.blood_type;
      patient.address = params[3] ?? patient.address;
      patient.primary_specialization = params[4] ?? patient.primary_specialization;
      patient.allergies = params[6] ?? patient.allergies;
      addAudit('Patients', 'UPDATE', patient.patient_id, `Medical profile updated for ${patient.name}`);
    }
    return result(patient ? [patient] : []);
  }

  if (sql.startsWith('update emergency_requests')) {
    const request = getRequest(params[1]);
    if (request) {
      const oldStatus = request.status;
      request.status = params[0];
      if (params[2] !== undefined) request.severity_level = params[2] || request.severity_level;
      
      // Simulate resource release in mock mode
      if ((params[0] === 'Resolved' || params[0] === 'Cancelled') && oldStatus !== 'Resolved' && oldStatus !== 'Cancelled') {
        const trip = mockData.tripLogs.find(t => t.request_id === request.request_id || t.trip_id === request.request_id);
        if (trip) {
          const hospital = getHospital(trip.hospital_id);
          if (hospital) {
            if (request.severity_level === 'Critical') hospital.icu_beds++;
            else hospital.general_beds++;
          }
        }
      }
      addAudit('Emergency_Requests', 'UPDATE', request.request_id, `Status changed from ${oldStatus} to ${request.status}`);
    }
    return result(request ? [request] : []);
  }

  if (sql.startsWith('update ambulances')) {
    const ambulance = getAmbulance(params[1]);
    if (ambulance) {
      ambulance.current_status = params[0] || 'Available';
      if (params[2] !== undefined) ambulance.equipment_level = params[2] || ambulance.equipment_level;
      if (params[3] !== undefined) ambulance.hub = params[3] || ambulance.hub;
      if (params[4] !== undefined) ambulance.next_service_date = params[4] || ambulance.next_service_date;
      addAudit('Ambulances', 'UPDATE', ambulance.vehicle_id, `${ambulance.license_plate} updated`);
    }
    return result(ambulance ? [ambulance] : []);
  }

  if (sql.startsWith('update drivers')) {
    const driver = getDriver(params[1]);
    if (driver) {
      driver.shift_status = params[0];
      driver.status = params[0];
      addAudit('Drivers', 'UPDATE', driver.driver_id, `${driver.name} status changed to ${params[0]}`);
    }
    return result(driver ? [driver] : []);
  }

  if (sql.startsWith('update staff_users')) {
    const user = (mockData.staffUsers || []).find((u) => Number(u.user_id) === Number(params[2]));
    if (user) {
      user.role = params[0] || user.role;
      if (params[1] !== undefined) user.blocked = params[1];
      addAudit('Staff_Users', 'UPDATE', user.user_id, `${user.username} role/status updated`);
    }
    return result(user ? [user] : []);
  }

  if (sql.startsWith('update hospitals')) {
    const hospital = getHospital(params[2]);
    if (hospital) {
      hospital.general_beds = params[0];
      hospital.icu_beds = params[1];
    }
    return result(hospital ? [hospital] : []);
  }

  if (sql.startsWith('update trip_logs')) {
    const trip = mockData.tripLogs.find((t) => String(t.trip_id) === String(params[0]) || String(t.request_id) === String(params[0]));
    if (trip) {
      if (sql.includes('time_arrived_scene')) trip.time_arrived_scene = trip.time_arrived_scene || new Date().toISOString();
      if (sql.includes('time_reached_hospital')) trip.time_reached_hospital = trip.time_reached_hospital || new Date().toISOString();
      addAudit('Trip_Logs', 'UPDATE', trip.trip_id, `Trip timestamp updated`);
    }
    return result(trip ? [trip] : []);
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

  if (sql.startsWith('delete from staff_users')) {
    const index = (mockData.staffUsers || []).findIndex((u) => Number(u.user_id) === Number(params[0]));
    return result(index >= 0 ? [mockData.staffUsers.splice(index, 1)[0]] : []);
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
    
    let filteredRows = rows;
    if (sql.includes('er.patient_id = $1')) {
      filteredRows = filteredRows.filter(r => Number(r.patient_id) === Number(params[0]));
    }
    
    if (sql.includes("er.status = 'resolved'")) return result(filteredRows.filter((r) => r.request_status === 'Resolved'));
    if (sql.includes("er.status in ('active'")) return result(filteredRows.filter((r) => ['Pending', 'Active', 'En Route', 'Picked Up', 'Arrived'].includes(r.request_status)));
    return result(filteredRows);
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
    const rows = mockData.vehicleInventory.map((item) => ({
      ...item,
      license_plate: getAmbulance(item.vehicle_id)?.license_plate,
      status: item.quantity <= 2 ? 'LOW' : 'OK',
    }));
    if (sql.includes('where vi.vehicle_id') || sql.includes('where vehicle_id')) {
      return result(rows.filter((item) => Number(item.vehicle_id) === Number(params[0])));
    }
    return result(rows);
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
    
    let filteredRequests = [...mockData.emergencyRequests];
    if (sql.includes("status = 'broadcast'")) {
      filteredRequests = filteredRequests.filter((r) => r.status === 'Broadcast');
    }
    if (sql.includes("cast(request_id as text) = $1") || sql.includes("request_id = $1")) {
      filteredRequests = filteredRequests.filter((r) => String(r.request_id) === String(params[0]));
    }
    
    return result(filteredRequests.map((request) => ({ ...request, ...getPatient(request.patient_id) })));
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
      const lon = Number(params[0]);
      const lat = Number(params[1]);
      
      const rad = Math.PI / 180;
      const calcDist = (lat1, lon1, lat2, lon2) => {
        const a = 0.5 - Math.cos((lat2 - lat1) * rad)/2 + 
                  Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * 
                  (1 - Math.cos((lon2 - lon1) * rad))/2;
        return 12742 * 1000 * Math.asin(Math.sqrt(a)); 
      };

      const specQuery = params[2]; // If 3 params, the 3rd is the specialization
      
      const sorted = [...mockData.hospitals].map((h) => ({ 
        ...h, 
        distance_m: Math.round(calcDist(lat, lon, h.lat, h.lon)),
        spec_match: specQuery ? (h.specializations || []).includes(specQuery) : false,
        specializations: h.specializations || ['Emergency', 'General']
      }));
      
      sorted.sort((a, b) => {
        if (a.spec_match && !b.spec_match) return -1;
        if (!a.spec_match && b.spec_match) return 1;
        return a.distance_m - b.distance_m;
      });

      return result(sorted.slice(0, 5));
    }
    return result(mockData.hospitals);
  }

  if (sql.includes('from patients')) {
    if (sql.includes('where phone')) return result(mockData.patients.filter((p) => p.phone === params[0]));
    if (sql.includes('where p.patient_id')) return result(mockData.patients.filter((p) => Number(p.patient_id) === Number(params[0])));
    return result(mockData.patients);
  }

  if (sql.includes('from staff_users')) {
    if (sql.includes('where username')) {
      const u = (mockData.staffUsers || []).find(u => u.username === params[0]);
      return result(u ? [u] : []);
    }
    return result(mockData.staffUsers || []);
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

  if (sql.includes('from audit_log')) {
    return result([...(mockData.auditLogs || [])].sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at)));
  }

  return result([]);
}

export default pool;
