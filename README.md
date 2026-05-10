# 🚑 Druto Sheba (দ্রুত সেবা)
### Next-Generation Emergency Response & Fleet Management System

**Druto Sheba** is a high-fidelity, production-grade emergency response platform designed to minimize dispatch latency and optimize hospital resource allocation. Built with a focus on reliability, spatial intelligence, and real-time synchronization, it provides a seamless interface for patients, dispatchers, drivers, and administrators.

---

## 🌟 Core Portals

### 1. 🆘 Patient Portal (`/sos`)
*   **One-Tap SOS**: Instant emergency request with pre-fetched profile data and GPS coordinates.
*   **Live Tracking**: Real-time MQTT-powered tracking of assigned ambulances on a high-fidelity map.
*   **Medical Profiles**: Automated sharing of patient conditions and blood types with medical teams.

### 2. 📻 Dispatcher Dashboard (`/dashboard`)
*   **Command Center**: Live feed of all active emergencies and fleet status.
*   **Intelligent Dispatch**: Automated specialization-aware matching (e.g., Cardiac cases → Cardiology specialized hospitals).
*   **Manual Override**: Ability to manually select hospitals based on real-time bed availability.

### 3. 🗺️ Driver App (`/duty`)
*   **Mission Control**: Instant mission alerts with patient location and severity data.
*   **Navigation**: Optimized routing to patient and then to the assigned hospital.
*   **Status Sync**: Real-time mission state updates (En Route, Picked Up, Arrived).

### 4. 📊 Admin & Analytics (`/analytics`)
*   **Fleet Health**: Predictive maintenance tracking and maintenance logs.
*   **Resource Audit**: Live monitoring of ICU and General bed availability across the hospital network.
*   **Data Insights**: Weekly volume trends, response time analytics, and hospital performance rankings.

---

## 🛠️ Technology Stack

*   **Frontend**: Next.js 15+ (App Router), React 19, Tailwind CSS, Lucide Icons.
*   **Backend**: Next.js API Routes (Serverless).
*   **Database**: PostgreSQL with **PostGIS** extension for spatial intelligence.
*   **Real-time**: MQTT (HiveMQ) for live GPS telemetry and real-time communication.
*   **Mapping**: Leaflet.js with customized high-contrast map themes.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v20+)
*   PostgreSQL (with PostGIS extension)

### Installation
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/naiimur-rahman/Emergency-Response-System.git
    cd Emergency-Response-System/druto-sheba-app
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env.local` inside `druto-sheba-app/` and add your credentials:
    ```env
    PG_CONNECTION_STRING=your_postgresql_url
    TZ=Asia/Dhaka
    NEXT_PUBLIC_MQTT_HOST=your_mqtt_broker
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

---

## 🗄️ Database Management

The project includes a unified management tool for database setup and population.

*   **Full Reset & Seed**: `node database/run.js both`
*   **Schema Update**: `node database/run.js schema`
*   **Mock Data Population**: `node database/run.js seed`

*Note: The system comes with a **Mega Seed** dataset containing 5,000+ records for realistic testing.*

---

## 🌍 Localization
*   **Timezone**: Fully synchronized to **GMT+06 (Asia/Dhaka)**.
*   **Currency**: Optimized for BDT (৳) calculations in the billing module.

---

## 🛡️ License
Built for the **UIU CSE DBMS Project Showcase (2026)**.

---
**DHAKA METRO • SYSTEM V2.0 • 2026**