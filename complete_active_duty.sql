UPDATE trip_logs SET time_arrived_scene = CURRENT_TIMESTAMP WHERE time_arrived_scene IS NULL;
UPDATE trip_logs SET time_reached_hospital = CURRENT_TIMESTAMP WHERE time_reached_hospital IS NULL;
UPDATE ambulances SET current_status = 'Available' WHERE current_status = 'Dispatched';
UPDATE drivers SET shift_status = 'Available' WHERE shift_status = 'On_Trip';
UPDATE emergency_requests SET status = 'Resolved' WHERE status IN ('Pending', 'Active', 'En Route', 'Picked Up', 'Arrived', 'Broadcast');
