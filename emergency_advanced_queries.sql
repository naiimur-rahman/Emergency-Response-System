-- ==========================================
-- EMERGENCY RESPONSE SYSTEM: ADVANCED QUERY SHOWCASE
-- For UIU CSE DBMS Project Show
-- ==========================================

-- ============================================================
-- Q1: CHAMPION FEATURE — Specialization-Aware Dispatch Simulation
-- ============================================================
-- Uses: Advanced Joins, ILIKE matching, PostGIS Distance, Ranking
-- Scenario: Find the BEST hospital for a specific patient condition
WITH Target_Patient AS (
    SELECT p.Name, pc.Condition_Name, er.Pickup_Coords
    FROM Patients p
    JOIN Patient_Conditions pc ON p.Patient_ID = pc.Patient_ID
    JOIN Emergency_Requests er ON p.Patient_ID = er.Patient_ID
    WHERE er.Request_ID = 1 -- Example: Abdur Rahman (Hypertension)
)
SELECT 
    h.Name AS Hospital_Name,
    h.ICU_Beds,
    s.Spec_Name AS Matched_Specialty,
    ROUND(ST_Distance(h.Location_Coords::geography, tp.Pickup_Coords::geography)::numeric / 1000, 2) AS Distance_KM,
    CASE 
        WHEN s.Spec_Name ILIKE '%' || tp.Condition_Name || '%' THEN '🏆 EXACT SPECIALTY MATCH'
        ELSE 'Generic Emergency'
    END AS Match_Quality
FROM Hospitals h
LEFT JOIN Hospital_Specializations hs ON h.Hospital_ID = hs.Hospital_ID
LEFT JOIN Specializations s ON hs.Spec_ID = s.Spec_ID
CROSS JOIN Target_Patient tp
WHERE h.ICU_Beds > 0
ORDER BY (s.Spec_Name ILIKE '%' || tp.Condition_Name || '%') DESC, Distance_KM ASC
LIMIT 5;


-- ============================================================
-- Q2: CHAMPION FEATURE — Predictive Maintenance Alerts
-- ============================================================
-- Uses: Window Functions, CASE logic, Fleet Analytics
-- Scenario: Identify vehicles that are at risk of breakdown
SELECT 
    License_Plate,
    Equipment_Level,
    Trips_Since_Maintenance,
    CASE 
        WHEN Trips_Since_Maintenance >= 50 THEN '🔴 CRITICAL: IMMEDIATE SERVICE REQUIRED'
        WHEN Trips_Since_Maintenance >= 40 THEN '🟡 WARNING: SERVICE SOON'
        ELSE '🟢 HEALTHY'
    END AS Fleet_Status,
    ROUND(AVG(Trips_Since_Maintenance) OVER (), 1) as Fleet_Avg_Usage
FROM Ambulances
ORDER BY Trips_Since_Maintenance DESC;


-- ============================================================
-- Q3: CHAMPION FEATURE — Zone-Based Emergency "Black Spots"
-- ============================================================
-- Uses: PostGIS ST_Contains, Spatial Joins, Density Ranking
-- Scenario: Where should we station more ambulances?
SELECT 
    dz.Zone_Name,
    dz.Priority_Level,
    COUNT(er.Request_ID) AS Total_Emergencies,
    RANK() OVER (ORDER BY COUNT(er.Request_ID) DESC) as Danger_Rank
FROM Dispatch_Zones dz
LEFT JOIN Emergency_Requests er ON ST_Contains(dz.Zone_Boundary, er.Pickup_Coords)
GROUP BY dz.Zone_ID, dz.Zone_Name, dz.Priority_Level
ORDER BY Danger_Rank ASC;


-- ============================================================
-- Q4: WINDOW FUNCTIONS — Hospital Distance Ranking
-- ============================================================
WITH Patient_Location AS (
    SELECT Pickup_Coords FROM Emergency_Requests WHERE Request_ID = 1
)
SELECT 
    h.Name,
    ROUND(ST_Distance(h.Location_Coords::geography, pl.Pickup_Coords::geography)::numeric, 2) AS Distance_Meters,
    RANK() OVER (ORDER BY ST_Distance(h.Location_Coords::geography, pl.Pickup_Coords::geography)) AS Distance_Rank
FROM Hospitals h, Patient_Location pl
ORDER BY Distance_Rank;


-- ============================================================
-- Q5: FULL AUDIT TRAIL — JSONB Analysis
-- ============================================================
SELECT 
    Audit_ID,
    Table_Name,
    Operation,
    Changed_At,
    New_Values->>'status' AS New_Status,
    Old_Values->>'status' AS Old_Status,
    CASE 
        WHEN (Old_Values->>'status') IS DISTINCT FROM (New_Values->>'status')
        THEN 'Status Transition Detected'
        ELSE 'No Change'
    END AS Audit_Flag
FROM Audit_Log
ORDER BY Changed_At DESC;


-- ============================================================
-- Q6: PERFORMANCE — Explain Analyze Spatial Index
-- ============================================================
EXPLAIN ANALYZE
SELECT Name FROM Hospitals
ORDER BY Location_Coords <-> ST_SetSRID(ST_MakePoint(90.4125, 23.7925), 4326)
LIMIT 1;