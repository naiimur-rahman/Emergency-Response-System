-- ==========================================
-- EMERGENCY RESPONSE SYSTEM: CORE SCHEMA (DDL)
-- ==========================================

-- Enable Spatial Features
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create Custom Enum Types
CREATE TYPE equipment_lvl AS ENUM ('Basic', 'Advanced');
CREATE TYPE vehicle_status AS ENUM ('Available', 'Dispatched', 'Maintenance', 'Maintenance_Required');
CREATE TYPE shift_status AS ENUM ('On_Duty', 'Off_Duty');
CREATE TYPE severity_lvl AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE req_status AS ENUM ('Pending', 'Active', 'En Route', 'Picked Up', 'Arrived', 'Resolved', 'Cancelled');
CREATE TYPE hospital_type AS ENUM ('Government', 'Private');

-- 1. Core Tables
CREATE TABLE Patients (
    Patient_ID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(20) NOT NULL,
    Blood_Type VARCHAR(5)
);

CREATE TABLE Patient_Conditions (
    Record_ID SERIAL PRIMARY KEY,
    Patient_ID INT NOT NULL REFERENCES Patients(Patient_ID) ON DELETE CASCADE,
    Condition_Name VARCHAR(100) NOT NULL
);

CREATE TABLE Hospitals (
    Hospital_ID SERIAL PRIMARY KEY,
    Name VARCHAR(150) NOT NULL,
    Location_Coords GEOMETRY(Point, 4326) NOT NULL,
    General_Beds INT NOT NULL DEFAULT 0,
    ICU_Beds INT NOT NULL DEFAULT 0,
    Type hospital_type NOT NULL DEFAULT 'Private'
);

CREATE TABLE Ambulances (
    Vehicle_ID SERIAL PRIMARY KEY,
    License_Plate VARCHAR(20) UNIQUE NOT NULL,
    Equipment_Level equipment_lvl NOT NULL,
    Current_Status vehicle_status DEFAULT 'Available',
    Trips_Since_Maintenance INT DEFAULT 0
);

CREATE TABLE Drivers (
    Driver_ID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    License_No VARCHAR(50) UNIQUE NOT NULL,
    Shift_Status shift_status DEFAULT 'Off_Duty'
);

CREATE TABLE Dispatchers (
    Dispatcher_ID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Shift_Time VARCHAR(50) NOT NULL
);

CREATE TABLE Emergency_Requests (
    Request_ID SERIAL PRIMARY KEY,
    Patient_ID INT NOT NULL REFERENCES Patients(Patient_ID),
    Pickup_Coords GEOMETRY(Point, 4326) NOT NULL,
    Severity_Level severity_lvl NOT NULL,
    Timestamp_Created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Status req_status DEFAULT 'Pending'
);

CREATE TABLE Trip_Logs (
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
    er.Request_ID, p.Name AS Patient_Name, p.Blood_Type, er.Severity_Level,
    er.Status AS Request_Status, a.License_Plate AS Assigned_Ambulance,
    h.Name AS Destination_Hospital
FROM Emergency_Requests er
JOIN Patients p ON er.Patient_ID = p.Patient_ID
LEFT JOIN Trip_Logs tl ON er.Request_ID = tl.Request_ID
LEFT JOIN Ambulances a ON tl.Vehicle_ID = a.Vehicle_ID
LEFT JOIN Hospitals h ON tl.Hospital_ID = h.Hospital_ID
WHERE er.Status IN ('Pending', 'Active');

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
CREATE INDEX idx_hospitals_location ON Hospitals USING GIST (Location_Coords);
CREATE INDEX idx_requests_pickup ON Emergency_Requests USING GIST (Pickup_Coords);
CREATE INDEX idx_ambulances_status ON Ambulances(Current_Status);
CREATE INDEX idx_drivers_status ON Drivers(Shift_Status);
CREATE INDEX idx_req_status ON Emergency_Requests(Status);
