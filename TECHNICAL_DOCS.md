# 📐 Technical Documentation: Druto Sheba Architecture

This document provides a deep dive into the underlying architecture, algorithms, and database design of the Druto Sheba Emergency Response System.

---

## 1. Database Architecture (PostGIS Driven)

The system leverages **PostgreSQL** with the **PostGIS** extension to handle complex spatial operations. This allows for:
*   **Proximity Ranking**: Using `ST_Distance` to find the nearest ambulance or hospital relative to a patient's GPS coordinates.
*   **Geofencing**: Utilizing `ST_Contains` to analyze emergency request volume across different **Dispatch Zones**.
*   **Coordinate Precision**: Storing all location data as `GEOMETRY(Point, 4326)` for global accuracy.

### Core Entity Relationships
*   **Emergency_Requests**: The central transaction table. Linked to `Patients` and `Trip_Logs`.
*   **Trip_Logs**: Joins `Ambulances`, `Drivers`, and `Hospitals` to represent a full mission lifecycle.
*   **Materialized Views**: The `emergency_analytics_mv` provides pre-aggregated stats for the Admin panel, ensuring lightning-fast dashboard performance despite high data volume.

---

## 2. Intelligent Dispatch Algorithm (`fn_automated_dispatch`)

The heart of the system is a PL/pgSQL function that handles resource allocation in a single ACID-compliant transaction.

### Features:
1.  **Specialization Matching**: Automatically maps patient conditions (e.g., "Heart Attack") to specialized hospitals (e.g., "Cardiology").
2.  **Resource Filtering**: 
    *   Filters ambulances by equipment level (Critical cases require **Advanced** units).
    *   Filters hospitals by real-time bed availability (ICU vs. General).
3.  **Concurrency Control**: Uses `FOR UPDATE` row-level locking to prevent race conditions where two dispatchers might assign the same ambulance simultaneously.
4.  **Manual Override**: Allows dispatchers to bypass the algorithm if they have specific instructions to use a particular hospital.

---

## 3. Real-Time Telemetry & Communication

### MQTT Architecture
*   **Broker**: HiveMQ Cloud.
*   **Topic Structure**: `emergency/ambulance/location` for fleet-wide telemetry.
*   **Protocol**: WebSockets (port 8884) for frontend integration via `mqtt.js`.

### Internal Messaging
The `chat_messages` table stores all system-generated and dispatcher-to-driver communications, indexed by `trip_id` for instant lookup during active missions.

---

## 4. Automation & Triggers

*   **Predictive Maintenance**: `trg_release_resources` automatically flags ambulances for maintenance after 50 successful trips.
*   **Automated Billing**: Generates a detailed bill (`Billing` table) immediately upon trip resolution based on base fee, distance traveled (KM), and ambulance equipment level.
*   **Severity Predictor**: `trg_predict_severity` automatically upgrades an emergency to "Critical" if the patient's history contains high-risk keywords (e.g., "Heart", "Stroke").

---

## 5. Performance Optimization

*   **Indexing**: GIST indexes on all spatial columns and B-Tree indexes on status enums and foreign keys.
*   **Safety Layers**: All analytics routes utilize a `safeQuery` wrapper to prevent total system failure if a specific query fails or the database is under heavy load.
*   **Timezone Enforcement**: All timestamps are handled via `Asia/Dhaka` timezone at the database level to ensure cross-portal consistency.

---
**Technical Lead: Antigravity AI**  
**Version: 2.0.0**  
**Build Date: May 2026**
