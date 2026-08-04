-- 08_doctor_seed.sql
-- Seed specializations
INSERT INTO specializations (spec_id, spec_name, description) VALUES
(1, 'Cardiology', 'Heart and cardiovascular care'),
(2, 'Neurology', 'Brain and nervous system treatment'),
(3, 'Orthopedics', 'Musculoskeletal system, bones, and joints'),
(4, 'Pediatrics', 'Child healthcare and treatment'),
(5, 'Trauma Surgery', 'Emergency surgical care for severe injuries'),
(6, 'Burn Unit', 'Specialized burn care and rehabilitation'),
(7, 'Obstetrics', 'Pregnancy, childbirth, and postpartum care'),
(8, 'Nephrology', 'Kidney care and renal diseases'),
(9, 'Oncology', 'Cancer diagnosis and treatment')
ON CONFLICT (spec_id) DO UPDATE SET spec_name = EXCLUDED.spec_name, description = EXCLUDED.description;

-- Clear existing data
DELETE FROM doctor_schedules;
DELETE FROM doctor_assignments;
DELETE FROM doctors;

-- Seed doctors with hardcoded IDs
INSERT INTO doctors (doctor_id, name, phone, hospital_id, spec_id, is_available) VALUES
(1, 'Dr. Rahim Ahmed', '01711000101', 2, 1, TRUE),
(2, 'Dr. Farhana Khan', '01711000102', 4, 1, TRUE),
(3, 'Dr. Tarek Rahman', '01711000103', 9, 1, TRUE),
(4, 'Dr. Salma Begum', '01711000104', 1, 1, TRUE),
(5, 'Dr. Shahin Islam', '01711000105', 2, 2, TRUE),
(6, 'Dr. Nusrat Jahan', '01711000106', 10, 2, TRUE),
(7, 'Dr. Ayesha Siddiqua', '01711000107', 1, 2, TRUE),
(8, 'Dr. Karim Hossain', '01711000108', 2, 3, TRUE),
(9, 'Dr. Riyad Ahmed', '01711000109', 4, 3, TRUE),
(10, 'Dr. Kamrul Hasan', '01711000110', 9, 3, TRUE),
(11, 'Dr. Sadia Afrin', '01711000111', 2, 4, TRUE),
(12, 'Dr. Mehedi Hasan', '01711000112', 10, 4, TRUE),
(13, 'Dr. Monir Hossain', '01711000113', 1, 4, TRUE),
(14, 'Dr. Sharmin Akter', '01711000114', 2, 5, TRUE),
(15, 'Dr. Rubel Mia', '01711000115', 7, 5, TRUE),
(16, 'Dr. Tania Sultana', '01711000116', 1, 6, TRUE),
(17, 'Dr. Zahid Hasan', '01711000117', 4, 6, TRUE),
(18, 'Dr. Fatema Zohra', '01711000118', 2, 7, TRUE),
(19, 'Dr. Sonia Akter', '01711000119', 7, 7, TRUE),
(20, 'Dr. Rafiqul Islam', '01711000120', 9, 8, TRUE),
(21, 'Dr. Monirul Islam', '01711000121', 3, 9, TRUE);

-- Adjust sequence for SERIAL doctors primary key
SELECT setval('doctors_doctor_id_seq', (SELECT MAX(doctor_id) FROM doctors));

-- Seed schedules
INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time) VALUES
(1, 'Monday', '09:00:00', '14:00:00'),
(1, 'Thursday', '15:00:00', '20:00:00'),
(2, 'Monday', '09:00:00', '14:00:00'),
(2, 'Thursday', '15:00:00', '20:00:00'),
(3, 'Monday', '09:00:00', '14:00:00'),
(3, 'Thursday', '15:00:00', '20:00:00'),
(4, 'Monday', '09:00:00', '14:00:00'),
(4, 'Thursday', '15:00:00', '20:00:00'),
(5, 'Monday', '09:00:00', '14:00:00'),
(5, 'Thursday', '15:00:00', '20:00:00'),
(6, 'Monday', '09:00:00', '14:00:00'),
(6, 'Thursday', '15:00:00', '20:00:00'),
(7, 'Monday', '09:00:00', '14:00:00'),
(7, 'Thursday', '15:00:00', '20:00:00'),
(8, 'Monday', '09:00:00', '14:00:00'),
(8, 'Thursday', '15:00:00', '20:00:00'),
(9, 'Monday', '09:00:00', '14:00:00'),
(9, 'Thursday', '15:00:00', '20:00:00'),
(10, 'Monday', '09:00:00', '14:00:00'),
(10, 'Thursday', '15:00:00', '20:00:00'),
(11, 'Monday', '09:00:00', '14:00:00'),
(11, 'Thursday', '15:00:00', '20:00:00'),
(12, 'Monday', '09:00:00', '14:00:00'),
(12, 'Thursday', '15:00:00', '20:00:00'),
(13, 'Monday', '09:00:00', '14:00:00'),
(13, 'Thursday', '15:00:00', '20:00:00'),
(14, 'Monday', '09:00:00', '14:00:00'),
(14, 'Thursday', '15:00:00', '20:00:00'),
(15, 'Monday', '09:00:00', '14:00:00'),
(15, 'Thursday', '15:00:00', '20:00:00'),
(16, 'Monday', '09:00:00', '14:00:00'),
(16, 'Thursday', '15:00:00', '20:00:00'),
(17, 'Monday', '09:00:00', '14:00:00'),
(17, 'Thursday', '15:00:00', '20:00:00'),
(18, 'Monday', '09:00:00', '14:00:00'),
(18, 'Thursday', '15:00:00', '20:00:00'),
(19, 'Monday', '09:00:00', '14:00:00'),
(19, 'Thursday', '15:00:00', '20:00:00'),
(20, 'Monday', '09:00:00', '14:00:00'),
(20, 'Thursday', '15:00:00', '20:00:00'),
(21, 'Monday', '09:00:00', '14:00:00'),
(21, 'Thursday', '15:00:00', '20:00:00');
