import random
import uuid
import datetime

# Real-life sounding names
male_first_names = ["Naimur", "Rahim", "Karim", "Sohan", "Hasan", "Jamal", "Rafiq", "Riaz", "Omar", "Imran", "Arif", "Rakib"]
female_first_names = ["Nabila", "Fatema", "Ayesha", "Salma", "Sadia", "Tahmina", "Nusrat", "Tasnim"]
all_first_names = male_first_names + female_first_names
last_names = ["Rahman", "Mirza", "Sikder", "Hossain", "Islam", "Khan", "Chowdhury", "Ahmed", "Akter", "Uddin", "Begum", "Ali", "Haque", "Das", "Sarkar"]

def get_name(male_only=False):
    first_name_list = male_first_names if male_only else all_first_names
    return f"{random.choice(first_name_list)} {random.choice(last_names)}"

hospitals_list = [
    "Dhaka Medical College Hospital",
    "Square Hospital",
    "Apollo Hospital",
    "United Hospital",
    "Kuwait Bangladesh Friendship Hospital",
    "BIRDEM General Hospital",
    "Holy Family Red Crescent Hospital",
    "Kurmitola General Hospital",
    "Labaid Specialized Hospital",
    "Ibn Sina Hospital"
]

out = open("database/06_seed_data.sql", "w")
out.write("SELECT pg_catalog.set_config('search_path', 'public', false);\n\n")

out.write("INSERT INTO hospitals (name, location_coords, general_beds, icu_beds, type) VALUES\n")
hospitals = []
for i in range(1, 11):
    hospitals.append(f"('{hospitals_list[i-1]}', ST_SetSRID(ST_MakePoint({90.35 + random.random()*0.1}, {23.7 + random.random()*0.1}), 4326), 100, 20, 'Private')")
out.write(",\n".join(hospitals) + ";\n\n")

out.write("INSERT INTO drivers (name, license_no, shift_status, phone) VALUES\n")
drivers = []
for i in range(1, 51):
    drivers.append(f"('{get_name(male_only=True)}', 'LIC{random.randint(10000, 99999)}', 'On_Duty', '01711000{i:03d}')")
out.write(",\n".join(drivers) + ";\n\n")

out.write("INSERT INTO dispatchers (name, shift_time) VALUES ('Dispatcher 1', 'Morning');\n\n")

out.write("INSERT INTO patients (name, phone, blood_type, address, primary_specialization) VALUES\n")
patients = []
blood_types = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
for i in range(1, 101):
    patients.append(f"('{get_name()}', '01811000{i:03d}', '{random.choice(blood_types)}', 'Address {i}', 'General')")
out.write(",\n".join(patients) + ";\n\n")

out.write("INSERT INTO ambulances (license_plate, equipment_level, current_status, trips_since_maintenance, hub) VALUES\n")
ambulances = []
for i in range(1, 21):
    ambulances.append(f"('DHA-Metro-{random.randint(11, 99)}-{random.randint(1000, 9999)}', 'Advanced Life Support', 'Available', 0, ST_SetSRID(ST_MakePoint(90.4, 23.7), 4326))")
out.write(",\n".join(ambulances) + ";\n\n")

out.write("INSERT INTO emergency_requests (request_id, patient_id, pickup_coords, severity_level, status) VALUES\n")
requests = []
req_ids = []
for i in range(1, 51):
    rid = f"NX-{uuid.uuid4().hex[:8].upper()}"
    req_ids.append(rid)
    pid = random.randint(1, 100)
    severity = random.choice(['Low', 'Medium', 'High', 'Critical'])
    requests.append(f"('{rid}', {pid}, ST_SetSRID(ST_MakePoint({90.35 + random.random()*0.1}, {23.7 + random.random()*0.1}), 4326), '{severity}', 'Resolved')")
out.write(",\n".join(requests) + ";\n\n")

out.write("INSERT INTO trip_logs (trip_id, vehicle_id, driver_id, hospital_id, dispatcher_id, time_dispatched, time_arrived_scene, time_reached_hospital) VALUES\n")
trips = []
for rid in req_ids:
    vid = random.randint(1, 20)
    did = random.randint(1, 50)
    hid = random.randint(1, 10)
    td = datetime.datetime.now() - datetime.timedelta(days=random.randint(0, 10), hours=random.randint(0, 23))
    ta = td + datetime.timedelta(minutes=random.randint(10, 30))
    th = ta + datetime.timedelta(minutes=random.randint(15, 45))
    trips.append(f"('{rid}', {vid}, {did}, {hid}, 1, '{td}', '{ta}', '{th}')")
out.write(",\n".join(trips) + ";\n\n")

out.close()
print("Seed data generated.")
