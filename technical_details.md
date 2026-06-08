# Technical Stack & Architecture Details

This document outlines the core technologies, libraries, and architecture used to build the Druto Sheba Emergency Response System.

## 1. Core Framework & Language
- **Next.js (v16.2.4):** The core React framework used for both server-side rendered pages and static generation.
- **React (v19.2.4):** The foundational UI library.
- **Node.js (>=20.11.0):** The runtime environment for executing JavaScript on the server.

## 2. Database & Backend Services
- **Supabase:** Used as the primary Backend-as-a-Service (BaaS) providing a scalable PostgreSQL database.
- **PostgreSQL (`pg` v8.20.0):** The relational database used to store all structured data.
- **PostGIS:** A spatial database extender for PostgreSQL, allowing location queries (e.g., finding the nearest ambulance or hospital based on `Point` and `Polygon` geometries).
- **Database Triggers & Functions:** The database utilizes complex PL/pgSQL functions and triggers for automated dispatching, resource reservation (locking beds/ambulances), and audit logging.

## 3. Mapping & Spatial Data
- **Leaflet (`leaflet` v1.9.4) & React-Leaflet (`react-leaflet` v5.0.0):** Used for rendering interactive maps on the Dispatcher and Driver portals. It visualizes dispatch zones, ambulance live locations, and hospital coordinates.

## 4. Real-Time Communication & Messaging
- **MQTT (`mqtt` v5.15.1):** Utilized for lightweight, real-time message broadcasting. Essential for live driver location tracking and instant dispatch notifications.

## 5. Security & Authentication
- **Supabase Auth:** For user session management.
- **JWT (`jose` v6.2.3):** For handling JSON Web Tokens securely.
- **Bcrypt (`bcryptjs` v3.0.3):** For password hashing and security.

## 6. UI/UX & Styling
- **Framer Motion (`framer-motion` v12.38.0):** Used for complex UI micro-animations and smooth page transitions to create a premium feel.
- **Lucide React (`lucide-react` v1.14.0):** The primary icon library used across the dashboard.
- **Tailwind CSS:** (Implied via Next.js standard setup) for utility-first styling.

## 7. Code Quality & Tooling
- **ESLint (`eslint` v9):** For static code analysis and enforcing coding standards.
