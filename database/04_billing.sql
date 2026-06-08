-- Financial records and invoices generated upon completion of emergency trips
CREATE TABLE billing (
    bill_id integer NOT NULL,
    trip_id character varying(20) NOT NULL,
    patient_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    tax numeric(10,2) DEFAULT 0.00,
    total_amount numeric(10,2) GENERATED ALWAYS AS ((amount + tax)) STORED,
    payment_status character varying(20) DEFAULT 'Unpaid'::character varying,
    date_issued date DEFAULT CURRENT_DATE,
    date_paid date,
    CONSTRAINT billing_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['Unpaid'::character varying, 'Paid'::character varying, 'Waived'::character varying, 'Insurance'::character varying])::text[])))
);

ALTER TABLE ONLY billing ALTER COLUMN bill_id SET DEFAULT nextval('billing_bill_id_seq'::regclass);

ALTER TABLE ONLY billing
    ADD CONSTRAINT billing_pkey PRIMARY KEY (bill_id);

ALTER TABLE ONLY billing
    ADD CONSTRAINT billing_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(patient_id);

ALTER TABLE ONLY billing
    ADD CONSTRAINT billing_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES trip_logs(trip_id) ON DELETE CASCADE;
