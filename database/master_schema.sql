-- ==========================================
-- EMERGENCY RESPONSE SYSTEM: SUPABASE RESET
-- Run this only when you want a clean setup.
-- ==========================================

DROP MATERIALIZED VIEW IF EXISTS emergency_analytics_mv CASCADE;
DROP VIEW IF EXISTS Active_Dashboard_View CASCADE;

DO $$ BEGIN
    IF to_regclass('trip_logs') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS After_Trip_Log_Insert ON Trip_Logs;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('emergency_requests') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS After_Request_Resolved ON Emergency_Requests;
    END IF;
END $$;

DROP FUNCTION IF EXISTS trg_reserve_resources() CASCADE;
DROP FUNCTION IF EXISTS trg_release_resources() CASCADE;
DROP FUNCTION IF EXISTS fn_Automated_Dispatch(INT, INT) CASCADE;

DROP TABLE IF EXISTS Trip_Feedback CASCADE;
DROP TABLE IF EXISTS Billing CASCADE;
DROP TABLE IF EXISTS Vehicle_Inventory CASCADE;
DROP TABLE IF EXISTS Driver_Certifications CASCADE;
DROP TABLE IF EXISTS Maintenance_Logs CASCADE;
DROP TABLE IF EXISTS Shift_Schedules CASCADE;
DROP TABLE IF EXISTS Patient_Emergency_Contacts CASCADE;
DROP TABLE IF EXISTS Hospital_Specializations CASCADE;
DROP TABLE IF EXISTS Specializations CASCADE;
DROP TABLE IF EXISTS Emergency_Types CASCADE;
DROP TABLE IF EXISTS Dispatch_Zones CASCADE;
DROP TABLE IF EXISTS Audit_Log CASCADE;

DROP TABLE IF EXISTS Trip_Logs CASCADE;
DROP TABLE IF EXISTS Emergency_Requests CASCADE;
DROP TABLE IF EXISTS Dispatchers CASCADE;
DROP TABLE IF EXISTS Drivers CASCADE;
DROP TABLE IF EXISTS Ambulances CASCADE;
DROP TABLE IF EXISTS Hospitals CASCADE;
DROP TABLE IF EXISTS Patient_Conditions CASCADE;
DROP TABLE IF EXISTS Patients CASCADE;

DROP TYPE IF EXISTS equipment_lvl CASCADE;
DROP TYPE IF EXISTS vehicle_status CASCADE;
DROP TYPE IF EXISTS shift_status CASCADE;
DROP TYPE IF EXISTS severity_lvl CASCADE;
DROP TYPE IF EXISTS req_status CASCADE;
DROP TYPE IF EXISTS hospital_type CASCADE;
-- ==========================================
-- EMERGENCY RESPONSE SYSTEM: CORE SCHEMA (DDL)
-- ==========================================

-- Enable Spatial Features
CREATE EXTENSION IF NOT EXISTS postgis;

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
    Blood_Type VARCHAR(5)
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
    Request_ID SERIAL PRIMARY KEY,
    Patient_ID INT NOT NULL REFERENCES Patients(Patient_ID),
    Pickup_Coords GEOMETRY(Point, 4326) NOT NULL,
    Severity_Level severity_lvl NOT NULL,
    Timestamp_Created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Status req_status DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS Trip_Logs (
    Trip_ID SERIAL PRIMARY KEY,
    Request_ID INT NOT NULL UNIQUE REFERENCES Emergency_Requests(Request_ID),
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
LEFT JOIN Trip_Logs tl ON er.Request_ID = tl.Request_ID
LEFT JOIN Ambulances a ON tl.Vehicle_ID = a.Vehicle_ID
LEFT JOIN Hospitals h ON tl.Hospital_ID = h.Hospital_ID
WHERE er.Status IN ('Pending', 'Active', 'En Route', 'Picked Up', 'Arrived');

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
BEGIN
    IF NEW.Status = 'Resolved' THEN
        -- Automated Predictive Maintenance Flagging
        UPDATE Ambulances 
        SET Current_Status = CASE 
                                WHEN Trips_Since_Maintenance >= 50 THEN 'Maintenance_Required'::vehicle_status 
                                ELSE 'Available'::vehicle_status 
                             END
        WHERE Vehicle_ID = (SELECT Vehicle_ID FROM Trip_Logs WHERE Request_ID = NEW.Request_ID);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS After_Request_Resolved ON Emergency_Requests;
CREATE TRIGGER After_Request_Resolved
AFTER UPDATE ON Emergency_Requests FOR EACH ROW EXECUTE FUNCTION trg_release_resources();

-- Automated Dispatch Algorithm (Champion Version)
CREATE OR REPLACE FUNCTION fn_Automated_Dispatch(p_Request_ID INT, p_Dispatcher_ID INT) RETURNS TEXT AS $$
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

    INSERT INTO Trip_Logs (Request_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
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
    Trip_ID INT NOT NULL REFERENCES Trip_Logs(Trip_ID) ON DELETE CASCADE,
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
    Trip_ID INT NOT NULL UNIQUE REFERENCES Trip_Logs(Trip_ID) ON DELETE CASCADE,
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
    trip_id INTEGER REFERENCES trip_logs(trip_id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ENHANCED AUTOMATED DISPATCH PROCEDURE
-- This function intelligently matches patients to the best possible resources.
-- Fixed: "FOR UPDATE cannot be applied to the nullable side of an outer join" error.
CREATE OR REPLACE FUNCTION public.fn_automated_dispatch(p_request_id integer, p_dispatcher_id integer)
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
    -- Create the trip log
    INSERT INTO Trip_Logs (Request_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
    VALUES (p_Request_ID, v_Ambulance, v_Driver, v_Hospital, p_Dispatcher_ID);

    -- Update resource statuses
    UPDATE Emergency_Requests SET Status = 'Active' WHERE Request_ID = p_Request_ID;
    UPDATE Ambulances SET Current_Status = 'Dispatched' WHERE Vehicle_ID = v_Ambulance;

    -- STEP 6: Initialize Communication
    INSERT INTO chat_messages (trip_id, sender, message_text)
    VALUES (
        (SELECT trip_id FROM trip_logs WHERE request_id = p_request_id),
        'System',
        'Mission Initialized. Unit ' || v_Ambulance_Plate || ' assigned to ' || v_Hospital_Name
    );

    RETURN 'DISPATCH SUCCESS: ' || v_Ambulance_Plate || ' assigned to ' || v_Hospital_Name;
END;
$function$;