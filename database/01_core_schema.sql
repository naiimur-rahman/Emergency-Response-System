SELECT pg_catalog.set_config('search_path', '', false);

CREATE SCHEMA public;

ALTER SCHEMA public OWNER TO pg_database_owner;

COMMENT ON SCHEMA public IS 'standard public schema';

CREATE TYPE equipment_lvl AS ENUM (
    'Basic',
    'Advanced',
    'Basic Life Support',
    'Advanced Life Support',
    'ICU Support'
);

CREATE TYPE hospital_type AS ENUM (
    'Government',
    'Private'
);

CREATE TYPE req_status AS ENUM (
    'Pending',
    'Active',
    'En Route',
    'Picked Up',
    'Arrived',
    'Resolved',
    'Cancelled',
    'Broadcast',
    'Admitted'
);

CREATE TYPE severity_lvl AS ENUM (
    'Low',
    'Medium',
    'High',
    'Critical'
);

CREATE TYPE shift_status AS ENUM (
    'On_Duty',
    'Off_Duty',
    'Available',
    'Dispatched',
    'On_Trip',
    'Offline'
);

CREATE TYPE vehicle_status AS ENUM (
    'Available',
    'Dispatched',
    'Maintenance',
    'Maintenance_Required'
);


-- Registered hospital facilities and their geolocation data
CREATE TABLE hospitals (
    hospital_id integer NOT NULL,
    name character varying(150) NOT NULL,
    location_coords geometry(Point,4326) NOT NULL,
    general_beds integer DEFAULT 0 NOT NULL,
    icu_beds integer DEFAULT 0 NOT NULL,
    type hospital_type DEFAULT 'Private'::hospital_type NOT NULL
);


-- Primary patient demographic and contact information
CREATE TABLE patients (
    patient_id integer NOT NULL,
    name character varying(100) NOT NULL,
    phone character varying(20) NOT NULL,
    blood_type character varying(5),
    address text,
    primary_specialization character varying(100),
    allergies text
);

CREATE SEQUENCE ambulances_vehicle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE ambulances_vehicle_id_seq OWNED BY ambulances.vehicle_id;

CREATE TABLE audit_log (
    audit_id integer NOT NULL,
    table_name character varying(50) NOT NULL,
    operation character varying(10) NOT NULL,
    record_id integer NOT NULL,
    changed_by character varying(100) DEFAULT CURRENT_USER,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    old_values jsonb,
    new_values jsonb,
    CONSTRAINT audit_log_operation_check CHECK (((operation)::text = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::text[])))
);

CREATE SEQUENCE audit_log_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE audit_log_audit_id_seq OWNED BY audit_log.audit_id;

CREATE SEQUENCE billing_bill_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE billing_bill_id_seq OWNED BY billing.bill_id;

CREATE TABLE chat_messages (
    message_id integer NOT NULL,
    trip_id character varying(20),
    sender character varying(50) NOT NULL,
    message_text text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE chat_messages_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE chat_messages_message_id_seq OWNED BY chat_messages.message_id;

CREATE TABLE dispatch_zones (
    zone_id integer NOT NULL,
    zone_name character varying(100) NOT NULL,
    zone_boundary geometry(Polygon,4326),
    priority_level integer DEFAULT 1,
    CONSTRAINT dispatch_zones_priority_level_check CHECK (((priority_level >= 1) AND (priority_level <= 5)))
);

CREATE SEQUENCE dispatch_zones_zone_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE dispatch_zones_zone_id_seq OWNED BY dispatch_zones.zone_id;

CREATE SEQUENCE dispatchers_dispatcher_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE dispatchers_dispatcher_id_seq OWNED BY dispatchers.dispatcher_id;

CREATE TABLE driver_certifications (
    cert_id integer NOT NULL,
    driver_id integer NOT NULL,
    certification_name character varying(150) NOT NULL,
    issuing_authority character varying(150) NOT NULL,
    date_issued date NOT NULL,
    expiry_date date,
    is_active boolean DEFAULT true
);

CREATE SEQUENCE driver_certifications_cert_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE driver_certifications_cert_id_seq OWNED BY driver_certifications.cert_id;

CREATE SEQUENCE drivers_driver_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE drivers_driver_id_seq OWNED BY drivers.driver_id;

CREATE TABLE trip_feedback (
    feedback_id integer NOT NULL,
    trip_id character varying(20) NOT NULL,
    rating integer NOT NULL,
    comments text,
    response_time_rating integer,
    driver_rating integer,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT trip_feedback_driver_rating_check CHECK (((driver_rating >= 1) AND (driver_rating <= 5))),
    CONSTRAINT trip_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT trip_feedback_response_time_rating_check CHECK (((response_time_rating >= 1) AND (response_time_rating <= 5)))
);

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

CREATE TABLE emergency_types (
    type_id integer NOT NULL,
    type_name character varying(100) NOT NULL,
    description text,
    default_severity severity_lvl DEFAULT 'Medium'::severity_lvl NOT NULL,
    requires_advanced_equipment boolean DEFAULT false
);

CREATE SEQUENCE emergency_types_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE emergency_types_type_id_seq OWNED BY emergency_types.type_id;

CREATE TABLE hospital_specializations (
    hospital_id integer NOT NULL,
    spec_id integer NOT NULL,
    specialist_count integer DEFAULT 0
);

CREATE SEQUENCE hospitals_hospital_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hospitals_hospital_id_seq OWNED BY hospitals.hospital_id;

CREATE TABLE maintenance_logs (
    log_id integer NOT NULL,
    vehicle_id integer NOT NULL,
    maintenance_type character varying(100) NOT NULL,
    description text,
    cost numeric(10,2) DEFAULT 0.00,
    date_started date DEFAULT CURRENT_DATE NOT NULL,
    date_completed date,
    technician_name character varying(100)
);

CREATE SEQUENCE maintenance_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE maintenance_logs_log_id_seq OWNED BY maintenance_logs.log_id;


-- Historical records of medical conditions and allergies for patients
CREATE TABLE patient_conditions (
    record_id integer NOT NULL,
    patient_id integer NOT NULL,
    condition_name character varying(100) NOT NULL
);

CREATE SEQUENCE patient_conditions_record_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE patient_conditions_record_id_seq OWNED BY patient_conditions.record_id;

CREATE TABLE patient_emergency_contacts (
    contact_id integer NOT NULL,
    patient_id integer NOT NULL,
    contact_name character varying(100) NOT NULL,
    relationship character varying(50) NOT NULL,
    phone character varying(20) NOT NULL
);

CREATE SEQUENCE patient_emergency_contacts_contact_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE patient_emergency_contacts_contact_id_seq OWNED BY patient_emergency_contacts.contact_id;

CREATE SEQUENCE patients_patient_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE patients_patient_id_seq OWNED BY patients.patient_id;

CREATE TABLE pricing_config (
    config_id integer DEFAULT 1 NOT NULL,
    base_fare numeric(10,2) DEFAULT 500.00 NOT NULL,
    per_km_charge numeric(10,2) DEFAULT 25.00 NOT NULL,
    night_multiplier numeric(5,2) DEFAULT 1.35 NOT NULL,
    critical_surcharge numeric(10,2) DEFAULT 500.00 NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE shift_schedules_schedule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE shift_schedules_schedule_id_seq OWNED BY shift_schedules.schedule_id;

CREATE TABLE specializations (
    spec_id integer NOT NULL,
    spec_name character varying(100) NOT NULL,
    description text
);

CREATE SEQUENCE specializations_spec_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE specializations_spec_id_seq OWNED BY specializations.spec_id;

CREATE TABLE staff_users (
    user_id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    blocked boolean DEFAULT false,
    CONSTRAINT staff_users_role_check CHECK (((role)::text = ANY ((ARRAY['Admin'::character varying, 'Dispatcher'::character varying])::text[])))
);

CREATE SEQUENCE staff_users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE staff_users_user_id_seq OWNED BY staff_users.user_id;

CREATE SEQUENCE trip_feedback_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE trip_feedback_feedback_id_seq OWNED BY trip_feedback.feedback_id;

CREATE SEQUENCE vehicle_inventory_inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE vehicle_inventory_inventory_id_seq OWNED BY vehicle_inventory.inventory_id;

ALTER TABLE ONLY audit_log ALTER COLUMN audit_id SET DEFAULT nextval('audit_log_audit_id_seq'::regclass);

ALTER TABLE ONLY chat_messages ALTER COLUMN message_id SET DEFAULT nextval('chat_messages_message_id_seq'::regclass);

ALTER TABLE ONLY dispatch_zones ALTER COLUMN zone_id SET DEFAULT nextval('dispatch_zones_zone_id_seq'::regclass);

ALTER TABLE ONLY driver_certifications ALTER COLUMN cert_id SET DEFAULT nextval('driver_certifications_cert_id_seq'::regclass);

ALTER TABLE ONLY emergency_types ALTER COLUMN type_id SET DEFAULT nextval('emergency_types_type_id_seq'::regclass);

ALTER TABLE ONLY hospitals ALTER COLUMN hospital_id SET DEFAULT nextval('hospitals_hospital_id_seq'::regclass);

ALTER TABLE ONLY maintenance_logs ALTER COLUMN log_id SET DEFAULT nextval('maintenance_logs_log_id_seq'::regclass);

ALTER TABLE ONLY patient_conditions ALTER COLUMN record_id SET DEFAULT nextval('patient_conditions_record_id_seq'::regclass);

ALTER TABLE ONLY patient_emergency_contacts ALTER COLUMN contact_id SET DEFAULT nextval('patient_emergency_contacts_contact_id_seq'::regclass);

ALTER TABLE ONLY patients ALTER COLUMN patient_id SET DEFAULT nextval('patients_patient_id_seq'::regclass);

ALTER TABLE ONLY specializations ALTER COLUMN spec_id SET DEFAULT nextval('specializations_spec_id_seq'::regclass);

ALTER TABLE ONLY staff_users ALTER COLUMN user_id SET DEFAULT nextval('staff_users_user_id_seq'::regclass);

ALTER TABLE ONLY trip_feedback ALTER COLUMN feedback_id SET DEFAULT nextval('trip_feedback_feedback_id_seq'::regclass);

ALTER TABLE ONLY audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (audit_id);

ALTER TABLE ONLY chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (message_id);

ALTER TABLE ONLY dispatch_zones
    ADD CONSTRAINT dispatch_zones_pkey PRIMARY KEY (zone_id);

ALTER TABLE ONLY dispatch_zones
    ADD CONSTRAINT dispatch_zones_zone_name_key UNIQUE (zone_name);

ALTER TABLE ONLY driver_certifications
    ADD CONSTRAINT driver_certifications_pkey PRIMARY KEY (cert_id);

ALTER TABLE ONLY emergency_types
    ADD CONSTRAINT emergency_types_pkey PRIMARY KEY (type_id);

ALTER TABLE ONLY emergency_types
    ADD CONSTRAINT emergency_types_type_name_key UNIQUE (type_name);

ALTER TABLE ONLY hospital_specializations
    ADD CONSTRAINT hospital_specializations_pkey PRIMARY KEY (hospital_id, spec_id);

ALTER TABLE ONLY hospitals
    ADD CONSTRAINT hospitals_pkey PRIMARY KEY (hospital_id);

ALTER TABLE ONLY maintenance_logs
    ADD CONSTRAINT maintenance_logs_pkey PRIMARY KEY (log_id);

ALTER TABLE ONLY patient_conditions
    ADD CONSTRAINT patient_conditions_pkey PRIMARY KEY (record_id);

ALTER TABLE ONLY patient_emergency_contacts
    ADD CONSTRAINT patient_emergency_contacts_pkey PRIMARY KEY (contact_id);

ALTER TABLE ONLY patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (patient_id);

ALTER TABLE ONLY pricing_config
    ADD CONSTRAINT pricing_config_pkey PRIMARY KEY (config_id);

ALTER TABLE ONLY specializations
    ADD CONSTRAINT specializations_pkey PRIMARY KEY (spec_id);

ALTER TABLE ONLY specializations
    ADD CONSTRAINT specializations_spec_name_key UNIQUE (spec_name);

ALTER TABLE ONLY staff_users
    ADD CONSTRAINT staff_users_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY staff_users
    ADD CONSTRAINT staff_users_username_key UNIQUE (username);

ALTER TABLE ONLY trip_feedback
    ADD CONSTRAINT trip_feedback_pkey PRIMARY KEY (feedback_id);

ALTER TABLE ONLY trip_feedback
    ADD CONSTRAINT trip_feedback_trip_id_key UNIQUE (trip_id);

CREATE INDEX idx_ambulances_status ON ambulances USING btree (current_status);

CREATE UNIQUE INDEX idx_analytics_mv_date ON emergency_analytics_mv USING btree (trip_date);

CREATE INDEX idx_audit_table ON audit_log USING btree (table_name, changed_at);

CREATE INDEX idx_drivers_status ON drivers USING btree (shift_status);

CREATE INDEX idx_hospitals_location ON hospitals USING gist (location_coords);

CREATE INDEX idx_req_status ON emergency_requests USING btree (status);

CREATE INDEX idx_requests_pickup ON emergency_requests USING gist (pickup_coords);

CREATE INDEX idx_zones_boundary ON dispatch_zones USING gist (zone_boundary);

ALTER TABLE ONLY chat_messages
    ADD CONSTRAINT chat_messages_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES trip_logs(trip_id) ON DELETE CASCADE;

ALTER TABLE ONLY driver_certifications
    ADD CONSTRAINT driver_certifications_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE CASCADE;

ALTER TABLE ONLY hospital_specializations
    ADD CONSTRAINT hospital_specializations_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE;

ALTER TABLE ONLY hospital_specializations
    ADD CONSTRAINT hospital_specializations_spec_id_fkey FOREIGN KEY (spec_id) REFERENCES specializations(spec_id) ON DELETE CASCADE;

ALTER TABLE ONLY maintenance_logs
    ADD CONSTRAINT maintenance_logs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES ambulances(vehicle_id) ON DELETE CASCADE;

ALTER TABLE ONLY patient_conditions
    ADD CONSTRAINT patient_conditions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE;

ALTER TABLE ONLY patient_emergency_contacts
    ADD CONSTRAINT patient_emergency_contacts_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE;

ALTER TABLE ONLY trip_feedback
    ADD CONSTRAINT trip_feedback_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES trip_logs(trip_id) ON DELETE CASCADE;

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON TABLE ambulances TO anon;
GRANT ALL ON TABLE ambulances TO authenticated;
GRANT ALL ON TABLE ambulances TO service_role;

GRANT ALL ON TABLE drivers TO anon;
GRANT ALL ON TABLE drivers TO authenticated;
GRANT ALL ON TABLE drivers TO service_role;

GRANT ALL ON TABLE emergency_requests TO anon;
GRANT ALL ON TABLE emergency_requests TO authenticated;
GRANT ALL ON TABLE emergency_requests TO service_role;

GRANT ALL ON TABLE hospitals TO anon;
GRANT ALL ON TABLE hospitals TO authenticated;
GRANT ALL ON TABLE hospitals TO service_role;

GRANT ALL ON TABLE patients TO anon;
GRANT ALL ON TABLE patients TO authenticated;
GRANT ALL ON TABLE patients TO service_role;

GRANT ALL ON TABLE trip_logs TO anon;
GRANT ALL ON TABLE trip_logs TO authenticated;
GRANT ALL ON TABLE trip_logs TO service_role;

GRANT ALL ON TABLE active_dashboard_view TO anon;
GRANT ALL ON TABLE active_dashboard_view TO authenticated;
GRANT ALL ON TABLE active_dashboard_view TO service_role;

GRANT ALL ON SEQUENCE ambulances_vehicle_id_seq TO anon;
GRANT ALL ON SEQUENCE ambulances_vehicle_id_seq TO authenticated;
GRANT ALL ON SEQUENCE ambulances_vehicle_id_seq TO service_role;

GRANT ALL ON TABLE audit_log TO anon;
GRANT ALL ON TABLE audit_log TO authenticated;
GRANT ALL ON TABLE audit_log TO service_role;

GRANT ALL ON SEQUENCE audit_log_audit_id_seq TO anon;
GRANT ALL ON SEQUENCE audit_log_audit_id_seq TO authenticated;
GRANT ALL ON SEQUENCE audit_log_audit_id_seq TO service_role;

GRANT ALL ON TABLE billing TO anon;
GRANT ALL ON TABLE billing TO authenticated;
GRANT ALL ON TABLE billing TO service_role;

GRANT ALL ON SEQUENCE billing_bill_id_seq TO anon;
GRANT ALL ON SEQUENCE billing_bill_id_seq TO authenticated;
GRANT ALL ON SEQUENCE billing_bill_id_seq TO service_role;

GRANT ALL ON TABLE chat_messages TO anon;
GRANT ALL ON TABLE chat_messages TO authenticated;
GRANT ALL ON TABLE chat_messages TO service_role;

GRANT ALL ON SEQUENCE chat_messages_message_id_seq TO anon;
GRANT ALL ON SEQUENCE chat_messages_message_id_seq TO authenticated;
GRANT ALL ON SEQUENCE chat_messages_message_id_seq TO service_role;

GRANT ALL ON TABLE dispatch_zones TO anon;
GRANT ALL ON TABLE dispatch_zones TO authenticated;
GRANT ALL ON TABLE dispatch_zones TO service_role;

GRANT ALL ON SEQUENCE dispatch_zones_zone_id_seq TO anon;
GRANT ALL ON SEQUENCE dispatch_zones_zone_id_seq TO authenticated;
GRANT ALL ON SEQUENCE dispatch_zones_zone_id_seq TO service_role;

GRANT ALL ON TABLE dispatchers TO anon;
GRANT ALL ON TABLE dispatchers TO authenticated;
GRANT ALL ON TABLE dispatchers TO service_role;

GRANT ALL ON SEQUENCE dispatchers_dispatcher_id_seq TO anon;
GRANT ALL ON SEQUENCE dispatchers_dispatcher_id_seq TO authenticated;
GRANT ALL ON SEQUENCE dispatchers_dispatcher_id_seq TO service_role;

GRANT ALL ON TABLE driver_certifications TO anon;
GRANT ALL ON TABLE driver_certifications TO authenticated;
GRANT ALL ON TABLE driver_certifications TO service_role;

GRANT ALL ON SEQUENCE driver_certifications_cert_id_seq TO anon;
GRANT ALL ON SEQUENCE driver_certifications_cert_id_seq TO authenticated;
GRANT ALL ON SEQUENCE driver_certifications_cert_id_seq TO service_role;

GRANT ALL ON SEQUENCE drivers_driver_id_seq TO anon;
GRANT ALL ON SEQUENCE drivers_driver_id_seq TO authenticated;
GRANT ALL ON SEQUENCE drivers_driver_id_seq TO service_role;

GRANT ALL ON TABLE trip_feedback TO anon;
GRANT ALL ON TABLE trip_feedback TO authenticated;
GRANT ALL ON TABLE trip_feedback TO service_role;

GRANT ALL ON TABLE emergency_analytics_mv TO anon;
GRANT ALL ON TABLE emergency_analytics_mv TO authenticated;
GRANT ALL ON TABLE emergency_analytics_mv TO service_role;

GRANT ALL ON TABLE emergency_types TO anon;
GRANT ALL ON TABLE emergency_types TO authenticated;
GRANT ALL ON TABLE emergency_types TO service_role;

GRANT ALL ON SEQUENCE emergency_types_type_id_seq TO anon;
GRANT ALL ON SEQUENCE emergency_types_type_id_seq TO authenticated;
GRANT ALL ON SEQUENCE emergency_types_type_id_seq TO service_role;

GRANT ALL ON TABLE hospital_specializations TO anon;
GRANT ALL ON TABLE hospital_specializations TO authenticated;
GRANT ALL ON TABLE hospital_specializations TO service_role;

GRANT ALL ON SEQUENCE hospitals_hospital_id_seq TO anon;
GRANT ALL ON SEQUENCE hospitals_hospital_id_seq TO authenticated;
GRANT ALL ON SEQUENCE hospitals_hospital_id_seq TO service_role;

GRANT ALL ON TABLE maintenance_logs TO anon;
GRANT ALL ON TABLE maintenance_logs TO authenticated;
GRANT ALL ON TABLE maintenance_logs TO service_role;

GRANT ALL ON SEQUENCE maintenance_logs_log_id_seq TO anon;
GRANT ALL ON SEQUENCE maintenance_logs_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE maintenance_logs_log_id_seq TO service_role;

GRANT ALL ON TABLE patient_conditions TO anon;
GRANT ALL ON TABLE patient_conditions TO authenticated;
GRANT ALL ON TABLE patient_conditions TO service_role;

GRANT ALL ON SEQUENCE patient_conditions_record_id_seq TO anon;
GRANT ALL ON SEQUENCE patient_conditions_record_id_seq TO authenticated;
GRANT ALL ON SEQUENCE patient_conditions_record_id_seq TO service_role;

GRANT ALL ON TABLE patient_emergency_contacts TO anon;
GRANT ALL ON TABLE patient_emergency_contacts TO authenticated;
GRANT ALL ON TABLE patient_emergency_contacts TO service_role;

GRANT ALL ON SEQUENCE patient_emergency_contacts_contact_id_seq TO anon;
GRANT ALL ON SEQUENCE patient_emergency_contacts_contact_id_seq TO authenticated;
GRANT ALL ON SEQUENCE patient_emergency_contacts_contact_id_seq TO service_role;

GRANT ALL ON SEQUENCE patients_patient_id_seq TO anon;
GRANT ALL ON SEQUENCE patients_patient_id_seq TO authenticated;
GRANT ALL ON SEQUENCE patients_patient_id_seq TO service_role;

GRANT ALL ON TABLE pricing_config TO anon;
GRANT ALL ON TABLE pricing_config TO authenticated;
GRANT ALL ON TABLE pricing_config TO service_role;

GRANT ALL ON TABLE shift_schedules TO anon;
GRANT ALL ON TABLE shift_schedules TO authenticated;
GRANT ALL ON TABLE shift_schedules TO service_role;

GRANT ALL ON SEQUENCE shift_schedules_schedule_id_seq TO anon;
GRANT ALL ON SEQUENCE shift_schedules_schedule_id_seq TO authenticated;
GRANT ALL ON SEQUENCE shift_schedules_schedule_id_seq TO service_role;

GRANT ALL ON TABLE specializations TO anon;
GRANT ALL ON TABLE specializations TO authenticated;
GRANT ALL ON TABLE specializations TO service_role;

GRANT ALL ON SEQUENCE specializations_spec_id_seq TO anon;
GRANT ALL ON SEQUENCE specializations_spec_id_seq TO authenticated;
GRANT ALL ON SEQUENCE specializations_spec_id_seq TO service_role;

GRANT ALL ON TABLE staff_users TO anon;
GRANT ALL ON TABLE staff_users TO authenticated;
GRANT ALL ON TABLE staff_users TO service_role;

GRANT ALL ON SEQUENCE staff_users_user_id_seq TO anon;
GRANT ALL ON SEQUENCE staff_users_user_id_seq TO authenticated;
GRANT ALL ON SEQUENCE staff_users_user_id_seq TO service_role;

GRANT ALL ON SEQUENCE trip_feedback_feedback_id_seq TO anon;
GRANT ALL ON SEQUENCE trip_feedback_feedback_id_seq TO authenticated;
GRANT ALL ON SEQUENCE trip_feedback_feedback_id_seq TO service_role;

GRANT ALL ON TABLE vehicle_inventory TO anon;
GRANT ALL ON TABLE vehicle_inventory TO authenticated;
GRANT ALL ON TABLE vehicle_inventory TO service_role;

GRANT ALL ON SEQUENCE vehicle_inventory_inventory_id_seq TO anon;
GRANT ALL ON SEQUENCE vehicle_inventory_inventory_id_seq TO authenticated;
GRANT ALL ON SEQUENCE vehicle_inventory_inventory_id_seq TO service_role;
