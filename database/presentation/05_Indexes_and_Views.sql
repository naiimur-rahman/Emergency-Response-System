-- 2. Advanced Performance Logic
CREATE INDEX IF NOT EXISTS idx_audit_table ON Audit_Log(Table_Name, Changed_At);
CREATE INDEX IF NOT EXISTS idx_zones_boundary ON Dispatch_Zones USING GIST (Zone_Boundary);

-- Materialized View for Analytics
DROP MATERIALIZED VIEW IF EXISTS emergency_analytics_mv CASCADE;
CREATE MATERIALIZED VIEW emergency_analytics_mv AS
SELECT 
    DATE(tl.time_dispatched) as trip_date,
    COUNT(tl.trip_id) as total_trips,
    AVG(EXTRACT(EPOCH FROM (tl.time_reached_hospital - tl.time_dispatched))/60)::numeric(10,2) as avg_response_time_minutes,
    SUM(b.total_amount) as total_revenue,
    AVG(tf.rating)::numeric(3,2) as avg_driver_rating
FROM trip_logs tl
LEFT JOIN billing b ON tl.trip_id = b.trip_id
LEFT JOIN trip_feedback tf ON tl.trip_id = tf.trip_id
WHERE tl.time_reached_hospital IS NOT NULL
GROUP BY DATE(tl.time_dispatched);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_mv_date ON emergency_analytics_mv(trip_date);
-- =========================================================================
-- DRUTO SHEBA - DATABASE SCHEMA UPDATE (v2.0)
-- Purpose: Fixes dispatch logic, adds communication tables, and enhances
--          resource allocation.
-- =========================================================================

