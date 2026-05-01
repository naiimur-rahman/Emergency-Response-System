-- ==========================================
-- PHASE 1: THE SCHEMA (DDL & 3NF Structure)
-- ==========================================

-- Enable Spatial Features
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create Custom Enum Types
CREATE TYPE equipment_lvl AS ENUM ('Basic', 'Advanced');
CREATE TYPE vehicle_status AS ENUM ('Available', 'Dispatched', 'Maintenance');
CREATE TYPE shift_status AS ENUM ('On_Duty', 'Off_Duty');
CREATE TYPE severity_lvl AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE req_status AS ENUM ('Pending', 'Active', 'En Route', 'Picked Up', 'Arrived', 'Resolved', 'Cancelled');
CREATE TYPE hospital_type AS ENUM ('Government', 'Private');

-- Core Tables
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
    Current_Status vehicle_status DEFAULT 'Available'
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


-- ==========================================
-- PHASE 2: THE ENGINE (Views, Triggers, Procs)
-- ==========================================

-- Security View for Dispatcher Dashboard
CREATE VIEW Active_Dashboard_View AS
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

-- Postgres Trigger Functions (Auto-Reserve & Release)
CREATE OR REPLACE FUNCTION trg_reserve_resources() RETURNS TRIGGER AS $$
BEGIN
    UPDATE Ambulances SET Current_Status = 'Dispatched' WHERE Vehicle_ID = NEW.Vehicle_ID;
    UPDATE Hospitals SET ICU_Beds = ICU_Beds - 1 WHERE Hospital_ID = NEW.Hospital_ID AND ICU_Beds > 0;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER After_Trip_Log_Insert
AFTER INSERT ON Trip_Logs FOR EACH ROW EXECUTE FUNCTION trg_reserve_resources();

CREATE OR REPLACE FUNCTION trg_release_resources() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.Status = 'Resolved' THEN
        UPDATE Ambulances SET Current_Status = 'Available' 
        WHERE Vehicle_ID = (SELECT Vehicle_ID FROM Trip_Logs WHERE Request_ID = NEW.Request_ID);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER After_Request_Resolved
AFTER UPDATE ON Emergency_Requests FOR EACH ROW EXECUTE FUNCTION trg_release_resources();

-- The Master Dispatch Algorithm
CREATE OR REPLACE FUNCTION fn_Automated_Dispatch(p_Request_ID INT, p_Dispatcher_ID INT) RETURNS TEXT AS $$
DECLARE
    v_Patient_Coords GEOMETRY; v_Severity severity_lvl; v_Ambulance INT; v_Hospital INT; v_Driver INT;
BEGIN
    -- Lock Request Row
    SELECT Pickup_Coords, Severity_Level INTO v_Patient_Coords, v_Severity
    FROM Emergency_Requests WHERE Request_ID = p_Request_ID FOR UPDATE;

    -- Find nearest available ambulance
    SELECT Vehicle_ID INTO v_Ambulance FROM Ambulances
    WHERE Current_Status = 'Available' AND (v_Severity NOT IN ('High', 'Critical') OR Equipment_Level = 'Advanced')
    LIMIT 1 FOR UPDATE;

    -- Find nearest capable hospital via PostGIS ST_Distance
    SELECT Hospital_ID INTO v_Hospital FROM Hospitals
    WHERE (v_Severity IN ('High', 'Critical') AND ICU_Beds > 0) OR (v_Severity IN ('Low', 'Medium') AND General_Beds > 0)
    ORDER BY ST_Distance(Location_Coords::geography, v_Patient_Coords::geography) ASC LIMIT 1 FOR UPDATE;

    -- Find on-duty driver
    SELECT Driver_ID INTO v_Driver FROM Drivers WHERE Shift_Status = 'On_Duty' LIMIT 1;

    -- Validate and Execute
    IF v_Ambulance IS NULL OR v_Hospital IS NULL OR v_Driver IS NULL THEN
        RETURN 'DISPATCH FAILED: Insufficient resources.';
    END IF;

    -- Note: We disable triggers temporarily here since we explicitly update status in the function if needed, 
    -- but since we rely on the INSERT trigger, we just insert the log.
    INSERT INTO Trip_Logs (Request_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
    VALUES (p_Request_ID, v_Ambulance, v_Driver, v_Hospital, p_Dispatcher_ID);

    UPDATE Emergency_Requests SET Status = 'Active' WHERE Request_ID = p_Request_ID;

    RETURN 'DISPATCH SUCCESS: Ambulance ' || v_Ambulance || ' routed to Hospital ' || v_Hospital;
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- PHASE 3: PERFORMANCE OPTIMIZATION
-- ==========================================

-- Spatial (GiST) Indexes for rapid map calculations
CREATE INDEX idx_hospitals_location ON Hospitals USING GIST (Location_Coords);
CREATE INDEX idx_requests_pickup ON Emergency_Requests USING GIST (Pickup_Coords);

-- B-Tree Indexes for fast lookups
CREATE INDEX idx_ambulances_status ON Ambulances(Current_Status);
CREATE INDEX idx_drivers_status ON Drivers(Shift_Status);
CREATE INDEX idx_req_status ON Emergency_Requests(Status);


-- ==========================================
-- PHASE 4: SEED DATA (DHAKA, BANGLADESH CONTEXT)
-- ==========================================
-- Note for accuracy: PostGIS uses Longitude (X) then Latitude (Y) format: POINT(Lon Lat)

-- 1. Insert Hospitals (DMC, Square, Evercare)
INSERT INTO Hospitals (Name, Location_Coords, General_Beds, ICU_Beds) VALUES 
('Dhaka Medical College', ST_SetSRID(ST_MakePoint(90.3976, 23.7250), 4326), 500, 20),
('Square Hospital Panthapath', ST_SetSRID(ST_MakePoint(90.3815, 23.7530), 4326), 250, 15),
('Evercare Hospital Bashundhara', ST_SetSRID(ST_MakePoint(90.4313, 23.8103), 4326), 300, 25);

-- 2. Insert Ambulances
INSERT INTO Ambulances (License_Plate, Equipment_Level, Current_Status) VALUES 
('DHA-11-9922', 'Advanced', 'Available'),
('DHA-11-8833', 'Basic', 'Available'),
('DHA-12-4455', 'Advanced', 'Available');

-- 3. Insert Drivers
INSERT INTO Drivers (Name, License_No, Shift_Status) VALUES 
('Rahim Uddin', 'BD-DL-99384', 'On_Duty'),
('Karim Mia', 'BD-DL-22839', 'On_Duty');

-- 4. Insert Dispatcher
INSERT INTO Dispatchers (Name, Shift_Time) VALUES 
('Admin Dispatcher 1', 'Day Shift (8AM - 8PM)');

-- 5. Insert Dummy Patients
INSERT INTO Patients (Name, Phone, Blood_Type) VALUES 
('Abdur Rahman', '01711000000', 'O+'),
('Nusrat Jahan', '01822000000', 'A-');

INSERT INTO Patient_Conditions (Patient_ID, Condition_Name) VALUES 
(1, 'Type 2 Diabetes'),
(1, 'Hypertension'),
(2, 'Asthma');

-- 6. Generate a Live Emergency Request (Critical trauma in Gulshan)
INSERT INTO Emergency_Requests (Patient_ID, Pickup_Coords, Severity_Level, Status) VALUES 
(1, ST_SetSRID(ST_MakePoint(90.4125, 23.7925), 4326), 'Critical', 'Pending');
