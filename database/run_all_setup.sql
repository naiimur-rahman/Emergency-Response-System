-- ==============================================================================
-- Druto Sheba (দ্রুত সেবা) - Emergency Response System
-- Complete Database Initialization Script
-- Execution Order:
--   1. Enable PostGIS Extension
--   2. Core Schema & Enums (01_core_schema.sql)
--   3. Driver Portal Schema (02_driver_portal.sql)
--   4. Dispatcher Portal Schema (03_dispatcher_portal.sql)
--   5. Billing Schema (04_billing.sql)
--   6. Automated Dispatch Triggers (05_automated_triggers.sql)
--   7. Initial Seed Data (06_seed_data.sql)
--   8. Doctor Assigning System (07_doctor_assigning.sql)
-- ==============================================================================

-- 1. Enable Spatial Database Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Execute SQL files from database folder in order:
\i database/01_core_schema.sql
\i database/02_driver_portal.sql
\i database/03_dispatcher_portal.sql
\i database/04_billing.sql
\i database/05_automated_triggers.sql
\i database/06_seed_data.sql
\i database/07_doctor_assigning.sql

-- ==============================================================================
-- Demo & Operational Verification Queries
-- ==============================================================================

-- Query 1: Comprehensive Emergency Response Trip Logs (Complex 5-Table JOIN)
SELECT 
    er.request_id,
    p.name AS patient_name,
    h.name AS assigned_hospital,
    a.license_plate AS ambulance_plate,
    d.name AS driver_name,
    er.severity_level,
    er.status AS emergency_status
FROM trip_logs tl
JOIN emergency_requests er ON tl.trip_id::text = er.request_id::text
JOIN patients p ON er.patient_id = p.patient_id
JOIN hospitals h ON tl.hospital_id = h.hospital_id
JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
JOIN drivers d ON tl.driver_id = d.driver_id;

-- Query 2: High-Risk Critical Patients (Subquery + Aggregation HAVING)
SELECT name, phone 
FROM patients
WHERE patient_id IN (
    SELECT patient_id 
    FROM emergency_requests 
    WHERE severity_level = 'Critical' 
    GROUP BY patient_id 
    HAVING COUNT(*) > 1
);

-- Query 3: Real-Time Analytics Dashboard Summary (Materialized View)
SELECT * FROM emergency_analytics_mv;

-- Query 4: Resource Availability Overview (UNION ALL + Conditional Logic)
SELECT 
    'Ambulances' AS resource_type,
    current_status::text AS status_or_type, 
    COUNT(vehicle_id) AS total_count
FROM ambulances
GROUP BY current_status
UNION ALL
SELECT 
    'Doctors' AS resource_type,
    CASE WHEN is_available THEN 'Available' ELSE 'Busy' END AS status_or_type,
    COUNT(doctor_id) AS total_count
FROM doctors
GROUP BY is_available;
