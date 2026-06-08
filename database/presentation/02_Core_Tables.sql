-- 1. Core Tables
CREATE TABLE IF NOT EXISTS Patients (
    Patient_ID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(20) NOT NULL,
    Blood_Type VARCHAR(5),
    Address TEXT,
    Primary_Specialization VARCHAR(100)
);

ALTER TABLE Patients ADD COLUMN IF NOT EXISTS Allergies TEXT;

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

ALTER TABLE Ambulances ADD COLUMN IF NOT EXISTS Hub VARCHAR(100) DEFAULT 'Central Hub';
ALTER TABLE Ambulances ADD COLUMN IF NOT EXISTS Next_Service_Date DATE;
ALTER TABLE Ambulances ADD COLUMN IF NOT EXISTS Current_Location GEOMETRY(Point, 4326);

CREATE TABLE IF NOT EXISTS Drivers (
    Driver_ID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    License_No VARCHAR(50) UNIQUE NOT NULL,
    Shift_Status shift_status DEFAULT 'Off_Duty'
);

ALTER TABLE Drivers ADD COLUMN IF NOT EXISTS Phone VARCHAR(20) DEFAULT '+8801711223344';

CREATE TABLE IF NOT EXISTS Dispatchers (
    Dispatcher_ID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Shift_Time VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS Staff_Users (
    User_ID SERIAL PRIMARY KEY,
    Username VARCHAR(50) UNIQUE NOT NULL,
    Password_Hash TEXT NOT NULL,
    Role VARCHAR(20) NOT NULL CHECK (Role IN ('Admin', 'Dispatcher')),
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE Staff_Users ADD COLUMN IF NOT EXISTS Blocked BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS Emergency_Requests (
    Request_ID VARCHAR(20) PRIMARY KEY DEFAULT generate_emergency_id(),
    Patient_ID INT NOT NULL REFERENCES Patients(Patient_ID),
    Pickup_Coords GEOMETRY(Point, 4326) NOT NULL,
    Severity_Level severity_lvl NOT NULL,
    Timestamp_Created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Status req_status DEFAULT 'Pending'
);

ALTER TABLE Emergency_Requests ADD COLUMN IF NOT EXISTS Emergency_Type VARCHAR(100) DEFAULT 'General';
ALTER TABLE Emergency_Requests ADD COLUMN IF NOT EXISTS Requested_For VARCHAR(100) DEFAULT 'Self';

CREATE TABLE IF NOT EXISTS Pricing_Config (
    Config_ID INT PRIMARY KEY DEFAULT 1,
    Base_Fare DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    Per_KM_Charge DECIMAL(10,2) NOT NULL DEFAULT 25.00,
    Night_Multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.35,
    Critical_Surcharge DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Pricing_Config (Config_ID)
VALUES (1)
ON CONFLICT (Config_ID) DO NOTHING;

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

