import os

base_dir = '/Users/naimurrahman/Downloads/Emergency-Response-System/database'
pres_dir = os.path.join(base_dir, 'presentation')
os.makedirs(pres_dir, exist_ok=True)

# 1. Split schema.sql
with open(os.path.join(base_dir, 'schema.sql'), 'r') as f:
    schema_lines = f.readlines()

out = None
for i, line in enumerate(schema_lines):
    if i == 0:
        out = open(os.path.join(pres_dir, '01_Enums_and_Setup.sql'), 'w')
    elif '-- 1. Core Tables' in line and i < 100:
        out.close()
        out = open(os.path.join(pres_dir, '02_Core_Tables.sql'), 'w')
    elif '-- 2. Views & Triggers' in line:
        out.close()
        out = open(os.path.join(pres_dir, '03_Views_Triggers_Functions.sql'), 'w')
    elif '-- 1. Expanded Tables' in line:
        out.close()
        out = open(os.path.join(pres_dir, '04_Advanced_Tables.sql'), 'w')
    elif '-- 2. Advanced Performance Logic' in line:
        out.close()
        out = open(os.path.join(pres_dir, '05_Indexes_and_Views.sql'), 'w')
    elif '-- 1. COMMUNICATION LAYER' in line:
        out.close()
        out = open(os.path.join(pres_dir, '06_Communication_Dispatch.sql'), 'w')
    
    out.write(line)

if out: out.close()

# 2. Split seed.sql
with open(os.path.join(base_dir, 'seed.sql'), 'r') as f:
    seed_lines = f.readlines()

out = None
for i, line in enumerate(seed_lines):
    if i == 0:
        out = open(os.path.join(pres_dir, '07_Seed_Data_Core.sql'), 'w')
    elif '-- DRUTO SHEBA: ADVANCED QUERY SHOWCASE' in line:
        out.close()
        out = open(os.path.join(pres_dir, '08_Demo_Queries.sql'), 'w')
    elif '-- DRUTO SHEBA: MEGA SEED DATA GENERATOR (V2)' in line:
        out.close()
        out = open(os.path.join(pres_dir, '09_Mega_Seed_Generator.sql'), 'w')
    
    out.write(line)

if out: out.close()

print(f"Successfully split files into {pres_dir}")
