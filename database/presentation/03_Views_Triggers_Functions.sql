-- 2. Views & Triggers
CREATE OR REPLACE VIEW Active_Dashboard_View AS
SELECT 
    er.Request_ID, er.Patient_ID, p.Name AS Patient_Name, p.Blood_Type, p.Allergies,
    p.Primary_Specialization,
    ST_X(er.Pickup_Coords::geometry) AS Patient_Lon,
    ST_Y(er.Pickup_Coords::geometry) AS Patient_Lat,
    er.Severity_Level, er.Emergency_Type, er.Requested_For, er.Timestamp_Created,
    er.Status AS Request_Status, a.License_Plate AS Assigned_Ambulance,
    h.Name AS Destination_Hospital, h.Type AS Hospital_Type,
    ST_X(a.Current_Location::geometry) AS Ambulance_Lon,
    ST_Y(a.Current_Location::geometry) AS Ambulance_Lat,
    tl.Driver_ID AS Driver_ID,
    d.Name AS Driver_Name
FROM Emergency_Requests er
JOIN Patients p ON er.Patient_ID = p.Patient_ID
LEFT JOIN Trip_Logs tl ON er.Request_ID = tl.Trip_ID
LEFT JOIN Ambulances a ON tl.Vehicle_ID = a.Vehicle_ID
LEFT JOIN Hospitals h ON tl.Hospital_ID = h.Hospital_ID
LEFT JOIN Drivers d ON tl.Driver_ID = d.Driver_ID
WHERE er.Status IN ('Broadcast', 'Pending', 'Active', 'En Route', 'Picked Up', 'Arrived');

-- Severity Predictor (Database side)
CREATE OR REPLACE FUNCTION trg_predict_severity() RETURNS TRIGGER AS $$
DECLARE
    v_Condition VARCHAR;
BEGIN
    -- Only evaluate if severity isn't already Critical
    IF NEW.Severity_Level != 'Critical' THEN
        -- Get patient's primary condition
        SELECT Condition_Name INTO v_Condition FROM Patient_Conditions WHERE Patient_ID = NEW.Patient_ID LIMIT 1;
        
        -- Override severity based on high-risk keywords
        IF v_Condition ILIKE '%Heart%' OR v_Condition ILIKE '%Stroke%' OR v_Condition ILIKE '%Asthma%' THEN
            NEW.Severity_Level := 'Critical';
        ELSIF v_Condition ILIKE '%Diabetes%' OR v_Condition ILIKE '%Hypertension%' THEN
            NEW.Severity_Level := 'High';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS Before_Request_Insert ON Emergency_Requests;
CREATE TRIGGER Before_Request_Insert
BEFORE INSERT ON Emergency_Requests FOR EACH ROW EXECUTE FUNCTION trg_predict_severity();

-- Triggers for Auto-Dispatch Logic
CREATE OR REPLACE FUNCTION trg_reserve_resources() RETURNS TRIGGER AS $$
DECLARE
    v_Severity severity_lvl;
BEGIN
    -- Get severity from the linked request
    SELECT Severity_Level INTO v_Severity FROM Emergency_Requests WHERE Request_ID = NEW.Trip_ID;

    UPDATE Ambulances 
    SET Current_Status = 'Dispatched',
        Trips_Since_Maintenance = Trips_Since_Maintenance + 1
    WHERE Vehicle_ID = NEW.Vehicle_ID;

    -- Reserve bed based on severity
    IF v_Severity = 'Critical' THEN
        UPDATE Hospitals SET ICU_Beds = ICU_Beds - 1 WHERE Hospital_ID = NEW.Hospital_ID AND ICU_Beds > 0;
    ELSE
        UPDATE Hospitals SET General_Beds = General_Beds - 1 WHERE Hospital_ID = NEW.Hospital_ID AND General_Beds > 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS After_Trip_Log_Insert ON Trip_Logs;
CREATE TRIGGER After_Trip_Log_Insert
AFTER INSERT ON Trip_Logs FOR EACH ROW EXECUTE FUNCTION trg_reserve_resources();

CREATE OR REPLACE FUNCTION trg_release_resources() RETURNS TRIGGER AS $$
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
        -- Get Trip Details
        SELECT tl.Trip_ID, tl.Vehicle_ID, tl.Hospital_ID, er.Severity_Level 
        INTO v_Trip_ID, v_Vehicle_ID, v_Hospital_ID, v_Severity
        FROM Trip_Logs tl
        JOIN Emergency_Requests er ON tl.Trip_ID = er.Request_ID
        WHERE tl.Trip_ID = NEW.Request_ID LIMIT 1;

        -- Release Bed
        IF v_Severity = 'Critical' THEN
            UPDATE Hospitals SET ICU_Beds = ICU_Beds + 1 WHERE Hospital_ID = v_Hospital_ID;
        ELSE
            UPDATE Hospitals SET General_Beds = General_Beds + 1 WHERE Hospital_ID = v_Hospital_ID;
        END IF;

        -- 1. Automated Predictive Maintenance Flagging
        UPDATE Ambulances 
        SET Current_Status = CASE 
                                WHEN Trips_Since_Maintenance >= 50 THEN 'Maintenance_Required'::vehicle_status 
                                ELSE 'Available'::vehicle_status 
                             END
        WHERE Vehicle_ID = v_Vehicle_ID
        RETURNING Equipment_Level INTO v_Equipment_Level;

        -- 2. Automated Billing Generation
        IF v_Trip_ID IS NOT NULL THEN
            -- Calculate Distance
            SELECT Location_Coords INTO v_Hospital_Coords FROM Hospitals WHERE Hospital_ID = v_Hospital_ID;
            v_Distance_KM := COALESCE(ROUND(ST_Distance(v_Hospital_Coords::geography, NEW.Pickup_Coords::geography)::numeric / 1000, 2), 5.00); -- Default to 5km if error
            
            -- Determine Equipment Fee
            IF v_Equipment_Level = 'Advanced' THEN
                v_Equipment_Fee := 100.00;
            END IF;

            -- Generate Bill
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS After_Request_Resolved ON Emergency_Requests;
CREATE TRIGGER After_Request_Resolved
AFTER UPDATE ON Emergency_Requests FOR EACH ROW EXECUTE FUNCTION trg_release_resources();

-- Automated Dispatch Algorithm
CREATE OR REPLACE FUNCTION fn_Automated_Dispatch(p_Request_ID VARCHAR(20), p_Dispatcher_ID INT) RETURNS TEXT AS $$
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

    INSERT INTO Trip_Logs (Trip_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
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
-- DRUTO SHEBA: SCHEMA EXPANSION (Advanced Features)
-- ==========================================

