-- ==========================================

-- Enable Spatial Features
CREATE EXTENSION IF NOT EXISTS postgis;

-- Custom Short Unique ID Generator (e.g., NX-A1B2C3D4)
CREATE OR REPLACE FUNCTION generate_emergency_id() RETURNS TEXT AS $$
BEGIN
    RETURN 'NX-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Create Custom Enum Types
DO $$ BEGIN
    CREATE TYPE equipment_lvl AS ENUM ('Basic', 'Advanced');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE vehicle_status AS ENUM ('Available', 'Dispatched', 'Maintenance', 'Maintenance_Required');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE shift_status AS ENUM ('On_Duty', 'Off_Duty');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE severity_lvl AS ENUM ('Low', 'Medium', 'High', 'Critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE req_status AS ENUM ('Pending', 'Active', 'En Route', 'Picked Up', 'Arrived', 'Resolved', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hospital_type AS ENUM ('Government', 'Private');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Core Tables
CREATE TABLE IF NOT EXISTS Patients (
    Patient_ID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(20) NOT NULL,
    Blood_Type VARCHAR(5),
    Address TEXT,
    Primary_Specialization VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS Patient_Conditions (
    Record_ID SERIAL PRIMARY KEY,
    Patient_ID INT NOT NULL REFERENCES Patients(Patient_ID) ON DELETE CASCADE,
    Condition_Name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Hospitals (
    Hospital_ID SERIAL PRIMARY KEY,
    Name VARCHAR(150) NOT NULL,
    Location_Coords GEOMETRY(Point, 4326) NOT NULL,
    General_Beds INT NOT NULL DEFAULT 0,
    ICU_Beds INT NOT NULL DEFAULT 0,
    Type hospital_type NOT NULL DEFAULT 'Private'
);

CREATE TABLE IF NOT EXISTS Ambulances (
    Vehicle_ID SERIAL PRIMARY KEY,
    License_Plate VARCHAR(20) UNIQUE NOT NULL,
    Equipment_Level equipment_lvl NOT NULL,
    Current_Status vehicle_status DEFAULT 'Available',
    Trips_Since_Maintenance INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS Drivers (
    Driver_ID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    License_No VARCHAR(50) UNIQUE NOT NULL,
    Shift_Status shift_status DEFAULT 'Off_Duty'
);

CREATE TABLE IF NOT EXISTS Dispatchers (
    Dispatcher_ID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Shift_Time VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS Emergency_Requests (
    Request_ID VARCHAR(20) PRIMARY KEY DEFAULT generate_emergency_id(),
    Patient_ID INT NOT NULL REFERENCES Patients(Patient_ID),
    Pickup_Coords GEOMETRY(Point, 4326) NOT NULL,
    Severity_Level severity_lvl NOT NULL,
    Timestamp_Created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Status req_status DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS Trip_Logs (
    Trip_ID VARCHAR(20) PRIMARY KEY REFERENCES Emergency_Requests(Request_ID) ON DELETE CASCADE,
    Vehicle_ID INT NOT NULL REFERENCES Ambulances(Vehicle_ID),
    Driver_ID INT NOT NULL REFERENCES Drivers(Driver_ID),
    Hospital_ID INT NOT NULL REFERENCES Hospitals(Hospital_ID),
    Dispatcher_ID INT NOT NULL REFERENCES Dispatchers(Dispatcher_ID),
    Time_Dispatched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Time_Arrived_Scene TIMESTAMP NULL,
    Time_Reached_Hospital TIMESTAMP NULL
);

-- 2. THE ENGINE (Views & Triggers)
CREATE OR REPLACE VIEW Active_Dashboard_View AS
SELECT 
    er.Request_ID, er.Patient_ID, p.Name AS Patient_Name, p.Blood_Type, er.Severity_Level,
    er.Status AS Request_Status, a.License_Plate AS Assigned_Ambulance,
    h.Name AS Destination_Hospital, h.Type AS Hospital_Type
FROM Emergency_Requests er
JOIN Patients p ON er.Patient_ID = p.Patient_ID
LEFT JOIN Trip_Logs tl ON er.Request_ID = tl.Trip_ID
LEFT JOIN Ambulances a ON tl.Vehicle_ID = a.Vehicle_ID
LEFT JOIN Hospitals h ON tl.Hospital_ID = h.Hospital_ID
WHERE er.Status IN ('Pending', 'Active', 'En Route', 'Picked Up', 'Arrived');

-- AI Severity Predictor (Database side)
CREATE OR REPLACE FUNCTION trg_predict_severity() RETURNS TRIGGER AS $$
DECLARE
    v_Condition VARCHAR;
BEGIN
    -- Only evaluate if severity isn't already Critical
    IF NEW.Severity_Level != 'Critical' THEN
        -- Get patient's primary condition
        SELECT Condition_Name INTO v_Condition FROM Patient_Conditions WHERE Patient_ID = NEW.Patient_ID LIMIT 1;
        
        -- Override severity based on high-risk keywords
        IF v_Condition ILIKE '%Heart%' OR v_Condition ILIKE '%Stroke%' OR v_Condition ILIKE '%Asthma%' THEN
            NEW.Severity_Level := 'Critical';
        ELSIF v_Condition ILIKE '%Diabetes%' OR v_Condition ILIKE '%Hypertension%' THEN
            NEW.Severity_Level := 'High';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS Before_Request_Insert ON Emergency_Requests;
CREATE TRIGGER Before_Request_Insert
BEFORE INSERT ON Emergency_Requests FOR EACH ROW EXECUTE FUNCTION trg_predict_severity();

-- Triggers for Auto-Dispatch Logic
CREATE OR REPLACE FUNCTION trg_reserve_resources() RETURNS TRIGGER AS $$
BEGIN
    UPDATE Ambulances 
    SET Current_Status = 'Dispatched',
        Trips_Since_Maintenance = Trips_Since_Maintenance + 1
    WHERE Vehicle_ID = NEW.Vehicle_ID;

    UPDATE Hospitals SET ICU_Beds = ICU_Beds - 1 WHERE Hospital_ID = NEW.Hospital_ID AND ICU_Beds > 0;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS After_Trip_Log_Insert ON Trip_Logs;
CREATE TRIGGER After_Trip_Log_Insert
AFTER INSERT ON Trip_Logs FOR EACH ROW EXECUTE FUNCTION trg_reserve_resources();

CREATE OR REPLACE FUNCTION trg_release_resources() RETURNS TRIGGER AS $$
DECLARE
    v_Vehicle_ID INT;
    v_Hospital_ID INT;
    v_Trip_ID VARCHAR(20);
    v_Distance_KM NUMERIC;
    v_Base_Fee DECIMAL := 50.00;
    v_Per_KM_Fee DECIMAL := 5.00;
    v_Equipment_Fee DECIMAL := 0.00;
    v_Equipment_Level equipment_lvl;
    v_Hospital_Coords GEOMETRY;
BEGIN
    IF NEW.Status = 'Resolved' THEN
        -- Get Trip Details
        SELECT Trip_ID, Vehicle_ID, Hospital_ID INTO v_Trip_ID, v_Vehicle_ID, v_Hospital_ID
        FROM Trip_Logs WHERE Trip_ID = NEW.Request_ID LIMIT 1;

        -- 1. Automated Predictive Maintenance Flagging
        UPDATE Ambulances 
        SET Current_Status = CASE 
                                WHEN Trips_Since_Maintenance >= 50 THEN 'Maintenance_Required'::vehicle_status 
                                ELSE 'Available'::vehicle_status 
                             END
        WHERE Vehicle_ID = v_Vehicle_ID
        RETURNING Equipment_Level INTO v_Equipment_Level;

        -- 2. Automated Billing Generation
        IF v_Trip_ID IS NOT NULL THEN
            -- Calculate Distance
            SELECT Location_Coords INTO v_Hospital_Coords FROM Hospitals WHERE Hospital_ID = v_Hospital_ID;
            v_Distance_KM := COALESCE(ROUND(ST_Distance(v_Hospital_Coords::geography, NEW.Pickup_Coords::geography)::numeric / 1000, 2), 5.00); -- Default to 5km if error
            
            -- Determine Equipment Fee
            IF v_Equipment_Level = 'Advanced' THEN
                v_Equipment_Fee := 100.00;
            END IF;

            -- Generate Bill
            INSERT INTO Billing (Trip_ID, Patient_ID, Amount, Tax)
            VALUES (
                v_Trip_ID, 
                NEW.Patient_ID, 
                v_Base_Fee + (v_Distance_KM * v_Per_KM_Fee) + v_Equipment_Fee,
                (v_Base_Fee + (v_Distance_KM * v_Per_KM_Fee) + v_Equipment_Fee) * 0.15 -- 15% Tax
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS After_Request_Resolved ON Emergency_Requests;
CREATE TRIGGER After_Request_Resolved
AFTER UPDATE ON Emergency_Requests FOR EACH ROW EXECUTE FUNCTION trg_release_resources();

-- Automated Dispatch Algorithm (Champion Version)
CREATE OR REPLACE FUNCTION fn_Automated_Dispatch(p_Request_ID VARCHAR(20), p_Dispatcher_ID INT) RETURNS TEXT AS $$
DECLARE
    v_Patient_Coords GEOMETRY; v_Severity severity_lvl; v_Patient_ID INT; 
    v_Ambulance INT; v_Hospital INT; v_Driver INT; v_Condition VARCHAR;
BEGIN
    -- 1. Identify Patient and Condition
    SELECT Pickup_Coords, Severity_Level, Patient_ID INTO v_Patient_Coords, v_Severity, v_Patient_ID
    FROM Emergency_Requests WHERE Request_ID = p_Request_ID FOR UPDATE;

    SELECT Condition_Name INTO v_Condition FROM Patient_Conditions WHERE Patient_ID = v_Patient_ID LIMIT 1;

    -- 2. Find nearest available ambulance
    SELECT Vehicle_ID INTO v_Ambulance FROM Ambulances
    WHERE Current_Status = 'Available' AND (v_Severity NOT IN ('High', 'Critical') OR Equipment_Level = 'Advanced')
    LIMIT 1 FOR UPDATE;

    -- 3. Find nearest capable hospital (Specialization-Aware)
    SELECT h.Hospital_ID INTO v_Hospital FROM Hospitals h
    LEFT JOIN Hospital_Specializations hs ON h.Hospital_ID = hs.Hospital_ID
    LEFT JOIN Specializations s ON hs.Spec_ID = s.Spec_ID
    WHERE 
        ((v_Severity IN ('High', 'Critical') AND h.ICU_Beds > 0) OR (v_Severity IN ('Low', 'Medium') AND h.General_Beds > 0))
        AND (v_Condition IS NULL OR s.Spec_Name ILIKE '%' || v_Condition || '%' OR s.Spec_Name IS NULL)
    ORDER BY 
        (s.Spec_Name ILIKE '%' || v_Condition || '%') DESC, -- Match specialization first
        ST_Distance(h.Location_Coords::geography, v_Patient_Coords::geography) ASC 
    LIMIT 1 FOR UPDATE;

    -- 4. Find on-duty driver
    SELECT Driver_ID INTO v_Driver FROM Drivers WHERE Shift_Status = 'On_Duty' LIMIT 1;

    IF v_Ambulance IS NULL OR v_Hospital IS NULL OR v_Driver IS NULL THEN
        RETURN 'DISPATCH FAILED: Insufficient resources.';
    END IF;

    INSERT INTO Trip_Logs (Trip_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
    VALUES (p_Request_ID, v_Ambulance, v_Driver, v_Hospital, p_Dispatcher_ID);

    UPDATE Emergency_Requests SET Status = 'Active' WHERE Request_ID = p_Request_ID;

    RETURN 'DISPATCH SUCCESS: Specialization-matched hospital ' || v_Hospital || ' assigned.';
END;
$$ LANGUAGE plpgsql;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON Hospitals USING GIST (Location_Coords);
CREATE INDEX IF NOT EXISTS idx_requests_pickup ON Emergency_Requests USING GIST (Pickup_Coords);
CREATE INDEX IF NOT EXISTS idx_ambulances_status ON Ambulances(Current_Status);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON Drivers(Shift_Status);
CREATE INDEX IF NOT EXISTS idx_req_status ON Emergency_Requests(Status);
-- ==========================================
-- EMERGENCY RESPONSE SYSTEM: SCHEMA EXPANSION (Advanced Features)
-- ==========================================

-- 1. Expanded Tables
CREATE TABLE IF NOT EXISTS Emergency_Types (
    Type_ID SERIAL PRIMARY KEY,
    Type_Name VARCHAR(100) NOT NULL UNIQUE,
    Description TEXT,
    Default_Severity severity_lvl NOT NULL DEFAULT 'Medium',
    Requires_Advanced_Equipment BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS Patient_Emergency_Contacts (
    Contact_ID SERIAL PRIMARY KEY,
    Patient_ID INT NOT NULL REFERENCES Patients(Patient_ID) ON DELETE CASCADE,
    Contact_Name VARCHAR(100) NOT NULL,
    Relationship VARCHAR(50) NOT NULL,
    Phone VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS Dispatch_Zones (
    Zone_ID SERIAL PRIMARY KEY,
    Zone_Name VARCHAR(100) NOT NULL UNIQUE,
    Zone_Boundary GEOMETRY(Polygon, 4326),
    Priority_Level INT DEFAULT 1 CHECK (Priority_Level BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS Shift_Schedules (
    Schedule_ID SERIAL PRIMARY KEY,
    Driver_ID INT NOT NULL REFERENCES Drivers(Driver_ID) ON DELETE CASCADE,
    Shift_Date DATE NOT NULL,
    Start_Time TIME NOT NULL,
    End_Time TIME NOT NULL,
    Zone_Assigned INT REFERENCES Dispatch_Zones(Zone_ID),
    UNIQUE(Driver_ID, Shift_Date, Start_Time)
);

CREATE TABLE IF NOT EXISTS Maintenance_Logs (
    Log_ID SERIAL PRIMARY KEY,
    Vehicle_ID INT NOT NULL REFERENCES Ambulances(Vehicle_ID) ON DELETE CASCADE,
    Maintenance_Type VARCHAR(100) NOT NULL,
    Description TEXT,
    Cost DECIMAL(10,2) DEFAULT 0.00,
    Date_Started DATE NOT NULL DEFAULT CURRENT_DATE,
    Date_Completed DATE,
    Technician_Name VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS Vehicle_Inventory (
    Inventory_ID SERIAL PRIMARY KEY,
    Vehicle_ID INT NOT NULL REFERENCES Ambulances(Vehicle_ID) ON DELETE CASCADE,
    Item_Name VARCHAR(100) NOT NULL,
    Quantity INT NOT NULL DEFAULT 0 CHECK (Quantity >= 0),
    Expiry_Date DATE,
    Last_Restocked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Billing (
    Bill_ID SERIAL PRIMARY KEY,
    Trip_ID VARCHAR(20) NOT NULL REFERENCES Trip_Logs(Trip_ID) ON DELETE CASCADE,
    Patient_ID INT NOT NULL REFERENCES Patients(Patient_ID),
    Amount DECIMAL(10,2) NOT NULL,
    Tax DECIMAL(10,2) DEFAULT 0.00,
    Total_Amount DECIMAL(10,2) GENERATED ALWAYS AS (Amount + Tax) STORED,
    Payment_Status VARCHAR(20) DEFAULT 'Unpaid' CHECK (Payment_Status IN ('Unpaid', 'Paid', 'Waived', 'Insurance')),
    Date_Issued DATE DEFAULT CURRENT_DATE,
    Date_Paid DATE
);

CREATE TABLE IF NOT EXISTS Driver_Certifications (
    Cert_ID SERIAL PRIMARY KEY,
    Driver_ID INT NOT NULL REFERENCES Drivers(Driver_ID) ON DELETE CASCADE,
    Certification_Name VARCHAR(150) NOT NULL,
    Issuing_Authority VARCHAR(150) NOT NULL,
    Date_Issued DATE NOT NULL,
    Expiry_Date DATE,
    Is_Active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS Trip_Feedback (
    Feedback_ID SERIAL PRIMARY KEY,
    Trip_ID VARCHAR(20) NOT NULL UNIQUE REFERENCES Trip_Logs(Trip_ID) ON DELETE CASCADE,
    Rating INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Comments TEXT,
    Response_Time_Rating INT CHECK (Response_Time_Rating BETWEEN 1 AND 5),
    Driver_Rating INT CHECK (Driver_Rating BETWEEN 1 AND 5),
    Submitted_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Audit_Log (
    Audit_ID SERIAL PRIMARY KEY,
    Table_Name VARCHAR(50) NOT NULL,
    Operation VARCHAR(10) NOT NULL CHECK (Operation IN ('INSERT', 'UPDATE', 'DELETE')),
    Record_ID INT NOT NULL,
    Changed_By VARCHAR(100) DEFAULT CURRENT_USER,
    Changed_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Old_Values JSONB,
    New_Values JSONB
);

CREATE TABLE IF NOT EXISTS Specializations (
    Spec_ID SERIAL PRIMARY KEY,
    Spec_Name VARCHAR(100) NOT NULL UNIQUE,
    Description TEXT
);

CREATE TABLE IF NOT EXISTS Hospital_Specializations (
    Hospital_ID INT NOT NULL REFERENCES Hospitals(Hospital_ID) ON DELETE CASCADE,
    Spec_ID INT NOT NULL REFERENCES Specializations(Spec_ID) ON DELETE CASCADE,
    PRIMARY KEY (Hospital_ID, Spec_ID),
    Specialist_Count INT DEFAULT 0
);

-- 2. Advanced Performance Logic
CREATE INDEX IF NOT EXISTS idx_audit_table ON Audit_Log(Table_Name, Changed_At);
CREATE INDEX IF NOT EXISTS idx_zones_boundary ON Dispatch_Zones USING GIST (Zone_Boundary);

-- Materialized View for Analytics
DROP MATERIALIZED VIEW IF EXISTS emergency_analytics_mv CASCADE;
CREATE MATERIALIZED VIEW emergency_analytics_mv AS
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
GROUP BY DATE(tl.time_dispatched);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_mv_date ON emergency_analytics_mv(trip_date);
-- =========================================================================
-- EMERGENCY RESPONSE SYSTEM - DATABASE SCHEMA UPDATE (v2.0)
-- Purpose: Fixes dispatch logic, adds communication tables, and enhances
--          resource allocation intelligence.
-- =========================================================================

-- 1. COMMUNICATION LAYER
-- Stores real-time communication between dispatchers and drivers.
-- Includes relational integrity via Foreign Key to trip_logs.
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id SERIAL PRIMARY KEY,
    trip_id VARCHAR(20) REFERENCES trip_logs(trip_id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ENHANCED AUTOMATED DISPATCH PROCEDURE
-- This function intelligently matches patients to the best possible resources.
-- Fixed: "FOR UPDATE cannot be applied to the nullable side of an outer join" error.
CREATE OR REPLACE FUNCTION public.fn_automated_dispatch(p_request_id varchar(20), p_dispatcher_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_Patient_Coords GEOMETRY; 
    v_Severity severity_lvl; 
    v_Patient_ID INT; 
    v_Ambulance INT; 
    v_Hospital INT; 
    v_Driver INT; 
    v_Condition VARCHAR;
    v_Hospital_Name TEXT; 
    v_Ambulance_Plate TEXT;
BEGIN
    -- STEP 1: Identify Patient and Condition
    -- We lock the request row to prevent double-dispatching in high-traffic scenarios.
    SELECT Pickup_Coords, Severity_Level, Patient_ID INTO v_Patient_Coords, v_Severity, v_Patient_ID
    FROM Emergency_Requests WHERE Request_ID = p_Request_ID FOR UPDATE;

    -- Get the patient's primary condition for specialization matching.
    SELECT Condition_Name INTO v_Condition FROM Patient_Conditions WHERE Patient_ID = v_Patient_ID LIMIT 1;

    -- STEP 2: Find nearest available ambulance
    -- Note: We pick the first available since the schema does not store live ambulance GPS positions.
    SELECT Vehicle_ID, License_Plate INTO v_Ambulance, v_Ambulance_Plate FROM Ambulances
    WHERE Current_Status = 'Available' AND (v_Severity NOT IN ('High', 'Critical') OR Equipment_Level = 'Advanced')
    LIMIT 1 FOR UPDATE;

    -- STEP 3: Find nearest capable hospital (Fixed Locking Logic)
    -- We use a CTE to pre-calculate the best match based on specialization AND distance.
    WITH CapableHospitals AS (
        SELECT h.Hospital_ID, h.Name
        FROM Hospitals h
        LEFT JOIN Hospital_Specializations hs ON h.Hospital_ID = hs.Hospital_ID
        LEFT JOIN Specializations s ON hs.Spec_ID = s.Spec_ID
        WHERE 
            -- Check bed availability based on severity
            ((v_Severity IN ('High', 'Critical') AND h.ICU_Beds > 0) OR (v_Severity IN ('Low', 'Medium') AND h.General_Beds > 0))
            -- Ensure hospital has required specialization OR fallback to any hospital if no specific condition
            AND (v_Condition IS NULL OR s.Spec_Name ILIKE '%' || v_Condition || '%' OR s.Spec_Name IS NULL)
        ORDER BY 
            (s.Spec_Name ILIKE '%' || v_Condition || '%') DESC, -- Rank specialization matches higher
            ST_Distance(h.Location_Coords::geography, v_Patient_Coords::geography) ASC -- Then rank by distance
        LIMIT 1
    )
    SELECT Hospital_ID, Name INTO v_Hospital, v_Hospital_Name FROM Hospitals 
    WHERE Hospital_ID IN (SELECT Hospital_ID FROM CapableHospitals) FOR UPDATE;

    -- STEP 4: Find on-duty driver
    SELECT Driver_ID INTO v_Driver FROM Drivers WHERE Shift_Status = 'On_Duty' LIMIT 1 FOR UPDATE;

    -- VALIDATION: Ensure all resources were secured
    IF v_Ambulance IS NULL OR v_Hospital IS NULL OR v_Driver IS NULL THEN
        RETURN 'DISPATCH FAILED: Insufficient resources available.';
    END IF;

    -- STEP 5: Transactional Fulfillment
    -- Create the trip log (Using Request_ID as the Trip_ID)
    INSERT INTO Trip_Logs (Trip_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
    VALUES (p_Request_ID, v_Ambulance, v_Driver, v_Hospital, p_Dispatcher_ID);

    -- Update resource statuses
    UPDATE Emergency_Requests SET Status = 'Active' WHERE Request_ID = p_Request_ID;
    UPDATE Ambulances SET Current_Status = 'Dispatched' WHERE Vehicle_ID = v_Ambulance;

    -- STEP 6: Initialize Communication
    INSERT INTO chat_messages (trip_id, sender, message_text)
    VALUES (
        p_request_id,
        'System',
        'Mission Initialized. Unit ' || v_Ambulance_Plate || ' assigned to ' || v_Hospital_Name
    );

    RETURN 'DISPATCH SUCCESS: ' || v_Ambulance_Plate || ' assigned to ' || v_Hospital_Name;
END;
$function$;
-- ==========================================
-- EMERGENCY RESPONSE SYSTEM: SEED DATA
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
('Ibne Sina Kalyanpur', ST_SetSRID(ST_MakePoint(90.3533, 23.7844), 4326), 250, 30, 'Private'),
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
('DHA-12-4455', 'Advanced', 'Available'),
('DHA-14-1122', 'Basic', 'Available'),
('DHA-15-3344', 'Advanced', 'Available'),
('DHA-16-5566', 'Basic', 'Available')
ON CONFLICT DO NOTHING;

-- 7. Drivers
INSERT INTO Drivers (Name, License_No, Shift_Status) VALUES 
('Rahim Uddin', 'BD-DL-99384', 'On_Duty'),
('Karim Mia', 'BD-DL-22839', 'On_Duty'),
('Selim Ahmed', 'BD-DL-44556', 'Off_Duty'),
('Tanvir Hossain', 'BD-DL-77889', 'On_Duty'),
('Jasim Uddin', 'BD-DL-11223', 'Off_Duty')
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
-- EMERGENCY RESPONSE SYSTEM: ADVANCED QUERY SHOWCASE
-- For UIU CSE DBMS Project Show
-- ==========================================

-- ============================================================
-- Q1: CHAMPION FEATURE — Specialization-Aware Dispatch Simulation
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
-- Q2: CHAMPION FEATURE — Predictive Maintenance Alerts
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
-- Q3: CHAMPION FEATURE — Zone-Based Emergency "Black Spots"
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
LIMIT 1;