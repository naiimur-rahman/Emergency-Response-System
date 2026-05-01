-- Insert shift schedules for drivers
INSERT INTO shift_schedules (driver_id, shift_date, start_time, end_time, zone_assigned)
VALUES 
(1, CURRENT_DATE, '06:00:00', '14:00:00', 1),
(1, CURRENT_DATE + INTERVAL '1 day', '22:00:00', '06:00:00', 1),
(1, CURRENT_DATE + INTERVAL '3 days', '14:00:00', '22:00:00', 1),
(2, CURRENT_DATE + INTERVAL '1 day', '06:00:00', '14:00:00', 2),
(2, CURRENT_DATE + INTERVAL '2 days', '14:00:00', '22:00:00', 2),
(3, CURRENT_DATE, '22:00:00', '06:00:00', 3),
(3, CURRENT_DATE + INTERVAL '1 day', '22:00:00', '06:00:00', 3)
ON CONFLICT DO NOTHING;

-- Since the DB schema doesn't have a specific table for fare/rating, we will calculate duration dynamically in the API.
