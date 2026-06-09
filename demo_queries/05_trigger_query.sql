-- 1. Demoing fn_automated_dispatch
-- Show how you can call the function manually (or it is triggered automatically)
-- Assuming we have an emergency request with ID 1 and dispatcher with ID 1
-- SELECT fn_automated_dispatch(1, 1);

-- 2. Demoing trigger trg_predict_severity
-- Show how inserting a new request might predict its severity based on patient history
INSERT INTO emergency_requests (patient_id, pickup_coords, severity_level, status) 
VALUES (1, ST_SetSRID(ST_MakePoint(90.4125, 23.8103), 4326), 'Low', 'Pending');
-- Notice that the severity level will be auto-calculated if the patient has critical conditions like Heart Attack or Stroke
