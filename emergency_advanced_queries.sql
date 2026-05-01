-- ==========================================
-- EMERGENCY RESPONSE SYSTEM: ADVANCED QUERY SHOWCASE
-- For UIU CSE DBMS Project Show
-- ==========================================


-- ============================================================
-- Q1: WINDOW FUNCTIONS — Rank hospitals by distance to patient
-- ============================================================
-- Uses: RANK(), OVER(), PostGIS ST_Distance, CTE
WITH Patient_Location AS (
    SELECT Request_ID, Pickup_Coords, Severity_Level
    FROM Emergency_Requests
    WHERE Status = 'Pending' AND Request_ID = 1
)
SELECT 
    h.Hospital_ID,
    h.Name AS Hospital_Name,
    h.ICU_Beds,
    h.General_Beds,
    ROUND(ST_Distance(h.Location_Coords::geography, pl.Pickup_Coords::geography)::numeric, 2) AS Distance_Meters,
    RANK() OVER (ORDER BY ST_Distance(h.Location_Coords::geography, pl.Pickup_Coords::geography)) AS Distance_Rank,
    DENSE_RANK() OVER (ORDER BY h.ICU_Beds DESC) AS ICU_Capacity_Rank
FROM Hospitals h
CROSS JOIN Patient_Location pl
WHERE h.ICU_Beds > 0
ORDER BY Distance_Rank;


-- ============================================================
-- Q2: CTE + RECURSIVE — Driver certification chain hierarchy
-- ============================================================
-- Uses: CTE, CASE, aggregate, STRING_AGG
WITH Driver_Profile AS (
    SELECT 
        d.Driver_ID,
        d.Name,
        d.Shift_Status,
        COUNT(dc.Cert_ID) AS Total_Certifications,
        COUNT(dc.Cert_ID) FILTER (WHERE dc.Expiry_Date >= CURRENT_DATE OR dc.Expiry_Date IS NULL) AS Active_Certs,
        COUNT(dc.Cert_ID) FILTER (WHERE dc.Expiry_Date < CURRENT_DATE) AS Expired_Certs,
        STRING_AGG(dc.Certification_Name, ', ' ORDER BY dc.Date_Issued DESC) AS Cert_List,
        CASE 
            WHEN COUNT(dc.Cert_ID) FILTER (WHERE dc.Certification_Name LIKE '%Advanced%') > 0 THEN 'ALS Qualified'
            WHEN COUNT(dc.Cert_ID) FILTER (WHERE dc.Certification_Name LIKE '%Basic%') > 0 THEN 'BLS Qualified'
            ELSE 'Unqualified'
        END AS Qualification_Level
    FROM Drivers d
    LEFT JOIN Driver_Certifications dc ON d.Driver_ID = dc.Driver_ID
    GROUP BY d.Driver_ID, d.Name, d.Shift_Status
)
SELECT *, 
       NTILE(3) OVER (ORDER BY Total_Certifications DESC) AS Skill_Tier
FROM Driver_Profile;


-- ============================================================
-- Q3: CORRELATED SUBQUERY — Patients with conditions at risk
-- ============================================================
-- Uses: EXISTS, correlated subquery, lateral join concept
SELECT 
    p.Patient_ID,
    p.Name,
    p.Blood_Type,
    (SELECT COUNT(*) FROM Patient_Conditions pc WHERE pc.Patient_ID = p.Patient_ID) AS Condition_Count,
    (SELECT STRING_AGG(pc.Condition_Name, ', ') FROM Patient_Conditions pc WHERE pc.Patient_ID = p.Patient_ID) AS Conditions,
    (SELECT COUNT(*) FROM Emergency_Requests er WHERE er.Patient_ID = p.Patient_ID) AS Total_Emergencies,
    (SELECT Contact_Name || ' (' || Phone || ')' 
     FROM Patient_Emergency_Contacts pec 
     WHERE pec.Patient_ID = p.Patient_ID 
     ORDER BY Contact_ID LIMIT 1) AS Primary_Contact
FROM Patients p
WHERE EXISTS (
    SELECT 1 FROM Patient_Conditions pc 
    WHERE pc.Patient_ID = p.Patient_ID 
    AND pc.Condition_Name IN ('Hypertension', 'Type 2 Diabetes', 'Epilepsy', 'Asthma')
)
ORDER BY (SELECT COUNT(*) FROM Patient_Conditions pc WHERE pc.Patient_ID = p.Patient_ID) DESC;


-- ============================================================
-- Q4: GROUPING SETS + ROLLUP — Fleet analytics multi-dimension
-- ============================================================
-- Uses: GROUPING SETS, ROLLUP, COALESCE, aggregate
SELECT 
    COALESCE(a.Equipment_Level::TEXT, '=== ALL LEVELS ===') AS Equipment,
    COALESCE(a.Current_Status::TEXT, '=== ALL STATUSES ===') AS Status,
    COUNT(*) AS Vehicle_Count,
    COUNT(*) FILTER (WHERE a.Current_Status = 'Available') AS Available,
    COUNT(*) FILTER (WHERE a.Current_Status = 'Dispatched') AS Dispatched
FROM Ambulances a
GROUP BY ROLLUP (a.Equipment_Level, a.Current_Status)
ORDER BY GROUPING(a.Equipment_Level), GROUPING(a.Current_Status);


-- ============================================================
-- Q5: WINDOW + LAG/LEAD — Emergency request time gap analysis
-- ============================================================
-- Uses: LAG(), LEAD(), EXTRACT, window frame
SELECT 
    Request_ID,
    Patient_ID,
    Severity_Level,
    Status,
    Timestamp_Created,
    LAG(Timestamp_Created) OVER (ORDER BY Timestamp_Created) AS Previous_Request_Time,
    LEAD(Timestamp_Created) OVER (ORDER BY Timestamp_Created) AS Next_Request_Time,
    EXTRACT(EPOCH FROM (Timestamp_Created - LAG(Timestamp_Created) OVER (ORDER BY Timestamp_Created))) / 60.0 AS Minutes_Since_Previous,
    ROW_NUMBER() OVER (ORDER BY Timestamp_Created) AS Sequence_Num,
    COUNT(*) OVER () AS Total_Requests,
    SUM(CASE WHEN Severity_Level IN ('High', 'Critical') THEN 1 ELSE 0 END) OVER (
        ORDER BY Timestamp_Created 
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS Running_Critical_Count
FROM Emergency_Requests
ORDER BY Timestamp_Created;


-- ============================================================
-- Q6: ADVANCED JOIN — Hospital capability matrix with specs
-- ============================================================
-- Uses: LEFT JOIN, RIGHT JOIN, FULL OUTER, CROSSTAB pattern with FILTER
SELECT 
    h.Name AS Hospital,
    h.General_Beds,
    h.ICU_Beds,
    COUNT(DISTINCT hs.Spec_ID) AS Specialization_Count,
    SUM(hs.Specialist_Count) AS Total_Specialists,
    MAX(hs.Specialist_Count) AS Max_In_One_Specialty,
    STRING_AGG(s.Spec_Name, ', ' ORDER BY hs.Specialist_Count DESC) AS Specializations,
    CASE 
        WHEN COUNT(DISTINCT hs.Spec_ID) >= 6 THEN 'Tier 1 - Comprehensive'
        WHEN COUNT(DISTINCT hs.Spec_ID) >= 4 THEN 'Tier 2 - Multi-specialty'
        ELSE 'Tier 3 - Basic'
    END AS Hospital_Tier,
    ROUND(
        ST_Distance(
            h.Location_Coords::geography, 
            ST_SetSRID(ST_MakePoint(90.4125, 23.7925), 4326)::geography
        )::numeric / 1000, 2
    ) AS Distance_From_Gulshan_KM
FROM Hospitals h
LEFT JOIN Hospital_Specializations hs ON h.Hospital_ID = hs.Hospital_ID
LEFT JOIN Specializations s ON hs.Spec_ID = s.Spec_ID
GROUP BY h.Hospital_ID, h.Name, h.General_Beds, h.ICU_Beds, h.Location_Coords
ORDER BY Specialization_Count DESC;


-- ============================================================
-- Q7: MAINTENANCE COST ANALYSIS — Per vehicle with running totals
-- ============================================================
-- Uses: SUM OVER, PARTITION BY, window frame, date functions
SELECT 
    a.License_Plate,
    a.Equipment_Level,
    ml.Maintenance_Type,
    ml.Cost,
    ml.Date_Started,
    SUM(ml.Cost) OVER (PARTITION BY ml.Vehicle_ID ORDER BY ml.Date_Started) AS Running_Total_Cost,
    AVG(ml.Cost) OVER (PARTITION BY ml.Vehicle_ID) AS Avg_Cost_Per_Service,
    RANK() OVER (PARTITION BY ml.Vehicle_ID ORDER BY ml.Cost DESC) AS Cost_Rank,
    ml.Cost - LAG(ml.Cost) OVER (PARTITION BY ml.Vehicle_ID ORDER BY ml.Date_Started) AS Cost_Change_From_Previous,
    SUM(ml.Cost) OVER () AS Fleet_Total_Maintenance_Cost,
    ROUND(ml.Cost / SUM(ml.Cost) OVER () * 100, 2) AS Percentage_Of_Total
FROM Maintenance_Logs ml
JOIN Ambulances a ON ml.Vehicle_ID = a.Vehicle_ID
ORDER BY a.License_Plate, ml.Date_Started;


-- ============================================================
-- Q8: ZONE-BASED DISPATCH ANALYSIS using PostGIS containment
-- ============================================================
-- Uses: ST_Contains, spatial join, LATERAL, aggregate
SELECT 
    dz.Zone_Name,
    dz.Priority_Level,
    COUNT(er.Request_ID) AS Emergencies_In_Zone,
    COUNT(er.Request_ID) FILTER (WHERE er.Severity_Level IN ('High', 'Critical')) AS Critical_In_Zone,
    COUNT(er.Request_ID) FILTER (WHERE er.Status = 'Pending') AS Pending_In_Zone,
    ROUND(
        COUNT(er.Request_ID) * 100.0 / NULLIF((SELECT COUNT(*) FROM Emergency_Requests), 0), 1
    ) AS Zone_Emergency_Percentage
FROM Dispatch_Zones dz
LEFT JOIN Emergency_Requests er 
    ON ST_Contains(dz.Zone_Boundary, er.Pickup_Coords)
GROUP BY dz.Zone_ID, dz.Zone_Name, dz.Priority_Level
ORDER BY Emergencies_In_Zone DESC;


-- ============================================================
-- Q9: INVENTORY EXPIRY ALERT — Window + CASE + date arithmetic
-- ============================================================
-- Uses: CASE, DATE arithmetic, PARTITION BY, FIRST_VALUE, percentile
SELECT 
    a.License_Plate,
    vi.Item_Name,
    vi.Quantity,
    vi.Expiry_Date,
    CASE 
        WHEN vi.Expiry_Date IS NULL THEN 'Non-perishable'
        WHEN vi.Expiry_Date < CURRENT_DATE THEN '🔴 EXPIRED'
        WHEN vi.Expiry_Date < CURRENT_DATE + INTERVAL '60 days' THEN '🟡 EXPIRING SOON'
        ELSE '🟢 OK'
    END AS Expiry_Status,
    vi.Expiry_Date - CURRENT_DATE AS Days_Until_Expiry,
    SUM(vi.Quantity) OVER (PARTITION BY vi.Vehicle_ID) AS Total_Items_In_Vehicle,
    FIRST_VALUE(vi.Item_Name) OVER (
        PARTITION BY vi.Vehicle_ID 
        ORDER BY vi.Expiry_Date ASC NULLS LAST
    ) AS Most_Urgent_Item,
    PERCENT_RANK() OVER (ORDER BY vi.Quantity) AS Quantity_Percentile
FROM Vehicle_Inventory vi
JOIN Ambulances a ON vi.Vehicle_ID = a.Vehicle_ID
ORDER BY vi.Expiry_Date ASC NULLS LAST;


-- ============================================================
-- Q10: FULL AUDIT TRAIL — JSONB querying with path operators
-- ============================================================
-- Uses: JSONB operators (->>, ->, @>), JSONB_PRETTY, conditional
SELECT 
    al.Audit_ID,
    al.Table_Name,
    al.Operation,
    al.Changed_By,
    al.Changed_At,
    al.New_Values->>'request_id' AS Request_ID,
    al.New_Values->>'severity_level' AS Severity,
    al.New_Values->>'status' AS New_Status,
    al.Old_Values->>'status' AS Old_Status,
    CASE 
        WHEN al.Operation = 'UPDATE' AND (al.Old_Values->>'status') IS DISTINCT FROM (al.New_Values->>'status')
        THEN (al.Old_Values->>'status')::TEXT || ' → ' || (al.New_Values->>'status')::TEXT
        ELSE al.Operation
    END AS Change_Summary
FROM Audit_Log al
WHERE al.Table_Name = 'Emergency_Requests'
ORDER BY al.Changed_At DESC;


-- ============================================================
-- Q11: MULTI-TABLE DASHBOARD SUMMARY — Complex aggregate CTE
-- ============================================================
WITH fleet_stats AS (
    SELECT 
        COUNT(*) AS total_vehicles,
        COUNT(*) FILTER (WHERE Current_Status = 'Available') AS available,
        COUNT(*) FILTER (WHERE Current_Status = 'Dispatched') AS dispatched,
        COUNT(*) FILTER (WHERE Current_Status = 'Maintenance') AS in_maintenance
    FROM Ambulances
),
hospital_stats AS (
    SELECT 
        COUNT(*) AS total_hospitals,
        SUM(General_Beds) AS total_general,
        SUM(ICU_Beds) AS total_icu,
        MIN(ICU_Beds) AS min_icu,
        MAX(ICU_Beds) AS max_icu,
        ROUND(AVG(ICU_Beds), 1) AS avg_icu
    FROM Hospitals
),
emergency_stats AS (
    SELECT 
        COUNT(*) AS total_requests,
        COUNT(*) FILTER (WHERE Status = 'Pending') AS pending,
        COUNT(*) FILTER (WHERE Status = 'Active') AS active,
        COUNT(*) FILTER (WHERE Status = 'Resolved') AS resolved,
        COUNT(*) FILTER (WHERE Severity_Level = 'Critical') AS critical_total,
        MIN(Timestamp_Created) AS first_request,
        MAX(Timestamp_Created) AS latest_request
    FROM Emergency_Requests
),
driver_stats AS (
    SELECT 
        COUNT(*) AS total_drivers,
        COUNT(*) FILTER (WHERE Shift_Status = 'On_Duty') AS on_duty,
        (SELECT COUNT(DISTINCT Driver_ID) FROM Driver_Certifications WHERE Expiry_Date >= CURRENT_DATE) AS certified_drivers
    FROM Drivers
),
maintenance_stats AS (
    SELECT 
        COUNT(*) AS total_services,
        SUM(Cost) AS total_cost,
        ROUND(AVG(Cost), 2) AS avg_cost
    FROM Maintenance_Logs
)
SELECT 
    f.total_vehicles, f.available, f.dispatched, f.in_maintenance,
    h.total_hospitals, h.total_general, h.total_icu, h.avg_icu,
    e.total_requests, e.pending, e.active, e.resolved, e.critical_total,
    d.total_drivers, d.on_duty, d.certified_drivers,
    m.total_services, m.total_cost, m.avg_cost
FROM fleet_stats f, hospital_stats h, emergency_stats e, driver_stats d, maintenance_stats m;


-- ============================================================
-- Q12: EXPLAIN ANALYZE — Prove GiST index performance
-- ============================================================
-- Compare spatial query WITH vs WITHOUT index

-- With GiST Index (should show Index Scan):
EXPLAIN ANALYZE
SELECT Hospital_ID, Name, 
       ST_Distance(Location_Coords::geography, ST_SetSRID(ST_MakePoint(90.4125, 23.7925), 4326)::geography) AS dist
FROM Hospitals
ORDER BY Location_Coords <-> ST_SetSRID(ST_MakePoint(90.4125, 23.7925), 4326)
LIMIT 1;

-- B-Tree index scan demonstration:
EXPLAIN ANALYZE
SELECT * FROM Ambulances WHERE Current_Status = 'Available';

EXPLAIN ANALYZE
SELECT * FROM Emergency_Requests WHERE Status = 'Pending';