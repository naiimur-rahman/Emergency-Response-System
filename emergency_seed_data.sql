-- ==========================================
-- EMERGENCY RESPONSE SYSTEM: SEED DATA
-- Comprehensive dataset for Dhaka, Bangladesh
-- ==========================================

-- 1. Core Hospitals (Seed)
INSERT INTO Hospitals (Name, Location_Coords, General_Beds, ICU_Beds, Type) VALUES 
('Dhaka Medical College', ST_SetSRID(ST_MakePoint(90.3976, 23.7250), 4326), 500, 20, 'Government'),
('Square Hospital Panthapath', ST_SetSRID(ST_MakePoint(90.3815, 23.7530), 4326), 250, 15, 'Private'),
('Evercare Hospital Bashundhara', ST_SetSRID(ST_MakePoint(90.4313, 23.8103), 4326), 300, 25, 'Private');

-- 2. Expanded Hospitals (Govt)
INSERT INTO hospitals (name, location_coords, general_beds, icu_beds, type) VALUES
('BSMMU (PG Hospital)', ST_SetSRID(ST_MakePoint(90.3957, 23.7394), 4326), 1500, 150, 'Government'),
('Kurmitola General Hospital', ST_SetSRID(ST_MakePoint(90.4131, 23.8236), 4326), 500, 30, 'Government'),
('Shaheed Suhrawardy Hospital', ST_SetSRID(ST_MakePoint(90.3698, 23.7712), 4326), 800, 40, 'Government'),
('NICVD (Heart Institute)', ST_SetSRID(ST_MakePoint(90.3705, 23.7735), 4326), 450, 60, 'Government'),
('National Institute of Cancer', ST_SetSRID(ST_MakePoint(90.3731, 23.7758), 4326), 300, 20, 'Government'),
('Sir Salimullah Medical College (Mitford)', ST_SetSRID(ST_MakePoint(90.3986, 23.7099), 4326), 900, 50, 'Government'),
('NITOR (Orthopaedic Hospital)', ST_SetSRID(ST_MakePoint(90.3695, 23.7725), 4326), 1000, 60, 'Government'),
('National Institute of Neurosciences (NINS)', ST_SetSRID(ST_MakePoint(90.3702, 23.7745), 4326), 450, 100, 'Government'),
('National Institute of Kidney Diseases (NIKDU)', ST_SetSRID(ST_MakePoint(90.3688, 23.7728), 4326), 300, 40, 'Government'),
('Mugda Medical College and Hospital', ST_SetSRID(ST_MakePoint(90.4325, 23.7322), 4326), 500, 50, 'Government'),
('BIRDEM General Hospital', ST_SetSRID(ST_MakePoint(90.3955, 23.7385), 4326), 700, 80, 'Government'),
('Dhaka Shishu (Children) Hospital', ST_SetSRID(ST_MakePoint(90.3690, 23.7738), 4326), 650, 70, 'Government'),
('Infectious Diseases Hospital (IDH)', ST_SetSRID(ST_MakePoint(90.4005, 23.7795), 4326), 200, 10, 'Government'),
('National Institute of Ophthalmology', ST_SetSRID(ST_MakePoint(90.3705, 23.7742), 4326), 250, 15, 'Government'),
('Kuwait Bangladesh Friendship Hospital', ST_SetSRID(ST_MakePoint(90.3950, 23.8685), 4326), 200, 30, 'Government')
ON CONFLICT DO NOTHING;

-- 3. Expanded Hospitals (Private)
INSERT INTO hospitals (name, location_coords, general_beds, icu_beds, type) VALUES
('United Hospital Gulshan', ST_SetSRID(ST_MakePoint(90.4194, 23.8055), 4326), 500, 80, 'Private'),
('LabAid Dhanmondi', ST_SetSRID(ST_MakePoint(90.3822, 23.7431), 4326), 300, 50, 'Private'),
('Ibne Sina Kalyanpur', ST_SetSRID(ST_MakePoint(90.3475, 23.7845), 4326), 250, 30, 'Private'),
('BRB Hospital Panthapath', ST_SetSRID(ST_MakePoint(90.3885, 23.7511), 4326), 400, 45, 'Private'),
('Popular Diagnostic Centre', ST_SetSRID(ST_MakePoint(90.3811, 23.7410), 4326), 100, 10, 'Private'),
('Asgar Ali Hospital', ST_SetSRID(ST_MakePoint(90.4185, 23.7015), 4326), 250, 40, 'Private'),
('Green Life Hospital', ST_SetSRID(ST_MakePoint(90.3842, 23.7435), 4326), 300, 45, 'Private'),
('Anwar Khan Modern Hospital', ST_SetSRID(ST_MakePoint(90.3825, 23.7388), 4326), 400, 50, 'Private'),
('Central Hospital Ltd', ST_SetSRID(ST_MakePoint(90.3835, 23.7382), 4326), 200, 30, 'Private'),
('Bangladesh Specialized Hospital', ST_SetSRID(ST_MakePoint(90.3655, 23.7705), 4326), 350, 60, 'Private'),
('Impulse Hospital', ST_SetSRID(ST_MakePoint(90.3920, 23.7665), 4326), 250, 35, 'Private'),
('Universal Medical College Hospital', ST_SetSRID(ST_MakePoint(90.3945, 23.7700), 4326), 200, 25, 'Private'),
('AMZ Hospital Badda', ST_SetSRID(ST_MakePoint(90.4265, 23.7800), 4326), 150, 20, 'Private'),
('Comfort Hospital', ST_SetSRID(ST_MakePoint(90.3855, 23.7445), 4326), 100, 15, 'Private'),
('Japan East West Medical College', ST_SetSRID(ST_MakePoint(90.3900, 23.8825), 4326), 300, 40, 'Private')
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
('DHA-11-9922', 'Advanced', 'Available'),
('DHA-11-8833', 'Basic', 'Available'),
('DHA-12-4455', 'Advanced', 'Available')
ON CONFLICT DO NOTHING;

-- 7. Drivers
INSERT INTO Drivers (Name, License_No, Shift_Status) VALUES 
('Rahim Uddin', 'BD-DL-99384', 'On_Duty'),
('Karim Mia', 'BD-DL-22839', 'On_Duty')
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
('Pediatrics', 'Child healthcare')
ON CONFLICT DO NOTHING;

-- 10. Hospital-Specialization links
INSERT INTO Hospital_Specializations (Hospital_ID, Spec_ID, Specialist_Count) VALUES
(1, 1, 8), (1, 2, 5), (1, 3, 6), (1, 4, 10), (1, 5, 3), (1, 6, 7), (1, 7, 4),
(2, 1, 12), (2, 2, 8), (2, 3, 4), (2, 4, 6),
(3, 1, 10), (3, 2, 7), (3, 3, 5), (3, 4, 8), (3, 6, 9), (3, 7, 6)
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
(1, ST_SetSRID(ST_MakePoint(90.4125, 23.7925), 4326), 'Critical', 'Pending')
ON CONFLICT DO NOTHING;
