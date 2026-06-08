-- DRUTO SHEBA: MEGA SEED DATA GENERATOR (V2)
-- Generates thousands of records for testing
-- ==========================================

-- 1. Patients: Generate 500 patients
INSERT INTO Patients (Name, Phone, Blood_Type)
SELECT 
    'Patient ' || i,
    '01' || (100000000 + floor(random() * 900000000))::text,
    (ARRAY['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])[floor(random() * 8) + 1]
FROM generate_series(1, 500) s(i)
ON CONFLICT DO NOTHING;

-- 2. Patient Conditions: 2-3 random conditions for each patient
INSERT INTO Patient_Conditions (Patient_ID, Condition_Name)
SELECT 
    p.Patient_ID,
    c.name
FROM Patients p
CROSS JOIN LATERAL (
    SELECT name FROM (
        VALUES ('Diabetes'), ('Hypertension'), ('Asthma'), ('Epilepsy'), ('Heart Disease'), ('Kidney Disease')
    ) AS conds(name)
    WHERE random() > 0.7
) c
ON CONFLICT DO NOTHING;

-- 3. Emergency Requests: Generate 2000 requests over the last 60 days
INSERT INTO Emergency_Requests (Patient_ID, Pickup_Coords, Severity_Level, Status, Timestamp_Created)
SELECT 
    (SELECT Patient_ID FROM Patients ORDER BY random() LIMIT 1),
    ST_SetSRID(ST_MakePoint(90.35 + random() * 0.1, 23.70 + random() * 0.15), 4326),
    ((ARRAY['Low', 'Medium', 'High', 'Critical'])[floor(random() * 4) + 1])::severity_lvl,
    'Resolved'::req_status,
    NOW() - (random() * INTERVAL '60 days')
FROM generate_series(1, 2000) s(i)
ON CONFLICT DO NOTHING;

-- 4. Trip Logs: Create logs for most resolved requests
INSERT INTO Trip_Logs (Trip_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID, Time_Dispatched, Time_Arrived_Scene, Time_Reached_Hospital)
SELECT 
    er.Request_ID,
    (SELECT Vehicle_ID FROM Ambulances ORDER BY random() LIMIT 1),
    (SELECT Driver_ID FROM Drivers ORDER BY random() LIMIT 1),
    (SELECT Hospital_ID FROM Hospitals ORDER BY random() LIMIT 1),
    1,
    er.Timestamp_Created + INTERVAL '1 minute',
    er.Timestamp_Created + INTERVAL '10 minutes',
    er.Timestamp_Created + INTERVAL '30 minutes'
FROM Emergency_Requests er
WHERE er.Status = 'Resolved'
ON CONFLICT DO NOTHING;

-- 5. Trip Feedback: Generate feedback for trips
INSERT INTO Trip_Feedback (Trip_ID, Rating, Comments, Submitted_At)
SELECT 
    tl.Trip_ID,
    floor(random() * 3) + 3, -- 3 to 5 stars
    (ARRAY['Great service!', 'Very fast response.', 'Ambulance was clean.', 'Driver was professional.', 'Highly recommended.', 'Life saver!'])[floor(random() * 6) + 1],
    tl.Time_Reached_Hospital + INTERVAL '1 hour'
FROM Trip_Logs tl
WHERE random() > 0.3
ON CONFLICT DO NOTHING;

-- 6. Maintenance Logs: Generate 300 logs
INSERT INTO Maintenance_Logs (Vehicle_ID, Maintenance_Type, Description, Cost, Date_Started, Date_Completed)
SELECT 
    (SELECT Vehicle_ID FROM Ambulances ORDER BY random() LIMIT 1),
    (ARRAY['Oil Change', 'Tire Rotation', 'Brake Repair', 'Engine Tune-up', 'AC Service', 'Oxygen Refill'])[floor(random() * 6) + 1],
    'Routine maintenance checkup.',
    floor(random() * 5000) + 500,
    (NOW() - (random() * INTERVAL '180 days'))::date,
    (NOW() - (random() * INTERVAL '170 days'))::date
FROM generate_series(1, 300) s(i)
ON CONFLICT DO NOTHING;

-- 7. Vehicle Inventory: Ensure all vehicles have items
INSERT INTO Vehicle_Inventory (Vehicle_ID, Item_Name, Quantity, Expiry_Date)
SELECT 
    v.Vehicle_ID,
    i.item,
    floor(random() * 20) + 1,
    (NOW() + (random() * INTERVAL '365 days'))::date
FROM Ambulances v
CROSS JOIN (
    VALUES ('Oxygen Tank'), ('First Aid Kit'), ('Defibrillator'), ('Stretcher'), ('Bandages'), ('IV Fluid')
) AS i(item)
ON CONFLICT DO NOTHING;

-- 8. Billing: Generate bills for trips
INSERT INTO Billing (Trip_ID, Patient_ID, Amount, Tax, Payment_Status, Date_Issued)
SELECT 
    tl.Trip_ID,
    er.Patient_ID,
    floor(random() * 2000) + 1000,
    floor(random() * 300) + 100,
    (ARRAY['Paid', 'Unpaid'])[floor(random() * 2) + 1],
    tl.Time_Reached_Hospital::date
FROM Trip_Logs tl
JOIN Emergency_Requests er ON tl.Trip_ID = er.Request_ID
ON CONFLICT DO NOTHING;

-- 9. More Drivers & Ambulances if needed
INSERT INTO Ambulances (License_Plate, Equipment_Level, Current_Status)
SELECT 
    'DHK-MEGA-' || i,
    ((ARRAY['Basic', 'Advanced'])[floor(random() * 2) + 1])::equipment_lvl,
    'Available'::vehicle_status
FROM generate_series(1, 50) s(i)
ON CONFLICT DO NOTHING;

INSERT INTO Drivers (Name, License_No, Shift_Status)
SELECT 
    'Driver ' || i,
    'BD-MEGA-' || (10000 + i),
    'Off_Duty'::shift_status
FROM generate_series(1, 50) s(i)
ON CONFLICT DO NOTHING;

-- 10. Driver Certifications: 1-2 for each driver
INSERT INTO Driver_Certifications (Driver_ID, Certification_Name, Issuing_Authority, Date_Issued, Expiry_Date)
SELECT 
    d.Driver_ID,
    c.cert,
    'Health Ministry',
    '2023-01-01',
    '2026-01-01'
FROM Drivers d
CROSS JOIN LATERAL (
    SELECT cert FROM (
        VALUES ('Advanced Cardiac Life Support'), ('Pediatric Emergency'), ('Trauma Care'), ('Defensive Driving')
    ) AS certs(cert)
    WHERE random() > 0.5
) c
ON CONFLICT DO NOTHING;

-- 11. Shift Schedules: Last 7 days for all drivers
INSERT INTO Shift_Schedules (Driver_ID, Shift_Date, Start_Time, End_Time, Zone_Assigned)
SELECT 
    d.Driver_ID,
    (CURRENT_DATE - i),
    '08:00',
    '20:00',
    (SELECT Zone_ID FROM Dispatch_Zones ORDER BY random() LIMIT 1)
FROM Drivers d
CROSS JOIN generate_series(0, 6) s(i)
ON CONFLICT DO NOTHING;

REFRESH MATERIALIZED VIEW emergency_analytics_mv;
