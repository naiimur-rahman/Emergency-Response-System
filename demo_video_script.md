# 🎬 Druto Sheba: Project Demo Video Script

**Target Length:** ~12-15 Minutes  
**Language:** Bangla (with technical terms in English)  
**Tone:** Professional, Confident, and Explanatory

---

## 1. Project Overview (1.5 Minutes)

**[Screen: Show the Landing Page or Home Screen of your project]**

**Speaker:** 
"আসসালামু আলাইকুম। আমাদের প্রজেক্টের নাম **Druto Sheba - Emergency Response System**।

আমাদের দেশে emergency medical situation-এ সময়মতো ambulance বা specialist doctor খুঁজে পাওয়া একটা বড় challenge। ঠিক সময়ে response না পাওয়ার কারণে অনেক জীবন হুমকির মুখে পড়ে। এই problem-টি effectively solve করার জন্যই আমরা Druto Sheba system-টি develop করেছি।

এটি একটি real-time, location-based platform। এখানে একজন **Patient** emergency SOS-এর মাধ্যমে instant ambulance call করতে পারবেন, ambulance-এর live location map-এ track করতে পারবেন এবং নির্দিষ্ট hospital-এর specialist doctor-দের সাথে appointment book করতে পারবেন।

আমাদের system-এ total ৩টি main portal আছে:
1. **Patient Portal**: যেখান থেকে service request করা হয়।
2. **Dispatcher/Admin Portal**: যেখান থেকে hospital authority বা admin সব emergency request control করে এবং ambulance assign করে।
3. **Driver Portal**: যেখান থেকে ambulance driver তাদের trip manage করে এবং live location share করে।

চলুন এবার আমাদের system-এর internal database architecture-টি দেখে নিই।"

---

## 2. Database Design & Normalization (4 Minutes)

**[Screen: Open and zoom in on the `pure_ER_diagram.md` or a visual diagram]**

**Speaker:** 
"এটি হচ্ছে আমাদের প্রজেক্টের Entity Relationship বা **ER Diagram**। আমাদের full system-টি চালানোর জন্য আমরা total **২৭টি tables** design করেছি।

এখানে main entity গুলো হচ্ছে `Patients`, `Hospitals`, `Ambulances`, `Drivers`, `Doctors`, `Emergency_Requests` এবং `Trip_Logs`। আমাদের database-এর relationship গুলো এমনভাবে map করা যাতে data redundancy একদম না থাকে।
যেমন, একজন patient multiple emergency request করতে পারে, তাই `Patients` এবং `Emergency_Requests`-এর মধ্যে আমরা **One-to-Many** relationship use করেছি। আবার একটা emergency request-এর বিপরীতে একটাই trip log থাকবে, তাই `Emergency_Requests` এবং `Trip_Logs`-এর relation হচ্ছে **One-to-One**।

**[Screen: Show the Relational Schema code / SQL tables]**

এখন আমি Normalization process নিয়ে কথা বলবো। আমাদের database-টি strictly **3rd Normal Form (3NF)**-এ normalized:

1. **First Normal Form (1NF):** আমাদের প্রতিটা table-এর cell-এ atomic data আছে। কোনো column-এ comma-separated বা multiple values নেই। প্রতিটা table-এর জন্য একটা unique Primary Key (যেমন `Patient_ID`, `Trip_ID`) define করা আছে।
2. **Second Normal Form (2NF):** আমাদের database-এ কোনো partial dependency নেই। Table-এর সব non-key attribute directly full Primary Key-এর উপর dependent।
3. **Third Normal Form (3NF):** আমাদের কোনো transitive dependency নেই। উদাহরণস্বরূপ, `Doctors` table-এ আমরা directly Hospital-এর নাম text হিসেবে না লিখে, `Hospital_ID` কে **Foreign Key** হিসেবে use করেছি। এতে করে data duplicate হয় না এবং future-এ hospital-এর নাম update করলে database-এর update anomaly ঠেকানো যায়।"

---

## 3. SQL Query & Advanced Features Demo (4 Minutes)

**[Screen: Open your SQL terminal, PgAdmin, or Supabase SQL Editor]**

**Speaker:** 
"এবার আমি আমাদের database থেকে কিছু important SQL query execute করে দেখাবো।

**Query 1: JOIN (Multiple tables combine করা)**
প্রথম query-টি দিয়ে আমরা দেখতে চাই কোন patient-এর জন্য কোন হাসপাতাল থেকে কোন ambulance assign করা হয়েছে এবং ড্রাইভার কে। এখানে আমরা multiple table JOIN করেছি।"

**[Action: Execute Query 1 (`01_join_query.sql`)]**
```sql
SELECT 
    er.request_id,
    p.name AS patient_name,
    h.name AS assigned_hospital,
    a.license_plate AS ambulance,
    d.name AS driver_name
FROM trip_logs tl
JOIN emergency_requests er ON tl.trip_id::text = er.request_id::text
JOIN patients p ON er.patient_id = p.patient_id
JOIN hospitals h ON tl.hospital_id = h.hospital_id
JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
JOIN drivers d ON tl.driver_id = d.driver_id;
```

**Speaker:** 
"Result-এ দেখতে পাচ্ছেন JOIN-এর মাধ্যমে আমরা relational data গুলো একসাথে নিয়ে এসেছি।

**Query 2: Aggregation & Grouping**
দ্বিতীয় query-তে আমরা Aggregation function use করে বের করবো প্রতিটা hospital-এর average response time কত মিনিট।"

**[Action: Execute Query 2 (`02_aggregation_query.sql`)]**
```sql
SELECT 
    h.name AS hospital_name,
    AVG(EXTRACT(epoch FROM (tl.time_reached_hospital - tl.time_dispatched)) / 60) AS avg_response_time_minutes
FROM trip_logs tl
JOIN hospitals h ON tl.hospital_id = h.hospital_id
WHERE tl.time_reached_hospital IS NOT NULL
GROUP BY h.name;
```

**Speaker:** 
"এখানে `AVG` এবং `GROUP BY` use করে আমরা data summarize করেছি।

**Query 3: Subquery Analysis**
এখন আসি Subquery-তে। এই query-র মাধ্যমে আমরা সেইসব patient-দের খুঁজে বের করবো যাদের একাধিক 'Critical' emergency request ছিল। এখানে Main query-র ভেতরে একটি subquery use করা হয়েছে।"

**[Action: Execute Query 3 (`03_subquery_query.sql`)]**
```sql
SELECT name, phone 
FROM patients
WHERE patient_id IN (
    SELECT patient_id 
    FROM emergency_requests 
    WHERE severity_level = 'Critical' 
    GROUP BY patient_id 
    HAVING COUNT(*) > 1
);
```

**Speaker:** 
"শুধু সাধারণ query নয়, আমরা database-এ **Advanced Features**-ও implement করেছি।
- **Views:** Analytics dashboard-এর summary data fast load করার জন্য আমরা `emergency_analytics_mv` নামে একটা Materialized View তৈরি করেছি যা automatically calculate করে রাখে।
- **Triggers:** আমাদের database-এ Postgres Triggers আছে। যেমন, যখন একটি নতুন emergency request insert হয়, তখন একটি automated trigger patient-এর history analyze করে severity level auto-predict করতে পারে।"

---

## 4. Core Functionalities Demonstration (3.5 Minutes)

**[Screen: Go to Patient Portal UI]**

**Speaker:** 
"এবার আমি আমাদের system-এর main workflow-টা frontend UI থেকে practically run করে দেখাবো।

প্রথমেই এটা আমাদের **Patient Portal**। একজন patient login করার পর dashboard-এ একটা SOS button দেখতে পারবে। (Click SOS)
Patient যখন SOS trigger করবে, তার phone-এর GPS থেকে live coordinates database-এ পাঠানো হয়।

এছাড়া patient এখানে Doctor-ও book করতে পারবে। (Navigate to 'Book Doctor' page)
এখানে hospital এবং specialization (যেমন Cardiology বা Orthopedics) select করলে database থেকে available doctor-দের list চলে আসবে। System-এ validation করা আছে যে একজন patient-এর একটাই active appointment থাকতে পারবে। Booking করার পর button-টা directly 'Cancel Appointment'-এ পরিণত হয়ে যায়।

**[Screen: Switch to Dispatcher Portal]**

Patient যখন SOS request করে, সাথে সাথে এটা **Dispatcher Portal**-এর live dashboard-এ চলে আসে।
(Show Dispatcher Portal Map). 
Dispatcher map-এর মধ্যে real-time সব patient-এর pickup location এবং available ambulance-এর location দেখতে পান। Dispatcher এখান থেকে closest ambulance-কে select করে assign করলে, request-টি automatically driver-এর কাছে চলে যায়।

**[Screen: Switch to Admin Portal]**

এরপর আমাদের একটা secure **Admin Portal** আছে যেখান থেকে system-এর পুরো operations manage করা হয়। (Navigate through Admin Dashboard).
এখানে admin চাইলে Patients, Ambulances, Hospitals এবং total Billing-এর statistics দেখতে পারে। Doctor-দের assigning এবং তাদের availability control করার জন্য এখানে একটি dedicated system আছে। Data load optimized রাখার জন্য আমরা backend থেকে complex pagination use করেছি যাতে হাজার হাজার doctor-দের data smoothly load হয়।

**[Screen: Switch to Driver Portal]**

এটি **Driver Portal**। Driver তার dashboard-এ trip request দেখতে পারবে। Trip start করলে, background থেকে continuously driver-এর location patient-কে পাঠানো হতে থাকে, যা patient map-এ দেখতে পারে (Uber বা Pathao-এর মতো)।
Trip শেষ হলে automatically bill generate হয়ে যায় এবং database trigger-এর মাধ্যমে সেই ambulance-টি next trip-এর জন্য available হয়ে যায়।

সবগুলো user interface খুবই modern, component-based এবং dark-mode supported design-এ করা হয়েছে যাতে night-time-এও user-friendly হয়।"

---

## Conclusion (30 Seconds)

**Speaker:**
"To sum up, Druto Sheba হচ্ছে একটা complete, fully-normalized relational database back-end এবং modern interactive UI-এর একটা proper implementation যা real-world emergency response problems effectively handle করতে সক্ষম।

Thank you for your time and for watching the demonstration of our project."
