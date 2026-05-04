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
