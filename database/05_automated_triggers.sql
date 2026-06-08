CREATE FUNCTION fn_automated_dispatch(p_request_id integer, p_dispatcher_id integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
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
    SELECT Pickup_Coords, Severity_Level, Patient_ID INTO v_Patient_Coords, v_Severity, v_Patient_ID
    FROM Emergency_Requests WHERE Request_ID = p_Request_ID FOR UPDATE;

    SELECT Condition_Name INTO v_Condition FROM Patient_Conditions WHERE Patient_ID = v_Patient_ID LIMIT 1;

    SELECT Vehicle_ID, License_Plate INTO v_Ambulance, v_Ambulance_Plate FROM Ambulances
    WHERE Current_Status = 'Available' AND (v_Severity NOT IN ('High', 'Critical') OR Equipment_Level = 'Advanced')
    LIMIT 1 FOR UPDATE;

    WITH CapableHospitals AS (
        SELECT h.Hospital_ID, h.Name
        FROM Hospitals h
        LEFT JOIN Hospital_Specializations hs ON h.Hospital_ID = hs.Hospital_ID
        LEFT JOIN Specializations s ON hs.Spec_ID = s.Spec_ID
        WHERE 
            ((v_Severity IN ('High', 'Critical') AND h.ICU_Beds > 0) OR (v_Severity IN ('Low', 'Medium') AND h.General_Beds > 0))
            AND (v_Condition IS NULL OR s.Spec_Name ILIKE '%' || v_Condition || '%' OR s.Spec_Name IS NULL)
        ORDER BY 
            (s.Spec_Name ILIKE '%' || v_Condition || '%') DESC, -- Rank specialization matches higher
            ST_Distance(h.Location_Coords::geography, v_Patient_Coords::geography) ASC -- Then rank by distance
        LIMIT 1
    )
    SELECT Hospital_ID, Name INTO v_Hospital, v_Hospital_Name FROM Hospitals 
    WHERE Hospital_ID IN (SELECT Hospital_ID FROM CapableHospitals) FOR UPDATE;

    SELECT Driver_ID INTO v_Driver FROM Drivers WHERE Shift_Status = 'On_Duty' LIMIT 1 FOR UPDATE;

    IF v_Ambulance IS NULL OR v_Hospital IS NULL OR v_Driver IS NULL THEN
        RETURN 'DISPATCH FAILED: Insufficient resources available.';
    END IF;

    INSERT INTO Trip_Logs (Request_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
    VALUES (p_Request_ID, v_Ambulance, v_Driver, v_Hospital, p_Dispatcher_ID);

    UPDATE Emergency_Requests SET Status = 'Active' WHERE Request_ID = p_Request_ID;
    UPDATE Ambulances SET Current_Status = 'Dispatched' WHERE Vehicle_ID = v_Ambulance;

    INSERT INTO chat_messages (trip_id, sender, message_text)
    VALUES (
        (SELECT trip_id FROM trip_logs WHERE request_id = p_request_id),
        'System',
        'Mission Initialized. Unit ' || v_Ambulance_Plate || ' assigned to ' || v_Hospital_Name
    );

    RETURN 'DISPATCH SUCCESS: ' || v_Ambulance_Plate || ' assigned to ' || v_Hospital_Name;
END;
$$;

CREATE FUNCTION fn_automated_dispatch(p_request_id uuid, p_dispatcher_id integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
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
    SELECT Pickup_Coords, Severity_Level, Patient_ID INTO v_Patient_Coords, v_Severity, v_Patient_ID
    FROM Emergency_Requests WHERE Request_ID = p_Request_ID FOR UPDATE;

    SELECT Condition_Name INTO v_Condition FROM Patient_Conditions WHERE Patient_ID = v_Patient_ID LIMIT 1;

    SELECT Vehicle_ID, License_Plate INTO v_Ambulance, v_Ambulance_Plate FROM Ambulances
    WHERE Current_Status = 'Available' AND (v_Severity NOT IN ('High', 'Critical') OR Equipment_Level = 'Advanced')
    LIMIT 1 FOR UPDATE;

    WITH CapableHospitals AS (
        SELECT h.Hospital_ID, h.Name
        FROM Hospitals h
        LEFT JOIN Hospital_Specializations hs ON h.Hospital_ID = hs.Hospital_ID
        LEFT JOIN Specializations s ON hs.Spec_ID = s.Spec_ID
        WHERE 
            ((v_Severity IN ('High', 'Critical') AND h.ICU_Beds > 0) OR (v_Severity IN ('Low', 'Medium') AND h.General_Beds > 0))
            AND (v_Condition IS NULL OR s.Spec_Name ILIKE '%' || v_Condition || '%' OR s.Spec_Name IS NULL)
        ORDER BY 
            (s.Spec_Name ILIKE '%' || v_Condition || '%') DESC, -- Rank specialization matches higher
            ST_Distance(h.Location_Coords::geography, v_Patient_Coords::geography) ASC -- Then rank by distance
        LIMIT 1
    )
    SELECT Hospital_ID, Name INTO v_Hospital, v_Hospital_Name FROM Hospitals 
    WHERE Hospital_ID IN (SELECT Hospital_ID FROM CapableHospitals) FOR UPDATE;

    SELECT Driver_ID INTO v_Driver FROM Drivers WHERE Shift_Status = 'On_Duty' LIMIT 1 FOR UPDATE;

    IF v_Ambulance IS NULL OR v_Hospital IS NULL OR v_Driver IS NULL THEN
        RETURN 'DISPATCH FAILED: Insufficient resources available.';
    END IF;

    INSERT INTO Trip_Logs (Trip_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
    VALUES (p_Request_ID, v_Ambulance, v_Driver, v_Hospital, p_Dispatcher_ID);

    UPDATE Emergency_Requests SET Status = 'Active' WHERE Request_ID = p_Request_ID;
    UPDATE Ambulances SET Current_Status = 'Dispatched' WHERE Vehicle_ID = v_Ambulance;

    INSERT INTO chat_messages (trip_id, sender, message_text)
    VALUES (
        p_request_id,
        'System',
        'Mission Initialized. Unit ' || v_Ambulance_Plate || ' assigned to ' || v_Hospital_Name
    );

    RETURN 'DISPATCH SUCCESS: ' || v_Ambulance_Plate || ' assigned to ' || v_Hospital_Name;
END;
$$;

CREATE FUNCTION fn_automated_dispatch(p_request_id character varying, p_dispatcher_id integer, p_hospital_id integer DEFAULT NULL::integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
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
    SELECT Pickup_Coords, Severity_Level, Patient_ID INTO v_Patient_Coords, v_Severity, v_Patient_ID
    FROM Emergency_Requests WHERE Request_ID = p_Request_ID FOR UPDATE;

    SELECT Condition_Name INTO v_Condition FROM Patient_Conditions WHERE Patient_ID = v_Patient_ID LIMIT 1;

    SELECT mapped_spec INTO v_Specialization FROM (VALUES
        ('Heart Attack',      'Cardiology'),
        ('Heart Failure',     'Cardiology'),
        ('Stroke',            'Neurology'),
        ('Severe Trauma',     'Trauma Surgery'),
        ('Major Burn',        'Burn Unit'),
        ('Cardiac Arrest',    'Cardiology'),
        ('Brain Hemorrhage',  'Neurology'),
        ('Spinal Injury',     'Orthopedics'),
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
        ('Pregnancy',         'Obstetrics'),
        ('Pregnancy - 3rd Trimester', 'Obstetrics'),
        ('Bone Fracture',     'Orthopedics'),
        ('Appendicitis',      'Trauma Surgery'),
        ('Pneumonia',         'Cardiology'),
        ('Gallstones',        'Trauma Surgery'),
        ('Hernia',            'Trauma Surgery'),
        ('Minor Burn',        'Burn Unit'),
        ('Migraine',          'Neurology'),
        ('Anemia',            'Nephrology')
    ) AS condition_map(condition_name, mapped_spec)
    WHERE condition_map.condition_name = v_Condition
    LIMIT 1;

    SELECT Vehicle_ID, License_Plate INTO v_Ambulance, v_Ambulance_Plate FROM Ambulances
    WHERE Current_Status = 'Available' AND (v_Severity NOT IN ('High', 'Critical') OR Equipment_Level = 'Advanced')
    LIMIT 1 FOR UPDATE;

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

    SELECT Driver_ID INTO v_Driver FROM Drivers WHERE Shift_Status = 'On_Duty' LIMIT 1 FOR UPDATE;

    IF v_Ambulance IS NULL OR v_Hospital IS NULL OR v_Driver IS NULL THEN
        RETURN 'DISPATCH FAILED: Insufficient resources available.';
    END IF;

    INSERT INTO Trip_Logs (Trip_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
    VALUES (p_Request_ID, v_Ambulance, v_Driver, v_Hospital, p_Dispatcher_ID);

    UPDATE Emergency_Requests SET Status = 'Active' WHERE Request_ID = p_Request_ID;
    UPDATE Ambulances SET Current_Status = 'Dispatched' WHERE Vehicle_ID = v_Ambulance;

    INSERT INTO chat_messages (trip_id, sender, message_text)
    VALUES (
        p_request_id,
        'System',
        'Mission Initialized. Unit ' || v_Ambulance_Plate || ' assigned to ' || v_Hospital_Name || 
        CASE WHEN v_Specialization IS NOT NULL AND p_hospital_id IS NULL THEN ' (Matched: ' || v_Condition || ' → ' || v_Specialization || ')' ELSE '' END
    );

    RETURN 'DISPATCH SUCCESS: ' || v_Ambulance_Plate || ' assigned to ' || v_Hospital_Name;
END;
$$;

CREATE FUNCTION generate_emergency_id() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN 'NX-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
END;
$$;

CREATE FUNCTION trg_predict_severity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_Condition VARCHAR;
BEGIN
    IF NEW.Severity_Level != 'Critical' THEN
        SELECT Condition_Name INTO v_Condition FROM Patient_Conditions WHERE Patient_ID = NEW.Patient_ID LIMIT 1;
        
        IF v_Condition ILIKE '%Heart%' OR v_Condition ILIKE '%Stroke%' OR v_Condition ILIKE '%Asthma%' THEN
            NEW.Severity_Level := 'Critical';
        ELSIF v_Condition ILIKE '%Diabetes%' OR v_Condition ILIKE '%Hypertension%' THEN
            NEW.Severity_Level := 'High';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION trg_release_resources() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_Vehicle_ID INT;
    v_Hospital_ID INT;
    v_Trip_ID VARCHAR(20);
    v_Distance_KM NUMERIC;
    v_Base_Fee DECIMAL := 50.00;
    v_Per_KM_Fee DECIMAL := 5.00;
    v_Equipment_Fee DECIMAL := 0.00;
    v_Equipment_Level equipment_lvl;
    v_Hospital_Level hospital_type;
    v_Severity severity_lvl;
    v_Hospital_Coords GEOMETRY;
BEGIN
    IF NEW.Status = 'Resolved' OR NEW.Status = 'Cancelled' THEN
        SELECT tl.Trip_ID, tl.Vehicle_ID, tl.Hospital_ID, er.Severity_Level 
        INTO v_Trip_ID, v_Vehicle_ID, v_Hospital_ID, v_Severity
        FROM Trip_Logs tl
        JOIN Emergency_Requests er ON tl.Trip_ID = er.Request_ID
        WHERE tl.Trip_ID = NEW.Request_ID LIMIT 1;

        IF v_Severity = 'Critical' THEN
            UPDATE Hospitals SET ICU_Beds = ICU_Beds + 1 WHERE Hospital_ID = v_Hospital_ID;
        ELSE
            UPDATE Hospitals SET General_Beds = General_Beds + 1 WHERE Hospital_ID = v_Hospital_ID;
        END IF;

        UPDATE Ambulances 
                                WHEN Trips_Since_Maintenance >= 50 THEN 'Maintenance_Required'::vehicle_status 
                                ELSE 'Available'::vehicle_status 
                             END
        WHERE Vehicle_ID = v_Vehicle_ID
        RETURNING Equipment_Level INTO v_Equipment_Level;

        IF v_Trip_ID IS NOT NULL THEN
            SELECT Location_Coords INTO v_Hospital_Coords FROM Hospitals WHERE Hospital_ID = v_Hospital_ID;
            v_Distance_KM := COALESCE(ROUND(ST_Distance(v_Hospital_Coords::geography, NEW.Pickup_Coords::geography)::numeric / 1000, 2), 5.00); -- Default to 5km if error
            
            IF v_Equipment_Level = 'Advanced' THEN
                v_Equipment_Fee := 100.00;
            END IF;

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
$$;

CREATE FUNCTION trg_reserve_resources() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_Severity severity_lvl;
BEGIN
    SELECT Severity_Level INTO v_Severity FROM Emergency_Requests WHERE Request_ID = NEW.Trip_ID;

    UPDATE Ambulances 
        Trips_Since_Maintenance = Trips_Since_Maintenance + 1
    WHERE Vehicle_ID = NEW.Vehicle_ID;

    IF v_Severity = 'Critical' THEN
        UPDATE Hospitals SET ICU_Beds = ICU_Beds - 1 WHERE Hospital_ID = NEW.Hospital_ID AND ICU_Beds > 0;
    ELSE
        UPDATE Hospitals SET General_Beds = General_Beds - 1 WHERE Hospital_ID = NEW.Hospital_ID AND General_Beds > 0;
    END IF;

    RETURN NEW;
END;
$$;


-- Real-time view utilized by the Dispatcher portal to monitor all active emergencies
CREATE VIEW active_dashboard_view AS
 SELECT er.request_id,
    er.patient_id,
    p.name AS patient_name,
    p.blood_type,
    p.allergies,
    er.primary_specialization,
    st_x((er.pickup_coords)::geometry) AS patient_lon,
    st_y((er.pickup_coords)::geometry) AS patient_lat,
    er.severity_level,
    er.emergency_type,
    er.requested_for,
    er.timestamp_created,
    er.status AS request_status,
    a.license_plate AS assigned_ambulance,
    h.name AS destination_hospital,
    h.type AS hospital_type,
    st_x((a.current_location)::geometry) AS ambulance_lon,
    st_y((a.current_location)::geometry) AS ambulance_lat,
    tl.driver_id,
    d.name AS driver_name
   FROM (((((emergency_requests er
     JOIN patients p ON ((er.patient_id = p.patient_id)))
     LEFT JOIN trip_logs tl ON (((er.request_id)::text = (tl.trip_id)::text)))
     LEFT JOIN ambulances a ON ((tl.vehicle_id = a.vehicle_id)))
     LEFT JOIN hospitals h ON ((tl.hospital_id = h.hospital_id)))
     LEFT JOIN drivers d ON ((tl.driver_id = d.driver_id)))
  WHERE (er.status = ANY (ARRAY['Broadcast'::req_status, 'Pending'::req_status, 'Active'::req_status, 'En Route'::req_status, 'Picked Up'::req_status, 'Arrived'::req_status]));

CREATE TRIGGER after_request_resolved AFTER UPDATE ON emergency_requests FOR EACH ROW EXECUTE FUNCTION trg_release_resources();

CREATE TRIGGER after_trip_log_insert AFTER INSERT ON trip_logs FOR EACH ROW EXECUTE FUNCTION trg_reserve_resources();

CREATE TRIGGER before_request_insert BEFORE INSERT ON emergency_requests FOR EACH ROW EXECUTE FUNCTION trg_predict_severity();

GRANT ALL ON FUNCTION fn_automated_dispatch(p_request_id integer, p_dispatcher_id integer) TO anon;
GRANT ALL ON FUNCTION fn_automated_dispatch(p_request_id integer, p_dispatcher_id integer) TO authenticated;
GRANT ALL ON FUNCTION fn_automated_dispatch(p_request_id integer, p_dispatcher_id integer) TO service_role;

GRANT ALL ON FUNCTION fn_automated_dispatch(p_request_id uuid, p_dispatcher_id integer) TO anon;
GRANT ALL ON FUNCTION fn_automated_dispatch(p_request_id uuid, p_dispatcher_id integer) TO authenticated;
GRANT ALL ON FUNCTION fn_automated_dispatch(p_request_id uuid, p_dispatcher_id integer) TO service_role;

GRANT ALL ON FUNCTION fn_automated_dispatch(p_request_id character varying, p_dispatcher_id integer, p_hospital_id integer) TO anon;
GRANT ALL ON FUNCTION fn_automated_dispatch(p_request_id character varying, p_dispatcher_id integer, p_hospital_id integer) TO authenticated;
GRANT ALL ON FUNCTION fn_automated_dispatch(p_request_id character varying, p_dispatcher_id integer, p_hospital_id integer) TO service_role;

GRANT ALL ON FUNCTION generate_emergency_id() TO anon;
GRANT ALL ON FUNCTION generate_emergency_id() TO authenticated;
GRANT ALL ON FUNCTION generate_emergency_id() TO service_role;

GRANT ALL ON FUNCTION trg_predict_severity() TO anon;
GRANT ALL ON FUNCTION trg_predict_severity() TO authenticated;
GRANT ALL ON FUNCTION trg_predict_severity() TO service_role;

GRANT ALL ON FUNCTION trg_release_resources() TO anon;
GRANT ALL ON FUNCTION trg_release_resources() TO authenticated;
GRANT ALL ON FUNCTION trg_release_resources() TO service_role;

GRANT ALL ON FUNCTION trg_reserve_resources() TO anon;
GRANT ALL ON FUNCTION trg_reserve_resources() TO authenticated;
GRANT ALL ON FUNCTION trg_reserve_resources() TO service_role;
