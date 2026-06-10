# 🎬 SQL Queries Presentation Script (Target: 5 Minutes)

**[Introduction - 30 Seconds]**

**Speaker:**
"আমাদের ডেটাবেস আর্কিটেকচার এবং নরমালাইজেশন দেখার পর, এবার আমি সরাসরি ৫টি গুরুত্বপূর্ণ SQL Query রান করে দেখাবো। এখানে আমরা JOINs, Subqueries, Materialized Views এবং UNION-এর প্র্যাকটিক্যাল ইমপ্লিমেন্টেশন দেখবো। চলুন শুরু করা যাক।"

---

**[Query 1: Complex JOIN Operation - 1 Minute]**

**[Action: Screen-এ প্রথম কোয়েরিটি রান করুন]**
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
"প্রথম কোয়েরিটি হচ্ছে একটি Complex JOIN অপারেশন। এই কোয়েরির মাধ্যমে আমরা `trip_logs` টেবিলের সাথে আরও ৫টি টেবিলকে JOIN করেছি। এর ফলে আমরা আইডিগুলোর বদলে মানুষের পড়ার উপযোগী একটি পূর্ণাঙ্গ রিপোর্ট পাচ্ছি—যেখানে পেশেন্টের নাম, অ্যাসাইন করা হসপিটাল, অ্যাম্বুলেন্স এবং ড্রাইভারের নাম একসাথে দেখা যাচ্ছে।"

---

**[Query 2: Subquery & HAVING Clause - 1 Minute]**

**[Action: Screen-এ দ্বিতীয় কোয়েরিটি রান করুন]**
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
"দ্বিতীয় কোয়েরিটিতে আমরা Subquery এবং Aggregation-এর ব্যবহার দেখিয়েছি। এর মূল উদ্দেশ্য হলো হাই-রিস্ক পেশেন্টদের খুঁজে বের করা। ভেতরের Subquery-টি ফিল্টার করছে যাদের একের অধিক 'Critical' ইমার্জেন্সি রেকর্ড আছে। এরপর বাইরের Main query-টি সেই আইডিগুলো ব্যবহার করে তাদের নাম এবং ফোন নম্বর বের করে আনছে।"

---

**[Query 3: Materialized View - 45 Seconds]**

**[Action: Screen-এ তৃতীয় কোয়েরিটি রান করুন]**
```sql
SELECT * FROM emergency_analytics_mv;
```

**Speaker:**
"তৃতীয় কোয়েরিটি একটি Materialized View থেকে ডেটা ফেচ করছে। ড্যাশবোর্ডে বারবার কমপ্লেক্স ক্যালকুলেশন করলে ডেটাবেস স্লো হয়ে যায়। তাই `emergency_analytics_mv` ব্যাকএন্ডে আগে থেকেই ক্যালকুলেশন করে ডেটা স্টোর করে রাখে, ফলে `SELECT *` করলেই মিলি-সেকেন্ডের মধ্যে ড্যাশবোর্ডের সামারি চলে আসে।"

---

**[Query 4: Revisiting JOIN Operation - 30 Seconds]**

**[Action: Screen-এ চতুর্থ কোয়েরিটি রান করুন]**
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
"চতুর্থ ধাপে আমরা আগের সেই Complex JOIN কোয়েরিটিই আবার এক্সিকিউট করছি। অনেক সময় একই স্ট্রাকচারের ডেটা বিভিন্ন রিপোর্টিং টুল বা ড্যাশবোর্ড মডিউলে বারবার প্রয়োজন হয়। এই অপটিমাইজড JOIN কোয়েরিটি যেকোনো ফিল্টার বা কন্ডিশন ছাড়া পুরো ট্রিপ ওভারভিউ জেনারেট করতে অত্যন্ত কার্যকর।"

---

**[Query 5: UNION ALL & Conditional Aggregation - 1 Minute 15 Seconds]**

**[Action: Screen-এ পঞ্চম কোয়েরিটি রান করুন]**
```sql
SELECT 
    'Ambulances' as resource_type,
    current_status::text as status_or_type, 
    COUNT(vehicle_id) as available_count
FROM ambulances
GROUP BY current_status
UNION ALL
SELECT 
    'Doctors' as resource_type,
    CASE WHEN is_available THEN 'Available' ELSE 'Busy' END as status_or_type,
    COUNT(doctor_id) as available_count
FROM doctors
GROUP BY is_available;
```

**Speaker:**
"আমাদের পঞ্চম ও শেষ কোয়েরিটিতে আমরা UNION ALL এবং Conditional Logic (CASE) ব্যবহার করেছি। এখানে `ambulances` এবং `doctors`—এই দুটি সম্পূর্ণ ভিন্ন টেবিল থেকে ডেটা প্রসেস করে একটি সিঙ্গেল রেজাল্ট সেটে আনা হয়েছে। এর ফলে অ্যাডমিনরা এক নজরেই দেখতে পারবেন এই মুহূর্তে মোট কতগুলো অ্যাম্বুলেন্স এবং কতজন ডাক্তার ফ্রি বা বিজি আছেন।"

---

**[Conclusion - 15 Seconds]**

**Speaker:**
"এই ৫টি কোয়েরি আমাদের ডেটাবেসের কমপ্লেক্সিটি এবং অপটিমাইজেশনকে খুব সুন্দরভাবে তুলে ধরে। ধন্যবাদ।"
