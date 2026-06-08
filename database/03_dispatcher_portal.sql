-- Core operational table: Tracks all 911 calls, their severity, and assigned resources
CREATE TABLE emergency_requests (
    request_id character varying(20) DEFAULT generate_emergency_id() NOT NULL,
    patient_id integer NOT NULL,
    pickup_coords geometry(Point,4326) NOT NULL,
    severity_level severity_lvl NOT NULL,
    timestamp_created timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status req_status DEFAULT 'Pending'::req_status,
    primary_specialization character varying(100),
    emergency_type character varying(100) DEFAULT 'General'::character varying,
    requested_for character varying(100) DEFAULT 'Self'::character varying
);


-- Detailed telemetric logs for active trips, including timestamps and distances
CREATE TABLE trip_logs (
    trip_id character varying(20) NOT NULL,
    vehicle_id integer NOT NULL,
    driver_id integer NOT NULL,
    hospital_id integer NOT NULL,
    dispatcher_id integer NOT NULL,
    time_dispatched timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    time_arrived_scene timestamp without time zone,
    time_reached_hospital timestamp without time zone
);


-- Dispatcher staff records tied to the core Users table
CREATE TABLE dispatchers (
    dispatcher_id integer NOT NULL,
    name character varying(100) NOT NULL,
    shift_time character varying(50) NOT NULL
);

ALTER TABLE ONLY dispatchers ALTER COLUMN dispatcher_id SET DEFAULT nextval('dispatchers_dispatcher_id_seq'::regclass);

ALTER TABLE ONLY dispatchers
    ADD CONSTRAINT dispatchers_pkey PRIMARY KEY (dispatcher_id);

ALTER TABLE ONLY emergency_requests
    ADD CONSTRAINT emergency_requests_pkey PRIMARY KEY (request_id);

ALTER TABLE ONLY trip_logs
    ADD CONSTRAINT trip_logs_pkey PRIMARY KEY (trip_id);

ALTER TABLE ONLY emergency_requests
    ADD CONSTRAINT emergency_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(patient_id);

ALTER TABLE ONLY trip_logs
    ADD CONSTRAINT trip_logs_dispatcher_id_fkey FOREIGN KEY (dispatcher_id) REFERENCES dispatchers(dispatcher_id);

ALTER TABLE ONLY trip_logs
    ADD CONSTRAINT trip_logs_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES drivers(driver_id);

ALTER TABLE ONLY trip_logs
    ADD CONSTRAINT trip_logs_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id);

ALTER TABLE ONLY trip_logs
    ADD CONSTRAINT trip_logs_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES emergency_requests(request_id) ON DELETE CASCADE;

ALTER TABLE ONLY trip_logs
    ADD CONSTRAINT trip_logs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES ambulances(vehicle_id);
