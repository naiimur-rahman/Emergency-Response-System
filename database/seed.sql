-- ==========================================
-- DRUTO SHEBA: SEED DATA
-- Comprehensive dataset for Dhaka, Bangladesh
-- ==========================================

-- Make seed data deterministic when rerun during setup.
TRUNCATE TABLE
    Trip_Feedback,
    Billing,
    Vehicle_Inventory,
    Driver_Certifications,
    Maintenance_Logs,
    Shift_Schedules,
    Patient_Emergency_Contacts,
    Hospital_Specializations,
    Specializations,
    Emergency_Types,
    Dispatch_Zones,
    Trip_Logs,
    Emergency_Requests,
    Patient_Conditions,
    Patients,
    Dispatchers,
    Drivers,
    Ambulances,
    Hospitals,
    Audit_Log
RESTART IDENTITY CASCADE;

-- 1. Core Hospitals (Govt)
INSERT INTO Hospitals (Name, Location_Coords, General_Beds, ICU_Beds, Type) VALUES 
('Dhaka Medical College', ST_SetSRID(ST_MakePoint(90.3973998, 23.72564), 4326), 500, 50, 'Government'),
('Dhaka Shishu (Children) Hospital', ST_SetSRID(ST_MakePoint(90.3693358, 23.7729305), 4326), 400, 30, 'Government'),
('Infectious Diseases Hospital (IDH)', ST_SetSRID(ST_MakePoint(90.4058473, 23.7761064), 4326), 200, 10, 'Government'),
('Kurmitola General Hospital', ST_SetSRID(ST_MakePoint(90.4093822, 23.8191987), 4326), 500, 30, 'Government'),
('Mugda Medical College and Hospital', ST_SetSRID(ST_MakePoint(90.4301631, 23.731981), 4326), 500, 50, 'Government'),
('Kuwait Bangladesh Friendship Hospital', ST_SetSRID(ST_MakePoint(90.4036312, 23.8706354), 4326), 200, 30, 'Government'),
('National Institute of Cancer', ST_SetSRID(ST_MakePoint(90.4094593, 23.7782321), 4326), 300, 20, 'Government'),
('National Institute of Kidney Diseases (NIKDU)', ST_SetSRID(ST_MakePoint(90.368676, 23.7716087), 4326), 300, 40, 'Government'),
('National Institute of Neurosciences (NINS)', ST_SetSRID(ST_MakePoint(90.3707896, 23.7761345), 4326), 450, 100, 'Government'),
('National Institute of Ophthalmology', ST_SetSRID(ST_MakePoint(90.3696606, 23.7742998), 4326), 250, 15, 'Government'),
('NICVD (Heart Institute)', ST_SetSRID(ST_MakePoint(90.3696999, 23.7704768), 4326), 450, 60, 'Government'),
('NITOR (Orthopaedic Hospital)', ST_SetSRID(ST_MakePoint(90.3703256, 23.7736036), 4326), 1000, 60, 'Government'),
('Shaheed Suhrawardy Hospital', ST_SetSRID(ST_MakePoint(90.371375, 23.7692378), 4326), 800, 40, 'Government'),
('Sir Salimullah Medical College (Mitford)', ST_SetSRID(ST_MakePoint(90.4012507, 23.7111967), 4326), 900, 50, 'Government'),
('BSMMU (PG Hospital)', ST_SetSRID(ST_MakePoint(90.39329, 23.738572), 4326), 1500, 150, 'Government'),
('BIRDEM General Hospital', ST_SetSRID(ST_MakePoint(90.3938372, 23.7389228), 4326), 700, 80, 'Government')
ON CONFLICT DO NOTHING;

-- 2. Hospitals (Private)
INSERT INTO hospitals (name, location_coords, general_beds, icu_beds, type) VALUES
('AMZ Hospital Badda', ST_SetSRID(ST_MakePoint(90.4260183, 23.7842676), 4326), 150, 20, 'Private'),
('Anwar Khan Modern Hospital', ST_SetSRID(ST_MakePoint(90.3822133, 23.7451679), 4326), 400, 50, 'Private'),
('Bangladesh Specialized Hospital', ST_SetSRID(ST_MakePoint(90.3630434, 23.7763525), 4326), 350, 60, 'Private'),
('BRB Hospital Panthapath', ST_SetSRID(ST_MakePoint(90.3855489, 23.7522514), 4326), 400, 45, 'Private'),
('Central Hospital Ltd', ST_SetSRID(ST_MakePoint(90.3841359, 23.7433793), 4326), 200, 30, 'Private'),
('Comfort Hospital', ST_SetSRID(ST_MakePoint(90.3862398, 23.7491851), 4326), 100, 15, 'Private'),
('Evercare Hospital Bashundhara', ST_SetSRID(ST_MakePoint(90.4313219, 23.8102668), 4326), 300, 25, 'Private'),
('Green Life Hospital', ST_SetSRID(ST_MakePoint(90.3857066, 23.7466132), 4326), 300, 45, 'Private'),
('Ibne Sina Kalyanpur', ST_SetSRID(ST_MakePoint(90.3618028, 23.7783273), 4326), 250, 30, 'Private'),
('Impulse Hospital', ST_SetSRID(ST_MakePoint(90.3990674, 23.7678558), 4326), 250, 35, 'Private'),
('Japan East West Medical College', ST_SetSRID(ST_MakePoint(90.3769537, 23.8941445), 4326), 300, 40, 'Private'),
('LabAid Dhanmondi', ST_SetSRID(ST_MakePoint(90.3836682, 23.7417264), 4326), 300, 50, 'Private'),
('Popular Diagnostic Centre', ST_SetSRID(ST_MakePoint(90.4123524, 23.7411436), 4326), 100, 10, 'Private'),
('Square Hospital Panthapath', ST_SetSRID(ST_MakePoint(90.3815598, 23.7528438), 4326), 250, 15, 'Private'),
('United Hospital Gulshan', ST_SetSRID(ST_MakePoint(90.4154048, 23.8050557), 4326), 500, 80, 'Private'),
('Universal Medical College Hospital', ST_SetSRID(ST_MakePoint(90.3956724, 23.7761687), 4326), 200, 25, 'Private'),
('Asgar Ali Hospital', ST_SetSRID(ST_MakePoint(90.4230341, 23.7075876), 4326), 250, 40, 'Private')
ON CONFLICT DO NOTHING;

-- 4. Dispatch Zones (Dhaka areas)
INSERT INTO Dispatch_Zones (Zone_Name, Zone_Boundary, Priority_Level) VALUES
('Gulshan-Banani', ST_SetSRID(ST_GeomFromText('POLYGON((90.40 23.78, 90.43 23.78, 90.43 23.81, 90.40 23.81, 90.40 23.78))'), 4326), 1),
('Dhanmondi-Mirpur', ST_SetSRID(ST_GeomFromText('POLYGON((90.36 23.74, 90.40 23.74, 90.40 23.78, 90.36 23.78, 90.36 23.74))'), 4326), 2),
('Uttara', ST_SetSRID(ST_GeomFromText('POLYGON((90.38 23.85, 90.42 23.85, 90.42 23.89, 90.38 23.89, 90.38 23.85))'), 4326), 3),
('Old Dhaka', ST_SetSRID(ST_GeomFromText('POLYGON((90.38 23.70, 90.42 23.70, 90.42 23.74, 90.38 23.74, 90.38 23.70))'), 4326), 1)
ON CONFLICT DO NOTHING;

-- 5. Emergency Types
INSERT INTO Emergency_Types (Type_Name, Description, Default_Severity, Requires_Advanced_Equipment) VALUES
('Cardiac Arrest', 'Heart attack or cardiac emergency', 'Critical', TRUE),
('Road Traffic Accident', 'Vehicle collision injuries', 'High', TRUE),
('Burns', 'Fire or chemical burn injuries', 'High', TRUE),
('Fracture', 'Bone fracture requiring immobilization', 'Medium', FALSE),
('Respiratory Distress', 'Severe breathing difficulty', 'Critical', TRUE),
('Pregnancy Complication', 'Obstetric emergency', 'High', TRUE),
('Stroke', 'Cerebrovascular emergency', 'Critical', TRUE),
('Minor Injury', 'Cuts, bruises, minor trauma', 'Low', FALSE)
ON CONFLICT DO NOTHING;

-- 6. Ambulances
INSERT INTO Ambulances (License_Plate, Equipment_Level, Current_Status) VALUES 
('DHAKA METRO-KHA 43-1718', 'Advanced', 'Available'),
('DHAKA METRO-KHA 46-7940', 'Advanced', 'Available'),
('DHAKA METRO-CHHA 94-9616', 'Basic', 'Available'),
('DHAKA METRO-CHA 87-5128', 'Advanced', 'Available'),
('DHAKA METRO-KHA 57-6251', 'Basic', 'Available'),
('DHAKA METRO-GA 76-7474', 'Advanced', 'Available'),
('DHAKA METRO-GHA 96-8859', 'Advanced', 'Available'),
('DHAKA METRO-KA 15-8128', 'Basic', 'Available'),
('DHAKA METRO-GA 80-2558', 'Advanced', 'Available'),
('DHAKA METRO-KHA 80-1749', 'Basic', 'Available'),
('DHAKA METRO-KA 70-7595', 'Advanced', 'Available'),
('DHAKA METRO-KHA 44-4620', 'Advanced', 'Available'),
('DHAKA METRO-GHA 64-6741', 'Basic', 'Available'),
('DHAKA METRO-CHHA 69-4179', 'Advanced', 'Available'),
('DHAKA METRO-GA 67-6602', 'Basic', 'Available'),
('DHAKA METRO-GA 68-7190', 'Advanced', 'Available'),
('DHAKA METRO-GHA 55-2448', 'Advanced', 'Available'),
('DHAKA METRO-CHHA 39-6672', 'Advanced', 'Available'),
('DHAKA METRO-KHA 76-5096', 'Basic', 'Available'),
('DHAKA METRO-GA 78-2360', 'Advanced', 'Available'),
('DHAKA METRO-GHA 77-7145', 'Advanced', 'Available')
ON CONFLICT DO NOTHING;

-- 7. Drivers
INSERT INTO Drivers (Name, License_No, Shift_Status) VALUES 
('Rahim Uddin', 'BD-DL-99384', 'On_Duty'),
('Karim Mia', 'BD-DL-22839', 'On_Duty'),
('Zahirul Islam', 'BD-DL-44556', 'Off_Duty'),
('Milon Chowdhury', 'BD-DL-77120', 'On_Duty'),
('Sabbir Ahmed', 'BD-DL-55221', 'On_Duty'),
('Farhan Kabir', 'BD-DL-66332', 'On_Duty'),
('Naimul Islam', 'BD-DL-88443', 'Off_Duty'),
('Tanvir Hasan', 'BD-DL-11990', 'On_Duty'),
('Lutfur Rahman', 'BD-DL-44229', 'On_Duty'),
('Jasim Uddin', 'BD-DL-11223', 'On_Duty'),
('Sumon Ahmed', 'BD-DL-33445', 'On_Duty'),
('Rokeya Begum', 'BD-DL-55667', 'On_Duty'),
('Abid Hasan', 'BD-DL-77889', 'On_Duty'),
('Momena Akter', 'BD-DL-99001', 'On_Duty'),
('Sharif Khan', 'BD-DL-11220', 'On_Duty'),
('Shohel Rana', 'BD-DL-22334', 'On_Duty'),
('Anika Tabassum', 'BD-DL-44557', 'On_Duty'),
('Mustafizur Rahman', 'BD-DL-66778', 'On_Duty'),
('Salma Khatun', 'BD-DL-88990', 'On_Duty'),
('Imran Hossain', 'BD-DL-00112', 'On_Duty')
ON CONFLICT DO NOTHING;

-- 8. Dispatchers
INSERT INTO Dispatchers (Name, Shift_Time) VALUES 
('Admin Dispatcher 1', 'Day Shift (8AM - 8PM)')
ON CONFLICT DO NOTHING;

-- 9. Specializations
INSERT INTO Specializations (Spec_Name, Description) VALUES
('Cardiology', 'Heart and cardiovascular system'),
('Neurology', 'Brain and nervous system'),
('Orthopedics', 'Bones, joints, and muscles'),
('Trauma Surgery', 'Emergency surgical intervention'),
('Burn Unit', 'Specialized burn treatment'),
('Obstetrics', 'Pregnancy and childbirth'),
('Pediatrics', 'Child healthcare'),
('Nephrology', 'Kidney and renal system'),
('Oncology', 'Cancer and tumor treatment')
ON CONFLICT DO NOTHING;

-- 10. Hospital-Specialization links (Dynamic ID Mapping)
INSERT INTO Hospital_Specializations (Hospital_ID, Spec_ID, Specialist_Count) VALUES
-- Core Large Hospitals
((SELECT Hospital_ID FROM Hospitals WHERE Name = 'Dhaka Medical College'), (SELECT Spec_ID FROM Specializations WHERE Spec_Name = 'Cardiology'), 15),
((SELECT Hospital_ID FROM Hospitals WHERE Name = 'Dhaka Medical College'), (SELECT Spec_ID FROM Specializations WHERE Spec_Name = 'Neurology'), 10),
((SELECT Hospital_ID FROM Hospitals WHERE Name = 'Dhaka Medical College'), (SELECT Spec_ID FROM Specializations WHERE Spec_Name = 'Orthopedics'), 12),
((SELECT Hospital_ID FROM Hospitals WHERE Name = 'Dhaka Medical College'), (SELECT Spec_ID FROM Specializations WHERE Spec_Name = 'Trauma Surgery'), 20),

((SELECT Hospital_ID FROM Hospitals WHERE Name = 'Square Hospital Panthapath'), (SELECT Spec_ID FROM Specializations WHERE Spec_Name = 'Cardiology'), 12),
((SELECT Hospital_ID FROM Hospitals WHERE Name = 'Square Hospital Panthapath'), (SELECT Spec_ID FROM Specializations WHERE Spec_Name = 'Neurology'), 8),

((SELECT Hospital_ID FROM Hospitals WHERE Name = 'Ibne Sina Kalyanpur'), (SELECT Spec_ID FROM Specializations WHERE Spec_Name = 'Neurology'), 12),
((SELECT Hospital_ID FROM Hospitals WHERE Name = 'Ibne Sina Kalyanpur'), (SELECT Spec_ID FROM Specializations WHERE Spec_Name = 'Trauma Surgery'), 10),

((SELECT Hospital_ID FROM Hospitals WHERE Name = 'NICVD (Heart Institute)'), (SELECT Spec_ID FROM Specializations WHERE Spec_Name = 'Cardiology'), 50),
((SELECT Hospital_ID FROM Hospitals WHERE Name = 'National Institute of Neurosciences (NINS)'), (SELECT Spec_ID FROM Specializations WHERE Spec_Name = 'Neurology'), 40),
((SELECT Hospital_ID FROM Hospitals WHERE Name = 'NITOR (Orthopaedic Hospital)'), (SELECT Spec_ID FROM Specializations WHERE Spec_Name = 'Orthopedics'), 45)
ON CONFLICT DO NOTHING;

-- 11. Patients
INSERT INTO Patients (Name, Phone, Blood_Type) VALUES 
('Abdur Rahman', '01711000000', 'O+'),
('Nusrat Jahan', '01822000000', 'A-'),
('Rafiq Islam', '01912000000', 'B+'),
('Shabnam Akter', '01612000000', 'AB-'),
('Tanvir Ahmed', '01512000000', 'O-')
ON CONFLICT DO NOTHING;

-- 12. Patient Conditions
INSERT INTO Patient_Conditions (Patient_ID, Condition_Name) VALUES 
(1, 'Type 2 Diabetes'),
(1, 'Hypertension'),
(2, 'Asthma'),
(3, 'Epilepsy'),
(4, 'Pregnancy - 3rd Trimester')
ON CONFLICT DO NOTHING;

-- 13. Patient Emergency Contacts
INSERT INTO Patient_Emergency_Contacts (Patient_ID, Contact_Name, Relationship, Phone) VALUES
(1, 'Fatima Rahman', 'Wife', '01711000001'),
(1, 'Saiful Rahman', 'Son', '01711000002'),
(2, 'Kamal Hossain', 'Father', '01822000001'),
(3, 'Rashida Islam', 'Mother', '01912000001'),
(4, 'Jahangir Akter', 'Husband', '01612000001')
ON CONFLICT DO NOTHING;

-- 14. Vehicle Inventory
INSERT INTO Vehicle_Inventory (Vehicle_ID, Item_Name, Quantity, Expiry_Date) VALUES
(1, 'Oxygen Cylinder', 3, '2027-06-15'),
(1, 'Defibrillator Pads', 5, '2026-12-01'),
(1, 'IV Saline Bags', 10, '2027-03-20'),
(2, 'Oxygen Cylinder', 2, '2027-06-15'),
(3, 'Defibrillator Pads', 6, '2027-01-15')
ON CONFLICT DO NOTHING;

-- 15. Driver Certifications
INSERT INTO Driver_Certifications (Driver_ID, Certification_Name, Issuing_Authority, Date_Issued, Expiry_Date) VALUES
(1, 'Advanced Life Support (ALS)', 'Bangladesh Red Crescent', '2024-01-15', '2027-01-15'),
(1, 'Defensive Driving', 'BRTA', '2023-06-01', '2026-06-01'),
(2, 'Basic Life Support (BLS)', 'Bangladesh Red Crescent', '2024-05-20', '2027-05-20')
ON CONFLICT DO NOTHING;

-- 16. Shift Schedules
INSERT INTO Shift_Schedules (Driver_ID, Shift_Date, Start_Time, End_Time) VALUES
(1, CURRENT_DATE, '08:00', '20:00'),
(2, CURRENT_DATE, '08:00', '20:00')
ON CONFLICT DO NOTHING;

-- 17. Live Emergency Request
INSERT INTO Emergency_Requests (Patient_ID, Pickup_Coords, Severity_Level, Status) VALUES 
(1, ST_SetSRID(ST_MakePoint(90.4125, 23.7925), 4326), 'Critical', 'Active')
ON CONFLICT DO NOTHING;

-- 18. Active Trip for Tracking Demo
INSERT INTO Trip_Logs (Trip_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
VALUES (
    (SELECT Request_ID FROM Emergency_Requests WHERE Status = 'Active' LIMIT 1),
    1, 1, 6, 1
) ON CONFLICT DO NOTHING;

-- 19. Initial Chat for Tracking Demo
INSERT INTO chat_messages (trip_id, sender, message_text)
VALUES (
    (SELECT Trip_ID FROM Trip_Logs LIMIT 1),
    'System',
    'Emergency unit is en route. Please stay calm.'
) ON CONFLICT DO NOTHING;

REFRESH MATERIALIZED VIEW emergency_analytics_mv;
-- ==========================================
-- DRUTO SHEBA: ADVANCED QUERY SHOWCASE
-- For UIU CSE DBMS Project Show
-- ==========================================

-- ============================================================
-- Q1: Specialization-Aware Dispatch Simulation
-- ============================================================
-- Uses: Advanced Joins, ILIKE matching, PostGIS Distance, Ranking
-- Scenario: Find the BEST hospital for a specific patient condition
WITH Target_Patient AS (
    SELECT p.Name, pc.Condition_Name, er.Pickup_Coords
    FROM Patients p
    JOIN Patient_Conditions pc ON p.Patient_ID = pc.Patient_ID
    JOIN Emergency_Requests er ON p.Patient_ID = er.Patient_ID
    WHERE er.Request_ID = (SELECT Request_ID FROM Emergency_Requests LIMIT 1) -- Dynamic ID lookup
)
SELECT 
    h.Name AS Hospital_Name,
    h.ICU_Beds,
    s.Spec_Name AS Matched_Specialty,
    ROUND(ST_Distance(h.Location_Coords::geography, tp.Pickup_Coords::geography)::numeric / 1000, 2) AS Distance_KM,
    CASE 
        WHEN s.Spec_Name ILIKE '%' || tp.Condition_Name || '%' THEN '🏆 EXACT SPECIALTY MATCH'
        ELSE 'Generic Emergency'
    END AS Match_Quality
FROM Hospitals h
LEFT JOIN Hospital_Specializations hs ON h.Hospital_ID = hs.Hospital_ID
LEFT JOIN Specializations s ON hs.Spec_ID = s.Spec_ID
CROSS JOIN Target_Patient tp
WHERE h.ICU_Beds > 0
ORDER BY (s.Spec_Name ILIKE '%' || tp.Condition_Name || '%') DESC, Distance_KM ASC
LIMIT 5;


-- ============================================================
-- Q2: Predictive Maintenance Alerts
-- ============================================================
-- Uses: Window Functions, CASE logic, Fleet Analytics
-- Scenario: Identify vehicles that are at risk of breakdown
SELECT 
    License_Plate,
    Equipment_Level,
    Trips_Since_Maintenance,
    CASE 
        WHEN Trips_Since_Maintenance >= 50 THEN '🔴 CRITICAL: IMMEDIATE SERVICE REQUIRED'
        WHEN Trips_Since_Maintenance >= 40 THEN '🟡 WARNING: SERVICE SOON'
        ELSE '🟢 HEALTHY'
    END AS Fleet_Status,
    ROUND(AVG(Trips_Since_Maintenance) OVER (), 1) as Fleet_Avg_Usage
FROM Ambulances
ORDER BY Trips_Since_Maintenance DESC;


-- ============================================================
-- Q3: Zone-Based Emergency "Black Spots"
-- ============================================================
-- Uses: PostGIS ST_Contains, Spatial Joins, Density Ranking
-- Scenario: Where should we station more ambulances?
SELECT 
    dz.Zone_Name,
    dz.Priority_Level,
    COUNT(er.Request_ID) AS Total_Emergencies,
    RANK() OVER (ORDER BY COUNT(er.Request_ID) DESC) as Danger_Rank
FROM Dispatch_Zones dz
LEFT JOIN Emergency_Requests er ON ST_Contains(dz.Zone_Boundary, er.Pickup_Coords)
GROUP BY dz.Zone_ID, dz.Zone_Name, dz.Priority_Level
ORDER BY Danger_Rank ASC;


-- ============================================================
-- Q4: WINDOW FUNCTIONS — Hospital Distance Ranking
-- ============================================================
WITH Patient_Location AS (
    SELECT Pickup_Coords FROM Emergency_Requests WHERE Request_ID = (SELECT Request_ID FROM Emergency_Requests LIMIT 1)
)
SELECT 
    h.Name,
    ROUND(ST_Distance(h.Location_Coords::geography, pl.Pickup_Coords::geography)::numeric, 2) AS Distance_Meters,
    RANK() OVER (ORDER BY ST_Distance(h.Location_Coords::geography, pl.Pickup_Coords::geography)) AS Distance_Rank
FROM Hospitals h, Patient_Location pl
ORDER BY Distance_Rank;


-- ============================================================
-- Q5: FULL AUDIT TRAIL — JSONB Analysis
-- ============================================================
SELECT 
    Audit_ID,
    Table_Name,
    Operation,
    Changed_At,
    New_Values->>'status' AS New_Status,
    Old_Values->>'status' AS Old_Status,
    CASE 
        WHEN (Old_Values->>'status') IS DISTINCT FROM (New_Values->>'status')
        THEN 'Status Transition Detected'
        ELSE 'No Change'
    END AS Audit_Flag
FROM Audit_Log
ORDER BY Changed_At DESC;


-- ============================================================
-- Q6: PERFORMANCE — Explain Analyze Spatial Index
-- ============================================================
EXPLAIN ANALYZE
SELECT Name FROM Hospitals
ORDER BY Location_Coords <-> ST_SetSRID(ST_MakePoint(90.4125, 23.7925), 4326)
LIMIT 1;-- ==========================================
-- DRUTO SHEBA: MEGA SEED DATA GENERATOR (V2)
-- Generates thousands of records for testing
-- ==========================================

-- 1. Patients: Generate 500 patients
INSERT INTO Patients (Name, Phone, Blood_Type)
SELECT 
        (ARRAY[
        'Rahim Uddin', 'Karim Mia', 'Zahirul Islam', 'Sabbir Ahmed', 'Farhan Chowdhury',
        'Nabila Akter', 'Rokeya Begum', 'Anika Khatun', 'Salma Rahman', 'Nusrat Jahan',
        'Lutfur Rahman', 'Jasim Ahmed', 'Sumon Mia', 'Tanjina Akter', 'Fatima Begum',
        'Abid Hasan', 'Sharif Islam', 'Ayesha Siddiqua', 'Khadija Akter', 'Shohel Rana',
        'Sumaiya Tabassum', 'Sadia Afrin', 'Imran Hossain', 'Tariq Ali', 'Farhana Akter'
    ])[floor(random() * 25) + 1],
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
        (ARRAY[
        'Rahim Uddin', 'Karim Mia', 'Zahirul Islam', 'Sabbir Ahmed', 'Farhan Chowdhury',
        'Lutfur Rahman', 'Jasim Ahmed', 'Sumon Mia', 'Abid Hasan', 'Sharif Islam',
        'Shohel Rana', 'Mustafizur Rahman', 'Imran Hossain', 'Tariq Ali', 'Jamal Uddin',
        'Kamal Hossain', 'Asif Ahmed', 'Shafiqul Islam', 'Arif Hossain', 'Mahbub Alam'
    ])[floor(random() * 20) + 1],
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
