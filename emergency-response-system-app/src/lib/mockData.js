const now = '2026-05-03T10:00:00.000Z';

export const specializations = [
  { spec_id: 1, spec_name: 'Cardiology', name: 'Cardiology' },
  { spec_id: 2, spec_name: 'Neurology', name: 'Neurology' },
  { spec_id: 3, spec_name: 'Orthopedics', name: 'Orthopedics' },
  { spec_id: 4, spec_name: 'Trauma Surgery', name: 'Trauma Surgery' },
  { spec_id: 5, spec_name: 'Burn Unit', name: 'Burn Unit' },
  { spec_id: 6, spec_name: 'Pediatrics', name: 'Pediatrics' },
];

export const hospitals = [
  { hospital_id: 1, id: 1, name: 'Dhaka Medical College Hospital', lat: 23.7250, lon: 90.3976, lng: 90.3976, general_beds: 500, icu_beds: 20, type: 'Government', specializations: ['Trauma Surgery', 'Burn Unit', 'Cardiology'] },
  { hospital_id: 2, id: 2, name: 'Square Hospital Panthapath', lat: 23.7530, lon: 90.3815, lng: 90.3815, general_beds: 250, icu_beds: 15, type: 'Private', specializations: ['Cardiology', 'Neurology'] },
  { hospital_id: 3, id: 3, name: 'Evercare Hospital Bashundhara', lat: 23.8103, lon: 90.4313, lng: 90.4313, general_beds: 300, icu_beds: 25, type: 'Private', specializations: ['Pediatrics', 'Orthopedics'] },
  { hospital_id: 4, id: 4, name: 'BSMMU', lat: 23.7394, lon: 90.3957, lng: 90.3957, general_beds: 1500, icu_beds: 150, type: 'Government', specializations: ['Cardiology', 'Neurology', 'Pediatrics'] },
  { hospital_id: 5, id: 5, name: 'Kurmitola General Hospital', lat: 23.8236, lon: 90.4131, lng: 90.4131, general_beds: 500, icu_beds: 30, type: 'Government', specializations: ['Trauma Surgery', 'Orthopedics'] },
  { hospital_id: 6, id: 6, name: 'United Hospital Gulshan', lat: 23.8055, lon: 90.4194, lng: 90.4194, general_beds: 500, icu_beds: 80, type: 'Private', specializations: ['Cardiology', 'Pediatrics'] },
];

export const patients = [
  { patient_id: 1, id: 1, name: 'Abdur Rahman', phone: '01711000000', blood_type: 'O+', conditions: ['Type 2 Diabetes', 'Hypertension'] },
  { patient_id: 2, id: 2, name: 'Nusrat Jahan', phone: '01822000000', blood_type: 'A-', conditions: ['Asthma'] },
  { patient_id: 3, id: 3, name: 'Rafiq Islam', phone: '01912000000', blood_type: 'B+', conditions: ['Epilepsy'] },
  { patient_id: 4, id: 4, name: 'Tanjina Akter', phone: '01633000000', blood_type: 'AB+', conditions: ['Pregnancy'] },
];

export const drivers = [
  { driver_id: 1, id: 1, name: 'Rahim Uddin', license_no: 'BD-DL-99384', license: 'BD-DL-99384', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 2, id: 2, name: 'Karim Mia', license_no: 'BD-DL-22839', license: 'BD-DL-22839', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 3, id: 3, name: 'Zahirul Islam', license_no: 'BD-DL-44556', license: 'BD-DL-44556', shift_status: 'Off_Duty', status: 'Off_Duty' },
  { driver_id: 4, id: 4, name: 'Mim Chowdhury', license_no: 'BD-DL-77120', license: 'BD-DL-77120', shift_status: 'Available', status: 'Available' },
];

export const ambulances = [
  { vehicle_id: 1, id: 1, license_plate: 'DHK-METRO-AMB-101', equipment_level: 'Advanced Life Support', current_status: 'Dispatched' },
  { vehicle_id: 2, id: 2, license_plate: 'DHK-METRO-AMB-204', equipment_level: 'Basic Life Support', current_status: 'Available' },
  { vehicle_id: 3, id: 3, license_plate: 'DHK-METRO-AMB-305', equipment_level: 'ICU Support', current_status: 'Available' },
  { vehicle_id: 4, id: 4, license_plate: 'DHK-METRO-AMB-412', equipment_level: 'Basic Life Support', current_status: 'Available' },
  { vehicle_id: 5, id: 5, license_plate: 'DHK-METRO-AMB-500', equipment_level: 'Advanced Life Support', current_status: 'Available' },
];

export const emergencyRequests = [
  { request_id: 1, id: 1, patient_id: 1, patient_lat: 23.7925, patient_lon: 90.4125, lat: 23.7925, lon: 90.4125, lng: 90.4125, severity_level: 'Critical', severity: 'Critical', status: 'En Route', timestamp_created: now },
  { request_id: 2, id: 2, patient_id: 2, patient_lat: 23.7500, patient_lon: 90.3800, lat: 23.7500, lon: 90.3800, lng: 90.3800, severity_level: 'High', severity: 'High', status: 'Pending', timestamp_created: '2026-05-03T10:15:00.000Z' },
  { request_id: 3, id: 3, patient_id: 3, patient_lat: 23.7431, patient_lon: 90.3822, lat: 23.7431, lon: 90.3822, lng: 90.3822, severity_level: 'Medium', severity: 'Medium', status: 'Resolved', timestamp_created: '2026-05-02T17:30:00.000Z' },
  { request_id: 4, id: 4, patient_id: 4, patient_lat: 23.8100, patient_lon: 90.4210, lat: 23.8100, lon: 90.4210, lng: 90.4210, severity_level: 'Critical', severity: 'Critical', status: 'Resolved', timestamp_created: '2026-05-01T08:45:00.000Z' },
];

export const tripLogs = [
  { trip_id: 1001, request_id: 1, vehicle_id: 1, driver_id: 1, hospital_id: 6, time_dispatched: '2026-05-03T10:04:00.000Z', time_completed: null },
  { trip_id: 1002, request_id: 3, vehicle_id: 2, driver_id: 1, hospital_id: 2, time_dispatched: '2026-05-02T17:36:00.000Z', time_completed: '2026-05-02T18:18:00.000Z' },
  { trip_id: 1003, request_id: 4, vehicle_id: 3, driver_id: 2, hospital_id: 3, time_dispatched: '2026-05-01T08:50:00.000Z', time_completed: '2026-05-01T09:28:00.000Z' },
];

export const maintenanceLogs = [
  { log_id: 1, vehicle_id: 4, maintenance_type: 'Brake Inspection', description: 'Brake pressure warning from driver report', cost: 0, date_started: '2026-05-02', date_completed: null, technician_name: 'Hasan Motors' },
  { log_id: 2, vehicle_id: 2, maintenance_type: 'Oxygen System Refill', description: 'Cylinder refill and regulator check', cost: 4200, date_started: '2026-04-21', date_completed: '2026-04-22', technician_name: 'MediServ Dhaka' },
  { log_id: 3, vehicle_id: 1, maintenance_type: 'Tire Replacement', description: 'Rear tires replaced after 20k km', cost: 18500, date_started: '2026-04-10', date_completed: '2026-04-11', technician_name: 'Nitol Service' },
];

export const billing = [
  { bill_id: 1, trip_id: 1002, patient_id: 3, amount: 1450, tax: 72.5, total_amount: 1522.5, payment_status: 'Paid', date_issued: '2026-05-02' },
  { bill_id: 2, trip_id: 1003, patient_id: 4, amount: 1800, tax: 90, total_amount: 1890, payment_status: 'Pending', date_issued: '2026-05-01' },
];

export const vehicleInventory = [
  { vehicle_id: 1, item_name: 'Oxygen Tank', quantity: 1 },
  { vehicle_id: 1, item_name: 'Trauma Kit', quantity: 2 },
  { vehicle_id: 2, item_name: 'First Aid Kit', quantity: 5 },
  { vehicle_id: 3, item_name: 'Defibrillator Pads', quantity: 2 },
];

export const shiftSchedules = [
  { driver_id: 1, shift_date: '2026-05-03', date: '2026-05-03', start_time: '08:00:00', end_time: '16:00:00' },
  { driver_id: 1, shift_date: '2026-05-04', date: '2026-05-04', start_time: '08:00:00', end_time: '16:00:00' },
  { driver_id: 2, shift_date: '2026-05-03', date: '2026-05-03', start_time: '16:00:00', end_time: '23:59:00' },
  { driver_id: 3, shift_date: '2026-05-04', date: '2026-05-04', start_time: '00:00:00', end_time: '08:00:00' },
];

export const dispatchZones = [
  { zone_name: 'Gulshan-Banani', count: 2 },
  { zone_name: 'Dhanmondi-Panthapath', count: 1 },
  { zone_name: 'Bashundhara', count: 1 },
];

export const mockData = {
  ambulances,
  billing,
  dispatchZones,
  drivers,
  emergencyRequests,
  hospitals,
  maintenanceLogs,
  patients,
  shiftSchedules,
  specializations,
  tripLogs,
  vehicleInventory,
  chatMessages: [],
};

export default mockData;
