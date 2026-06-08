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

