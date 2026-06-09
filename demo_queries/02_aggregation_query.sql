-- Count of emergencies by severity
SELECT severity_level, COUNT(*) AS request_count
FROM emergency_requests
GROUP BY severity_level
ORDER BY request_count DESC;

-- Average response time per hospital
SELECT 
    h.name AS hospital_name,
    AVG(EXTRACT(epoch FROM (tl.time_reached_hospital - tl.time_dispatched)) / 60) AS avg_response_time_minutes
FROM trip_logs tl
JOIN hospitals h ON tl.hospital_id = h.hospital_id
WHERE tl.time_reached_hospital IS NOT NULL
GROUP BY h.name;
