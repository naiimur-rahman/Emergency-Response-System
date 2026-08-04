# 🚑 Druto Sheba (দ্রুত সেবা)
### 🚀 Next-Generation Emergency Response, PostGIS Spatial Intelligence & Fleet Management System

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/PostgreSQL-PostGIS-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/MQTT-HiveMQ-orange?style=for-the-badge&logo=mqtt" alt="MQTT"/>
</p>

---

## 🌟 Overview
**Druto Sheba** is a production-grade, highly optimized emergency response platform designed to minimize dispatch latency and optimize hospital resource allocation. Built with a focus on spatial intelligence, database-driven workflows, and real-time synchronization, it provides a seamless interface for patients, dispatchers, drivers, and administrators.

---

## 💎 What's New (Recent Updates)
We've recently integrated significant enhancements and bug fixes across the core system:
*   🏥 **Dynamic Doctor Appointment & Scheduling System**: Admins can now choose matching weekdays for doctor duties, and the system automatically calculates the next calendar date for booking.
*   🔄 **Automatic Refund/N/A Transition**: Cancelling a paid booking triggers an automatic refund process (`Refunded` status), while unpaid bookings transition to `N/A` with the payment option hidden.
*   🖨️ **Browser Print Integration**: Clicking "Download PDF" in patient history and billing invoices automatically triggers `window.print()` for immediate physical or PDF copy generation.
*   🧩 **Leaflet.js Memory Patch**: Implemented a global unmount wrapper on `L.Map.prototype._onZoomTransitionEnd` to prevent Leaflet lifecycle crashes during rapid view navigation.
*   🗄️ **Pure-SQL DB Seeding**: Seeded all specialization, doctor, and schedule data through direct SQL migrations, removing dependency on terminal execution scripts.

---

## 🧭 Core Portals & Features

### 1. 🆘 Patient Portal (`/sos`, `/track`, `/appointments`, `/my-bills`, `/history`)
*   **One-Tap SOS**: Instantly triggers emergency requests with profile data and browser-based GPS coordinate parsing.
*   **Live Tracking**: Real-time MQTT-powered tracking of assigned ambulances on an interactive map.
*   **Doctor Bookings**: Request appointments, pay securely, or cancel reservations with instant status feedback.
*   **My Bills & History**: View detailed invoice summaries with VAT/total breakdowns and download PDFs with one click.

### 2. 📻 Dispatcher Dashboard (`/dashboard`, `/operations`)
*   **Live Command Center**: Real-time feed of all incoming calls and active dispatcher triage queues.
*   **Automated Dispatch**: Core DB trigger algorithm maps patients to specialized hospitals based on disease criteria and distance.
*   **Manual Override**: Override dispatch assignments manually by choosing active ambulances, drivers, and hospitals.

### 3. 🗺️ Driver App (`/duty`, `/schedule`)
*   **Mission Alert System**: Visual alerts containing severity status, patient phone number, and GPS route.
*   **Route Navigation**: Street-by-street path guidelines using the OSRM (Open Source Routing Machine) API.
*   **Status Synchronization**: Step-by-step state transition (`On Duty` ➔ `En Route` ➔ `Picked Up` ➔ `Arrived` ➔ `Resolved`).

### 4. 📊 Admin Dashboard (`/analytics`, `/doctors`, `/billing`)
*   **Resource Auditing**: Live stock counts of ICU and General beds across all regional hospitals.
*   **Doctors Console**: Create, delete, and schedule medical specialists.
*   **Financial Auditing**: View revenue graphs, track paid/unpaid statuses, and send payment reminders to patient dashboard banners.

---

## 🛠️ Technology Stack

*   **Frontend**: Next.js 16 (App Router), React 19, Vanilla CSS, Lucide Icons.
*   **Database**: PostgreSQL with **PostGIS** extension (using Supabase).
*   **Real-time Telemetry**: MQTT (HiveMQ) protocol.
*   **Mapping & Routing**: Leaflet.js and OSRM API.

---

## 🚀 Getting Started

Quickly run the system locally on your computer:

### 1. Database Setup (Supabase)
Import the SQL files inside `database/` inside the Supabase **SQL Editor** in sequential order:
```
01_core_schema.sql
02_driver_portal.sql
03_dispatcher_portal.sql
04_billing.sql
05_automated_triggers.sql
06_seed_data.sql
07_doctor_assigning.sql
08_doctor_seed.sql
```

### 2. Project Installation
Create `.env.local` inside `druto-sheba-app/` and paste your Supabase connection URI:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxxx.supabase.co:5432/postgres"
```

Install and launch:
```bash
cd druto-sheba-app
npm install
npm run dev -- -p 3500
```
Open `http://localhost:3500` to access the application.

---

## 🌐 Localization
*   **Timezone**: Synchronized to **GMT+06 (Asia/Dhaka)**.
*   **Currency**: Optimized for BDT (৳) calculations in billing receipts.

---
**Druto Sheba (দ্রুত সেবা) • Next-Generation Emergency Response Platform**