-- 07_doctor_assigning.sql
-- New tables for Doctor Assigning feature

CREATE TYPE day_of_week_enum AS ENUM (
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
);

CREATE TYPE assignment_status AS ENUM (
    'Pending', 'Confirmed', 'Completed', 'Cancelled'
);

CREATE TABLE doctors (
    doctor_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    spec_id INTEGER NOT NULL REFERENCES specializations(spec_id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctor_schedules (
    schedule_id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    day_of_week day_of_week_enum NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
);

CREATE TABLE doctor_assignments (
    assignment_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status assignment_status DEFAULT 'Pending'::assignment_status,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assistants (
    assistant_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS Policies (if using Supabase, we can enable RLS and add basic policies later)
-- For now, we will just create the tables.

-- Real-time view utilized by the Dispatcher portal to monitor all active emergencies
CREATE MATERIALIZED VIEW emergency_analytics_mv AS
 SELECT date(tl.time_dispatched) AS trip_date,
    count(tl.trip_id) AS total_trips,
    (avg((EXTRACT(epoch FROM (tl.time_reached_hospital - tl.time_dispatched)) / (60)::numeric)))::numeric(10,2) AS avg_response_time_minutes,
    sum(b.total_amount) AS total_revenue,
    (avg(tf.rating))::numeric(3,2) AS avg_driver_rating
   FROM ((trip_logs tl
     LEFT JOIN billing b ON (((tl.trip_id)::text = (b.trip_id)::text)))
     LEFT JOIN trip_feedback tf ON (((tl.trip_id)::text = (tf.trip_id)::text)))
  WHERE (tl.time_reached_hospital IS NOT NULL)
  GROUP BY (date(tl.time_dispatched))
  WITH NO DATA;

ALTER MATERIALIZED VIEW emergency_analytics_mv OWNER TO postgres;

CREATE UNIQUE INDEX idx_analytics_mv_date ON emergency_analytics_mv USING btree (trip_date);

GRANT ALL ON TABLE emergency_analytics_mv TO anon;
GRANT ALL ON TABLE emergency_analytics_mv TO authenticated;
GRANT ALL ON TABLE emergency_analytics_mv TO service_role;
