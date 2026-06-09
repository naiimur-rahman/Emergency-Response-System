# 🎬 Druto Sheba: Project Demo Video Script

**Target Length:** ~12-15 Minutes  
**Language:** Bangla (with technical terms in English)  
**Tone:** Professional, Confident, and Explanatory

---

## 1. Project Overview (1.5 Minutes)

**[Screen: Show the Landing Page or Home Screen of your project]**

**Speaker:** 
"Assalamu Alaikum. Amader project er nam **Druto Sheba - Emergency Response System**. 

Amader deshe emergency medical situation e somoymoto ambulance ba specialist doctor khuje paoa ekta boro challenge. Thik shomoye response na paoar karone onek jibon jhumkir mukhe pore. Ei problem ti effectively solve korar jonnoi amra Druto Sheba system ti develop korechi.

Eti ekti real-time, location-based platform. Ekhane ekjon **Patient** emergency SOS er madhyome instant ambulance call korte parbe, ambulance er live location map-e track korte parbe, ebong specific hospital er specialist doctor-der sathe appointment book korte parbe. 

Amader system e total 3 ti main portal ache: 
1. **Patient Portal**: Jekhan theke service request kora hoy.
2. **Dispatcher/Admin Portal**: Jekhan theke hospital authority ba admin shob emergency request control kore ebong ambulance assign kore.
3. **Driver Portal**: Jekhan theke ambulance driver tader trip manage kore ebong live location share kore.

Cholun ebar amader system er internal database architecture ti dekhe nei."

---

## 2. Database Design & Normalization (4 Minutes)

**[Screen: Open and zoom in on the `pure_ER_diagram.md` or a visual diagram]**

**Speaker:** 
"Eti hocche amader project er Entity Relationship ba **ER Diagram**. Amader full system ti chalachol korar jonno amra total **27 ti tables** design korechi.

Ekhane main entity gulo hocche `Patients`, `Hospitals`, `Ambulances`, `Drivers`, `Doctors`, `Emergency_Requests`, ebong `Trip_Logs`. Amader database er relationship gulo emonvabe map kora jate data redundancy ekdom na thake. 
Jemon, ekjon patient multiple emergency request korte pare, tai `Patients` ebong `Emergency_Requests` er moddhe amra **One-to-Many** relationship use korechi. Abar ekta emergency request er বিপরীতে ektai trip log thakbe, tai `Emergency_Requests` ebong `Trip_Logs` er relation hocche **One-to-One**.

**[Screen: Show the Relational Schema code / SQL tables]**

Akhon ami Normalization process niye kotha bolbo. Amader database ti strictly **3rd Normal Form (3NF)** e normalized:

1. **First Normal Form (1NF):** Amader protita table er cell e atomic data ache. Kono column e comma-separated ba multiple values nei. Protita table er jonno ekta unique Primary Key (jemon `Patient_ID`, `Trip_ID`) define kora ache.
2. **Second Normal Form (2NF):** Amader database e kono partial dependency nei. Table er shob non-key attribute directly full Primary Key er upor dependent. 
3. **Third Normal Form (3NF):** Amader kono transitive dependency nei. Udahoronshorup, `Doctors` table e amra directly Hospital er nam text hishebe na likhe, `Hospital_ID` ke **Foreign Key** hishebe use korechi. Ete kore data duplicate hoy na ebong future-e hospital er nam update korle database er update anomaly thekano jay."

---

## 3. SQL Query & Advanced Features Demo (4 Minutes)

**[Screen: Open your SQL terminal, PgAdmin, or Supabase SQL Editor]**

**Speaker:** 
"Ebar ami amader database theke kisu important SQL query execute kore dekhabo.

**Query 1: JOIN & Filtering (Show complex relationships)**
Prothom query ti diye amra dekhte chai kon patient er ki dhoroner emergency chilo, kobe dispatch hoyeche ebong kon driver geche. Ekhane amra multiple table JOIN korchi."

**[Action: Execute Query 1]**
```sql
SELECT 
    er.request_id, 
    p.name AS patient_name, 
    er.emergency_type, 
    h.name AS hospital_name, 
    tl.time_dispatched,
    d.name AS driver_name
FROM emergency_requests er
JOIN patients p ON er.patient_id = p.patient_id
JOIN trip_logs tl ON er.request_id = tl.trip_id
JOIN hospitals h ON tl.hospital_id = h.hospital_id
JOIN drivers d ON tl.driver_id = d.driver_id
ORDER BY tl.time_dispatched DESC LIMIT 5;
```

**Speaker:** 
"Result e dekhte pacchen join er madhyome amra relational data gulo ek sathe niye aschi. 

**Query 2: Aggregation & Grouping**
Ditiyo query te amra aggregation function use kore count korbo je kon hospital e koyta emergency case geche ebong tader total koto revenue asche."

**[Action: Execute Query 2]**
```sql
SELECT 
    h.name AS hospital_name,
    COUNT(tl.trip_id) AS total_emergency_cases,
    SUM(b.total_amount) AS total_revenue
FROM hospitals h
JOIN trip_logs tl ON h.hospital_id = tl.hospital_id
JOIN billing b ON tl.trip_id = b.trip_id
GROUP BY h.name
ORDER BY total_emergency_cases DESC;
```

**Speaker:** 
"Ebar ashi Subquery te. 

**Query 3: Subquery Analysis**
Amra ei query-r madhyome sei shob ambulance gulo ber korbo jader maintenance cost amader average maintenance cost er cheye beshi. Ete kore amra company-r expense track korte parbo."

**[Action: Execute Query 3]**
```sql
SELECT a.license_plate, m.maintenance_type, m.cost 
FROM maintenance_logs m
JOIN ambulances a ON m.vehicle_id = a.vehicle_id
WHERE m.cost > (
    SELECT AVG(cost) FROM maintenance_logs
);
```

**Speaker:** 
"Sudhu sadharon query noy, amra database e **Advanced Features** o implement korechi.
- **Views:** Dashboard er summary data fast load korar jonno amra `emergency_analytics_mv` name ekta Materialized View toiri korechi jeta automatically daily trip, average response time ebong revenue calculate kore rakhe.
- **Triggers:** Amader database e Postgres Triggers ache. Jokhon dispatcher ekta trip 'Arrived' ba 'Completed' mark kore, tokhon automated trigger er madhyome backend theke automatically ambulance er status 'Available' e change hoye jay, ebong driver er status update hoye jay. Eta fully automated."

---

## 4. Core Functionalities Demonstration (3.5 Minutes)

**[Screen: Go to Patient Portal UI]**

**Speaker:** 
"Ebar ami amader system er main workflow ta frontend UI theke practically run kore dekhabo.

Prothomei eta amader **Patient Portal**. Ekjon patient login korar por dashboard e ekta SOS button dekhte parbe. (Click SOS)
Patient jokhon SOS trigger korbe, tar phone er GPS theke live coordinates database e pathano hoy. 

ChAley patient ekhane Doctor o book korte parbe. (Navigate to 'Book Doctor' page)
Ekhane hospital ebong specialization (jemon Cardiology ba Orthopedics) select korle database theke available doctor der list chole asbe. System e validation kora ache je ekjon patient er ektai active appointment thakte parbe. Booking korar por button ta directly 'Cancel Appointment' e porinoto hoye jay. 

**[Screen: Switch to Dispatcher Portal]**

Patient jokhon SOS request kore, sathe sathe eta **Dispatcher Portal** er live dashboard e chole ashe.
(Show Dispatcher Portal Map). 
Dispatcher map er moddhe real-time shob patient er pickup location ebong available ambulance er location dekhte pan. Dispatcher eikhan theke closest ambulance k select kore assign korle, request ti automatically driver er kache chole jay.

**[Screen: Switch to Admin Portal]**

Echaraw amader ekta secure **Admin Portal** ache jekhan theke system er puro operations manage kora hoy. (Navigate through Admin Dashboard). 
Ekhane admin chaile Patients, Ambulances, Hospitals, ebong total Billing er statistics dekhte pare. Doctor der assigning ebong tader availability control korar jonno ekhane ekti dedicated system ache. Ekhane data load optimized rakhbar jonno amra backend theke complex pagination use korechi jate hajar hajar doctors er data smoothly load hoy.

**[Screen: Switch to Driver Portal]**

Eti **Driver Portal**. Driver tar dashboard e trip request dekhte parbe. Trip start korle, background theke continously driver er location patient ke pathano hote thake, ja patient map-e dekhte pare (Uber ba Pathao er moto). 
Trip shesh hole automatically bill generate hoye jay ebong database trigger er madhyome sei ambulance ti next trip er jonno available hoye jay.

Shobgulo user interface khub-i modern, component-based ebong dark-mode supported design e kora hoyeche jate night-time eo user-friendly hoy."

---

## Conclusion (30 Seconds)

**Speaker:**
"To sum up, Druto Sheba hocche ekta complete, fully-normalized relational database back-end and modern interactive UI er ekta proper implementation ja real-world emergency response problems effectively handle korte sakkhom. 

Thank you for your time and for watching the demonstration of our project."
