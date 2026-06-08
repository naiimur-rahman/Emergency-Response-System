import psycopg2
import random
import re

DATABASE_URL = "postgresql://postgres.pwkdehymrayzdzgcaxzv:Sohan786%400112420186@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"

prefixes = ['KA', 'KHA', 'GA', 'GHA', 'CHA', 'CHHA']

def gen_plate():
    return f"DHAKA METRO-{random.choice(prefixes)} {random.randint(11,99)}-{random.randint(1000,9999)}"

# Connect to the DB
conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Fetch all ambulance IDs
cursor.execute("SELECT vehicle_id FROM Ambulances;")
ambulances = cursor.fetchall()

# Update each
for amb in ambulances:
    plate = gen_plate()
    cursor.execute("UPDATE Ambulances SET License_Plate = %s WHERE vehicle_id = %s;", (plate, amb[0]))

conn.commit()
cursor.close()
conn.close()

print("Successfully updated database!")

# Now patch seed.sql
with open('database/seed.sql', 'r') as f:
    content = f.read()

def replacer(match):
    return f"('{gen_plate()}'"

new_content = re.sub(r"\('DHK-(?:METRO-AMB|MEGA)-\d+'", replacer, content)

with open('database/seed.sql', 'w') as f:
    f.write(new_content)

print("Successfully updated seed.sql!")
