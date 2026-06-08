-- ==========================================
SET TIMEZONE='Asia/Dhaka';

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

ALTER TYPE equipment_lvl ADD VALUE IF NOT EXISTS 'Basic Life Support';
ALTER TYPE equipment_lvl ADD VALUE IF NOT EXISTS 'Advanced Life Support';
ALTER TYPE equipment_lvl ADD VALUE IF NOT EXISTS 'ICU Support';

DO $$ BEGIN
    CREATE TYPE vehicle_status AS ENUM ('Available', 'Dispatched', 'Maintenance', 'Maintenance_Required');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE shift_status AS ENUM ('On_Duty', 'Off_Duty');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE shift_status ADD VALUE IF NOT EXISTS 'Available';
ALTER TYPE shift_status ADD VALUE IF NOT EXISTS 'Dispatched';
ALTER TYPE shift_status ADD VALUE IF NOT EXISTS 'On_Trip';
ALTER TYPE shift_status ADD VALUE IF NOT EXISTS 'Offline';

DO $$ BEGIN
    CREATE TYPE severity_lvl AS ENUM ('Low', 'Medium', 'High', 'Critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE req_status AS ENUM ('Pending', 'Broadcast', 'Active', 'En Route', 'Picked Up', 'Arrived', 'Resolved', 'Cancelled', 'Admitted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE hospital_type AS ENUM ('Government', 'Private');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

