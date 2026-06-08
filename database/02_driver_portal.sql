-- Registered emergency vehicles, their license plates, and base hospital assignments
CREATE TABLE ambulances (
    vehicle_id integer NOT NULL,
    license_plate character varying(50) NOT NULL,
    equipment_level equipment_lvl NOT NULL,
    current_status vehicle_status DEFAULT 'Available'::vehicle_status,
    trips_since_maintenance integer DEFAULT 0,
    hub character varying(100) DEFAULT 'Central Hub'::character varying,
    next_service_date date,
    current_location geometry(Point,4326)
);


-- Ambulance drivers and their current operational shift status
CREATE TABLE drivers (
    driver_id integer NOT NULL,
    name character varying(100) NOT NULL,
    license_no character varying(50) NOT NULL,
    shift_status shift_status DEFAULT 'Off_Duty'::shift_status,
    phone character varying(20) DEFAULT '+8801711223344'::character varying
);


-- Upcoming and historical shift assignments for drivers
CREATE TABLE shift_schedules (
    schedule_id integer NOT NULL,
    driver_id integer NOT NULL,
    shift_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    zone_assigned integer
);


-- Real-time tracking of medical supplies and oxygen levels within each ambulance
CREATE TABLE vehicle_inventory (
    inventory_id integer NOT NULL,
    vehicle_id integer NOT NULL,
    item_name character varying(100) NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    expiry_date date,
    last_restocked timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vehicle_inventory_quantity_check CHECK ((quantity >= 0))
);

ALTER TABLE ONLY ambulances ALTER COLUMN vehicle_id SET DEFAULT nextval('ambulances_vehicle_id_seq'::regclass);

ALTER TABLE ONLY drivers ALTER COLUMN driver_id SET DEFAULT nextval('drivers_driver_id_seq'::regclass);

ALTER TABLE ONLY shift_schedules ALTER COLUMN schedule_id SET DEFAULT nextval('shift_schedules_schedule_id_seq'::regclass);

ALTER TABLE ONLY vehicle_inventory ALTER COLUMN inventory_id SET DEFAULT nextval('vehicle_inventory_inventory_id_seq'::regclass);

ALTER TABLE ONLY ambulances
    ADD CONSTRAINT ambulances_license_plate_key UNIQUE (license_plate);

ALTER TABLE ONLY ambulances
    ADD CONSTRAINT ambulances_pkey PRIMARY KEY (vehicle_id);

ALTER TABLE ONLY drivers
    ADD CONSTRAINT drivers_license_no_key UNIQUE (license_no);

ALTER TABLE ONLY drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (driver_id);

ALTER TABLE ONLY shift_schedules
    ADD CONSTRAINT shift_schedules_driver_id_shift_date_start_time_key UNIQUE (driver_id, shift_date, start_time);

ALTER TABLE ONLY shift_schedules
    ADD CONSTRAINT shift_schedules_pkey PRIMARY KEY (schedule_id);

ALTER TABLE ONLY vehicle_inventory
    ADD CONSTRAINT vehicle_inventory_pkey PRIMARY KEY (inventory_id);

ALTER TABLE ONLY shift_schedules
    ADD CONSTRAINT shift_schedules_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE CASCADE;

ALTER TABLE ONLY shift_schedules
    ADD CONSTRAINT shift_schedules_zone_assigned_fkey FOREIGN KEY (zone_assigned) REFERENCES dispatch_zones(zone_id);

ALTER TABLE ONLY vehicle_inventory
    ADD CONSTRAINT vehicle_inventory_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES ambulances(vehicle_id) ON DELETE CASCADE;
