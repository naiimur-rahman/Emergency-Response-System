-- ==========================================
-- PHASE 5: SCHEMA EXPANSION (Additional Tables)
-- ==========================================

-- Emergency categorization
CREATE TABLE Emergency_Types (
    Type_ID SERIAL PRIMARY KEY,
    Type_Name VARCHAR(100) NOT NULL UNIQUE,
    Description TEXT,
    Default_Severity severity_lvl NOT NULL DEFAULT 'Medium',
    Requires_Advanced_Equipment BOOLEAN DEFAULT FALSE
);

-- Patient emergency contacts
CREATE TABLE Patient_Emergency_Contacts (
    Contact_ID SERIAL PRIMARY KEY,
    Patient_ID INT NOT NULL REFERENCES Patients(Patient_ID) ON DELETE CASCADE,
    Contact_Name VARCHAR(100) NOT NULL,
    Relationship VARCHAR(50) NOT NULL,
    Phone VARCHAR(20) NOT NULL
);

-- Geographic dispatch zones
CREATE TABLE Dispatch_Zones (
    Zone_ID SERIAL PRIMARY KEY,
    Zone_Name VARCHAR(100) NOT NULL UNIQUE,
    Zone_Boundary GEOMETRY(Polygon, 4326),
    Priority_Level INT DEFAULT 1 CHECK (Priority_Level BETWEEN 1 AND 5)
);

-- Shift schedule management
CREATE TABLE Shift_Schedules (
    Schedule_ID SERIAL PRIMARY KEY,
    Driver_ID INT NOT NULL REFERENCES Drivers(Driver_ID) ON DELETE CASCADE,
    Shift_Date DATE NOT NULL,
    Start_Time TIME NOT NULL,
    End_Time TIME NOT NULL,
    Zone_Assigned INT REFERENCES Dispatch_Zones(Zone_ID),
    UNIQUE(Driver_ID, Shift_Date, Start_Time)
);

-- Ambulance maintenance tracking
CREATE TABLE Maintenance_Logs (
    Log_ID SERIAL PRIMARY KEY,
    Vehicle_ID INT NOT NULL REFERENCES Ambulances(Vehicle_ID) ON DELETE CASCADE,
    Maintenance_Type VARCHAR(100) NOT NULL,
    Description TEXT,
    Cost DECIMAL(10,2) DEFAULT 0.00,
    Date_Started DATE NOT NULL DEFAULT CURRENT_DATE,
    Date_Completed DATE,
    Technician_Name VARCHAR(100)
);

-- Ambulance equipment/medication inventory
CREATE TABLE Vehicle_Inventory (
    Inventory_ID SERIAL PRIMARY KEY,
    Vehicle_ID INT NOT NULL REFERENCES Ambulances(Vehicle_ID) ON DELETE CASCADE,
    Item_Name VARCHAR(100) NOT NULL,
    Quantity INT NOT NULL DEFAULT 0 CHECK (Quantity >= 0),
    Expiry_Date DATE,
    Last_Restocked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Billing and invoicing
CREATE TABLE Billing (
    Bill_ID SERIAL PRIMARY KEY,
    Trip_ID INT NOT NULL REFERENCES Trip_Logs(Trip_ID) ON DELETE CASCADE,
    Patient_ID INT NOT NULL REFERENCES Patients(Patient_ID),
    Amount DECIMAL(10,2) NOT NULL,
    Tax DECIMAL(10,2) DEFAULT 0.00,
    Total_Amount DECIMAL(10,2) GENERATED ALWAYS AS (Amount + Tax) STORED,
    Payment_Status VARCHAR(20) DEFAULT 'Unpaid' CHECK (Payment_Status IN ('Unpaid', 'Paid', 'Waived', 'Insurance')),
    Date_Issued DATE DEFAULT CURRENT_DATE,
    Date_Paid DATE
);

-- Driver certifications & training
CREATE TABLE Driver_Certifications (
    Cert_ID SERIAL PRIMARY KEY,
    Driver_ID INT NOT NULL REFERENCES Drivers(Driver_ID) ON DELETE CASCADE,
    Certification_Name VARCHAR(150) NOT NULL,
    Issuing_Authority VARCHAR(150) NOT NULL,
    Date_Issued DATE NOT NULL,
    Expiry_Date DATE,
    Is_Active BOOLEAN GENERATED ALWAYS AS (Expiry_Date IS NULL OR Expiry_Date >= CURRENT_DATE) STORED
);

-- Post-trip feedback & ratings
CREATE TABLE Trip_Feedback (
    Feedback_ID SERIAL PRIMARY KEY,
    Trip_ID INT NOT NULL UNIQUE REFERENCES Trip_Logs(Trip_ID) ON DELETE CASCADE,
    Rating INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Comments TEXT,
    Response_Time_Rating INT CHECK (Response_Time_Rating BETWEEN 1 AND 5),
    Driver_Rating INT CHECK (Driver_Rating BETWEEN 1 AND 5),
    Submitted_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System audit log (tracks all changes)
CREATE TABLE Audit_Log (
    Audit_ID SERIAL PRIMARY KEY,
    Table_Name VARCHAR(50) NOT NULL,
    Operation VARCHAR(10) NOT NULL CHECK (Operation IN ('INSERT', 'UPDATE', 'DELETE')),
    Record_ID INT NOT NULL,
    Changed_By VARCHAR(100) DEFAULT CURRENT_USER,
    Changed_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Old_Values JSONB,
    New_Values JSONB
);

-- Hospital specializations (M:N relationship)
CREATE TABLE Specializations (
    Spec_ID SERIAL PRIMARY KEY,
    Spec_Name VARCHAR(100) NOT NULL UNIQUE,
    Description TEXT
);

CREATE TABLE Hospital_Specializations (
    Hospital_ID INT NOT NULL REFERENCES Hospitals(Hospital_ID) ON DELETE CASCADE,
    Spec_ID INT NOT NULL REFERENCES Specializations(Spec_ID) ON DELETE CASCADE,
    PRIMARY KEY (Hospital_ID, Spec_ID),
    Specialist_Count INT DEFAULT 0
);


-- ==========================================
-- ADDITIONAL INDEXES
-- ==========================================
CREATE INDEX idx_shift_schedules_date ON Shift_Schedules(Shift_Date);
CREATE INDEX idx_maintenance_vehicle ON Maintenance_Logs(Vehicle_ID);
CREATE INDEX idx_billing_status ON Billing(Payment_Status);
CREATE INDEX idx_audit_table ON Audit_Log(Table_Name, Changed_At);
CREATE INDEX idx_zones_boundary ON Dispatch_Zones USING GIST (Zone_Boundary);
CREATE INDEX idx_inventory_expiry ON Vehicle_Inventory(Expiry_Date);
CREATE INDEX idx_feedback_rating ON Trip_Feedback(Rating);


-- ==========================================
-- ADDITIONAL TRIGGERS
-- ==========================================

-- Audit trigger for Emergency_Requests
CREATE OR REPLACE FUNCTION trg_audit_requests() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO Audit_Log (Table_Name, Operation, Record_ID, New_Values)
        VALUES ('Emergency_Requests', 'INSERT', NEW.Request_ID, row_to_json(NEW)::jsonb);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO Audit_Log (Table_Name, Operation, Record_ID, Old_Values, New_Values)
        VALUES ('Emergency_Requests', 'UPDATE', NEW.Request_ID, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO Audit_Log (Table_Name, Operation, Record_ID, Old_Values)
        VALUES ('Emergency_Requests', 'DELETE', OLD.Request_ID, row_to_json(OLD)::jsonb);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_emergency_requests
AFTER INSERT OR UPDATE OR DELETE ON Emergency_Requests
FOR EACH ROW EXECUTE FUNCTION trg_audit_requests();

-- Auto-set maintenance status trigger
CREATE OR REPLACE FUNCTION trg_set_maintenance_status() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.Date_Completed IS NULL THEN
        UPDATE Ambulances SET Current_Status = 'Maintenance' WHERE Vehicle_ID = NEW.Vehicle_ID;
    ELSE
        UPDATE Ambulances SET Current_Status = 'Available' WHERE Vehicle_ID = NEW.Vehicle_ID;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintenance_status
AFTER INSERT OR UPDATE ON Maintenance_Logs
FOR EACH ROW EXECUTE FUNCTION trg_set_maintenance_status();

-- Low inventory alert view
CREATE OR REPLACE VIEW Low_Inventory_Alert AS
SELECT vi.Vehicle_ID, a.License_Plate, vi.Item_Name, vi.Quantity, vi.Expiry_Date,
       CASE WHEN vi.Expiry_Date < CURRENT_DATE THEN 'EXPIRED'
            WHEN vi.Expiry_Date < CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING SOON'
            WHEN vi.Quantity <= 2 THEN 'LOW STOCK'
            ELSE 'OK' END AS Alert_Status
FROM Vehicle_Inventory vi
JOIN Ambulances a ON vi.Vehicle_ID = a.Vehicle_ID
WHERE vi.Quantity <= 2 OR vi.Expiry_Date < CURRENT_DATE + INTERVAL '30 days';


-- ==========================================
-- EXPANDED SEED DATA
-- ==========================================

-- Dispatch Zones (Dhaka areas)
INSERT INTO Dispatch_Zones (Zone_Name, Zone_Boundary, Priority_Level) VALUES
('Gulshan-Banani', ST_SetSRID(ST_GeomFromText('POLYGON((90.40 23.78, 90.43 23.78, 90.43 23.81, 90.40 23.81, 90.40 23.78))'), 4326), 1),
('Dhanmondi-Mirpur', ST_SetSRID(ST_GeomFromText('POLYGON((90.36 23.74, 90.40 23.74, 90.40 23.78, 90.36 23.78, 90.36 23.74))'), 4326), 2),
('Uttara', ST_SetSRID(ST_GeomFromText('POLYGON((90.38 23.85, 90.42 23.85, 90.42 23.89, 90.38 23.89, 90.38 23.85))'), 4326), 3),
('Old Dhaka', ST_SetSRID(ST_GeomFromText('POLYGON((90.38 23.70, 90.42 23.70, 90.42 23.74, 90.38 23.74, 90.38 23.70))'), 4326), 1);

-- Emergency Types
INSERT INTO Emergency_Types (Type_Name, Description, Default_Severity, Requires_Advanced_Equipment) VALUES
('Cardiac Arrest', 'Heart attack or cardiac emergency', 'Critical', TRUE),
('Road Traffic Accident', 'Vehicle collision injuries', 'High', TRUE),
('Burns', 'Fire or chemical burn injuries', 'High', TRUE),
('Fracture', 'Bone fracture requiring immobilization', 'Medium', FALSE),
('Respiratory Distress', 'Severe breathing difficulty', 'Critical', TRUE),
('Pregnancy Complication', 'Obstetric emergency', 'High', TRUE),
('Stroke', 'Cerebrovascular emergency', 'Critical', TRUE),
('Minor Injury', 'Cuts, bruises, minor trauma', 'Low', FALSE);

-- Patient Emergency Contacts
INSERT INTO Patient_Emergency_Contacts (Patient_ID, Contact_Name, Relationship, Phone) VALUES
(1, 'Fatima Rahman', 'Wife', '01711000001'),
(1, 'Saiful Rahman', 'Son', '01711000002'),
(2, 'Kamal Hossain', 'Father', '01822000001');

-- Specializations
INSERT INTO Specializations (Spec_Name, Description) VALUES
('Cardiology', 'Heart and cardiovascular system'),
('Neurology', 'Brain and nervous system'),
('Orthopedics', 'Bones, joints, and muscles'),
('Trauma Surgery', 'Emergency surgical intervention'),
('Burn Unit', 'Specialized burn treatment'),
('Obstetrics', 'Pregnancy and childbirth'),
('Pediatrics', 'Child healthcare');

-- Hospital-Specialization links
INSERT INTO Hospital_Specializations (Hospital_ID, Spec_ID, Specialist_Count) VALUES
(1, 1, 8), (1, 2, 5), (1, 3, 6), (1, 4, 10), (1, 5, 3), (1, 6, 7), (1, 7, 4),
(2, 1, 12), (2, 2, 8), (2, 3, 4), (2, 4, 6),
(3, 1, 10), (3, 2, 7), (3, 3, 5), (3, 4, 8), (3, 6, 9), (3, 7, 6);

-- Vehicle Inventory
INSERT INTO Vehicle_Inventory (Vehicle_ID, Item_Name, Quantity, Expiry_Date) VALUES
(1, 'Oxygen Cylinder', 3, '2027-06-15'),
(1, 'Defibrillator Pads', 5, '2026-12-01'),
(1, 'IV Saline Bags', 10, '2027-03-20'),
(1, 'Morphine Ampules', 2, '2026-06-01'),
(1, 'Bandage Rolls', 15, NULL),
(2, 'Oxygen Cylinder', 2, '2027-06-15'),
(2, 'First Aid Kit', 3, NULL),
(2, 'Bandage Rolls', 8, NULL),
(3, 'Oxygen Cylinder', 4, '2027-06-15'),
(3, 'Defibrillator Pads', 6, '2027-01-15'),
(3, 'IV Saline Bags', 12, '2027-03-20'),
(3, 'Epinephrine Pens', 3, '2026-09-30');

-- Driver Certifications
INSERT INTO Driver_Certifications (Driver_ID, Certification_Name, Issuing_Authority, Date_Issued, Expiry_Date) VALUES
(1, 'Advanced Life Support (ALS)', 'Bangladesh Red Crescent', '2024-01-15', '2027-01-15'),
(1, 'Defensive Driving', 'BRTA', '2023-06-01', '2026-06-01'),
(1, 'Hazmat Handling', 'Fire Service BD', '2024-03-10', '2027-03-10'),
(2, 'Basic Life Support (BLS)', 'Bangladesh Red Crescent', '2024-05-20', '2027-05-20'),
(2, 'Defensive Driving', 'BRTA', '2023-11-01', '2026-11-01');

-- Shift Schedules
INSERT INTO Shift_Schedules (Driver_ID, Shift_Date, Start_Time, End_Time) VALUES
(1, CURRENT_DATE, '08:00', '20:00'),
(2, CURRENT_DATE, '08:00', '20:00'),
(1, CURRENT_DATE + 1, '20:00', '08:00'),
(2, CURRENT_DATE + 1, '20:00', '08:00');

-- Maintenance Logs
INSERT INTO Maintenance_Logs (Vehicle_ID, Maintenance_Type, Description, Cost, Date_Started, Date_Completed, Technician_Name) VALUES
(2, 'Engine Service', 'Routine 10,000km engine service', 15000.00, '2026-04-01', '2026-04-02', 'Md. Habib'),
(1, 'Tire Replacement', 'All 4 tires replaced', 32000.00, '2026-03-15', '2026-03-15', 'Md. Habib'),
(3, 'AC Repair', 'Compressor replacement', 8500.00, '2026-04-20', '2026-04-22', 'Akhtar Hossain');

-- Additional Patients for richer data
INSERT INTO Patients (Name, Phone, Blood_Type) VALUES
('Rafiq Islam', '01912000000', 'B+'),
('Shabnam Akter', '01612000000', 'AB-'),
('Tanvir Ahmed', '01512000000', 'O-');

INSERT INTO Patient_Conditions (Patient_ID, Condition_Name) VALUES
(3, 'Epilepsy'),
(4, 'Pregnancy - 3rd Trimester'),
(5, 'None');

INSERT INTO Patient_Emergency_Contacts (Patient_ID, Contact_Name, Relationship, Phone) VALUES
(3, 'Rashida Islam', 'Mother', '01912000001'),
(4, 'Jahangir Akter', 'Husband', '01612000001'),
(5, 'Sumon Ahmed', 'Brother', '01512000001');

-- Additional Emergency Requests (historical + new)
INSERT INTO Emergency_Requests (Patient_ID, Pickup_Coords, Severity_Level, Status) VALUES
(2, ST_SetSRID(ST_MakePoint(90.3780, 23.7510), 4326), 'High', 'Pending'),
(3, ST_SetSRID(ST_MakePoint(90.4200, 23.8750), 4326), 'Medium', 'Pending'),
(4, ST_SetSRID(ST_MakePoint(90.3950, 23.7400), 4326), 'Critical', 'Pending'),
(5, ST_SetSRID(ST_MakePoint(90.4050, 23.7850), 4326), 'Low', 'Pending');

-- ==========================================
-- ADVANCED DBMS: MATERIALIZED VIEWS
-- ==========================================

-- Materialized View for heavy analytical dashboard data
CREATE MATERIALIZED VIEW nexus_analytics_mv AS
SELECT 
    DATE(tl.time_dispatched) as trip_date,
    COUNT(tl.trip_id) as total_trips,
    AVG(EXTRACT(EPOCH FROM (tl.time_reached_hospital - tl.time_dispatched))/60)::numeric(10,2) as avg_response_time_minutes,
    SUM(b.total_amount) as total_revenue,
    AVG(tf.rating)::numeric(3,2) as avg_driver_rating
FROM trip_logs tl
LEFT JOIN billing b ON tl.trip_id = b.trip_id
LEFT JOIN trip_feedback tf ON tl.trip_id = tf.trip_id
WHERE tl.time_reached_hospital IS NOT NULL
GROUP BY DATE(tl.time_dispatched)
ORDER BY trip_date DESC;

-- Unique index to allow CONCURRENTLY refreshing
CREATE UNIQUE INDEX idx_nexus_analytics_mv_date ON nexus_analytics_mv(trip_date);

-- Helper function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_nexus_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY nexus_analytics_mv;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- HOSPITAL EXPANSION (Govt & Private)
-- ==========================================

-- Insert 15 Government hospitals
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

-- Insert 15 Private hospitals
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