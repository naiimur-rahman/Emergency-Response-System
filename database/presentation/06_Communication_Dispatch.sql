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
-- This function matches patients to the best possible resources.
-- Includes support for manual hospital override and specialization mapping.
DROP FUNCTION IF EXISTS public.fn_automated_dispatch(varchar, integer);
CREATE OR REPLACE FUNCTION public.fn_automated_dispatch(p_request_id varchar(20), p_dispatcher_id integer, p_hospital_id integer DEFAULT NULL)
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
    v_Specialization VARCHAR;
    v_Hospital_Name TEXT; 
    v_Ambulance_Plate TEXT;
BEGIN
    -- STEP 1: Identify Patient and Condition
    SELECT Pickup_Coords, Severity_Level, Patient_ID INTO v_Patient_Coords, v_Severity, v_Patient_ID
    FROM Emergency_Requests WHERE Request_ID = p_Request_ID FOR UPDATE;

    -- Get the patient's primary condition
    SELECT Condition_Name INTO v_Condition FROM Patient_Conditions WHERE Patient_ID = v_Patient_ID LIMIT 1;

    -- STEP 1b: Map condition to hospital specialization
    SELECT mapped_spec INTO v_Specialization FROM (VALUES
        -- Critical
        ('Heart Attack',      'Cardiology'),
        ('Heart Failure',     'Cardiology'),
        ('Stroke',            'Neurology'),
        ('Severe Trauma',     'Trauma Surgery'),
        ('Major Burn',        'Burn Unit'),
        ('Cardiac Arrest',    'Cardiology'),
        ('Brain Hemorrhage',  'Neurology'),
        ('Spinal Injury',     'Orthopedics'),
        -- Chronic
        ('Type 2 Diabetes',   'Nephrology'),
        ('Type 1 Diabetes',   'Nephrology'),
        ('Hypertension',      'Cardiology'),
        ('Asthma',            'Cardiology'),
        ('Kidney Disease',    'Nephrology'),
        ('Epilepsy',          'Neurology'),
        ('COPD',              'Cardiology'),
        ('Liver Disease',     'Nephrology'),
        ('Cancer',            'Oncology'),
        ('Leukemia',          'Oncology'),
        ('Sickle Cell Disease','Nephrology'),
        -- Moderate
        ('Pregnancy',         'Obstetrics'),
        ('Pregnancy - 3rd Trimester', 'Obstetrics'),
        ('Bone Fracture',     'Orthopedics'),
        ('Appendicitis',      'Trauma Surgery'),
        ('Pneumonia',         'Cardiology'),
        ('Gallstones',        'Trauma Surgery'),
        ('Hernia',            'Trauma Surgery'),
        -- Minor
        ('Minor Burn',        'Burn Unit'),
        ('Migraine',          'Neurology'),
        ('Anemia',            'Nephrology')
    ) AS condition_map(condition_name, mapped_spec)
    WHERE condition_map.condition_name = v_Condition
    LIMIT 1;

    -- STEP 2: Find nearest available ambulance
    SELECT Vehicle_ID, License_Plate INTO v_Ambulance, v_Ambulance_Plate FROM Ambulances
    WHERE Current_Status = 'Available' AND (v_Severity NOT IN ('High', 'Critical') OR Equipment_Level = 'Advanced')
    LIMIT 1 FOR UPDATE;

    -- STEP 3: Find nearest capable hospital (or use manual override)
    IF p_hospital_id IS NOT NULL THEN
        SELECT Hospital_ID, Name INTO v_Hospital, v_Hospital_Name FROM Hospitals WHERE Hospital_ID = p_hospital_id FOR UPDATE;
    ELSE
        WITH CapableHospitals AS (
            SELECT h.Hospital_ID, h.Name,
                CASE WHEN s.Spec_Name = v_Specialization THEN 1 ELSE 0 END AS spec_match
            FROM Hospitals h
            LEFT JOIN Hospital_Specializations hs ON h.Hospital_ID = hs.Hospital_ID
            LEFT JOIN Specializations s ON hs.Spec_ID = s.Spec_ID
            WHERE 
                ((v_Severity IN ('High', 'Critical') AND h.ICU_Beds > 0) OR (v_Severity IN ('Low', 'Medium') AND h.General_Beds > 0))
            ORDER BY 
                spec_match DESC,
                ST_Distance(h.Location_Coords::geography, v_Patient_Coords::geography) ASC
            LIMIT 1
        )
        SELECT Hospital_ID, Name INTO v_Hospital, v_Hospital_Name FROM Hospitals 
        WHERE Hospital_ID IN (SELECT Hospital_ID FROM CapableHospitals) FOR UPDATE;
    END IF;

    -- STEP 4: Find on-duty driver
    SELECT Driver_ID INTO v_Driver FROM Drivers WHERE Shift_Status = 'On_Duty' LIMIT 1 FOR UPDATE;

    -- VALIDATION
    IF v_Ambulance IS NULL OR v_Hospital IS NULL OR v_Driver IS NULL THEN
        RETURN 'DISPATCH FAILED: Insufficient resources available.';
    END IF;

    -- STEP 5: Create trip and update statuses
    INSERT INTO Trip_Logs (Trip_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
    VALUES (p_Request_ID, v_Ambulance, v_Driver, v_Hospital, p_Dispatcher_ID);

    UPDATE Emergency_Requests SET Status = 'Active' WHERE Request_ID = p_Request_ID;
    UPDATE Ambulances SET Current_Status = 'Dispatched' WHERE Vehicle_ID = v_Ambulance;

    -- STEP 6: Initialize Communication
    INSERT INTO chat_messages (trip_id, sender, message_text)
    VALUES (
        p_request_id,
        'System',
        'Mission Initialized. Unit ' || v_Ambulance_Plate || ' assigned to ' || v_Hospital_Name || 
        CASE WHEN v_Specialization IS NOT NULL AND p_hospital_id IS NULL THEN ' (Matched: ' || v_Condition || ' → ' || v_Specialization || ')' ELSE '' END
    );

    RETURN 'DISPATCH SUCCESS: ' || v_Ambulance_Plate || ' assigned to ' || v_Hospital_Name;
END;
$function$;
