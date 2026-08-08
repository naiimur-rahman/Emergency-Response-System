# 🚀 Group Member Setup Guide: Supabase & Local Project Launch

Welcome to the team setup guide! Follow these instructions to initialize the project database on your local machine and connect to Supabase.

---

## 🛠️ Step 1: Create a Supabase Account & Database Project
1. Go to [Supabase](https://supabase.com/) and register / log in (using your GitHub account is recommended).
2. Click **New Project** and select your organization.
3. Configure the project:
   - **Name**: `Emergency-Response-System` (or similar)
   - **Database Password**: Set a strong password (write this down, you will need it in Step 3!)
   - **Region**: Choose a region close to your target users (e.g., Singapore).
4. Click **Create New Project** and wait 1–2 minutes for setup completion.

---

## 🗄️ Step 2: Import the Database Schema & Seeding Structure
Supabase does not automatically know what tables or data we need. We must run our SQL migrations inside the Supabase SQL Editor:

1. In your Supabase Dashboard, click on **SQL Editor** in the left menu bar (looks like a `>_` icon).
2. Click **New Query** -> **Blank Query**.
3. Open each file in the `database/` folder in VS Code or any text editor and **run them in sequence (from 01 to 08)** by copying and pasting the text into the editor and clicking **Run**:
   - `01_core_schema.sql` (Creates basic tables)
   - `02_driver_portal.sql`
   - `03_dispatcher_portal.sql`
   - `04_billing.sql`
   - `05_automated_triggers.sql` (Automated dispatch system functions)
   - `06_seed_data.sql` (Seeds ambulances, hospitals, drivers, and patients)
   - `07_doctor_assigning.sql` (Creates specialized doctor and appointment tables)
   - `08_doctor_seed.sql` (Seeds specializations, doctors, and default schedules)

---

## 🔌 Step 3: Connect the Code to Supabase (`.env.local`)
Next.js needs the connection credentials to talk to PostgreSQL:

1. In your Supabase dashboard, click the **Project Settings** (gear icon) in the bottom-left sidebar.
2. Go to **Database**.
3. Scroll down to the **Connection String** section, choose **URI**, and copy the string.
   - It will look like this: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxx.supabase.co:5432/postgres`
4. Replace `[YOUR-PASSWORD]` with the password you created in Step 1.
5. Go to the root of your `druto-sheba-app` directory and create (or update) a file named `.env.local`.
6. Paste the connection string:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD_HERE@db.xxxxxx.supabase.co:5432/postgres"
   ```

---

## 🏃 Step 4: Start the Development Server
1. Open a terminal in the `druto-sheba-app` folder.
2. Install the necessary packages:
   ```bash
   npm install
   ```
3. Start the local server:
   ```bash
   npm run dev -- -p 3500
   ```
4. Open `http://localhost:3500` in your browser. You're ready to run!
