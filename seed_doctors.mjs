import fs from 'fs';
import pkg from 'pg';

const { Pool } = pkg;

const envLocal = fs.readFileSync('druto-sheba-app/.env.local', 'utf8');
const dbUrl = envLocal.match(/(?:PG_CONNECTION_STRING|DATABASE_URL)=(.*)/)?.[1];

const pool = new Pool({
  connectionString: dbUrl.trim(),
  ssl: { rejectUnauthorized: false }
});

const generateName = () => {
  const firsts = ['Rahim', 'Karim', 'Salma', 'Farhana', 'Tahmid', 'Nusrat', 'Shahin', 'Riyad', 'Sumi', 'Tarek'];
  const lasts = ['Ahmed', 'Khan', 'Rahman', 'Uddin', 'Hossain', 'Chowdhury', 'Begum', 'Haque', 'Islam'];
  return `Dr. ${firsts[Math.floor(Math.random() * firsts.length)]} ${lasts[Math.floor(Math.random() * lasts.length)]}`;
};

async function run() {
  try {
    console.log("Starting doctor mock data seeding...");

    // Fetch existing hospitals and specs
    const hospitalsRes = await pool.query('SELECT hospital_id FROM hospitals');
    const specsRes = await pool.query('SELECT spec_id FROM specializations');
    const patientsRes = await pool.query('SELECT patient_id FROM patients');
    
    const hospitals = hospitalsRes.rows.map(r => r.hospital_id);
    const specs = specsRes.rows.map(r => r.spec_id);
    const patients = patientsRes.rows.map(r => r.patient_id);

    if (hospitals.length === 0 || specs.length === 0 || patients.length === 0) {
      console.log('Ensure hospitals, specs, and patients are seeded first.');
      return;
    }

    // Seed Assistants
    for (const h_id of hospitals) {
      await pool.query('INSERT INTO assistants (name, hospital_id) VALUES ($1, $2)', [`Asst. ${generateName().replace('Dr. ', '')}`, h_id]);
    }
    console.log('Seeded assistants.');

    // Seed Doctors
    for (let i = 0; i < 20; i++) {
      const h_id = hospitals[Math.floor(Math.random() * hospitals.length)];
      const s_id = specs[Math.floor(Math.random() * specs.length)];
      const name = generateName();
      const phone = '017' + Math.floor(10000000 + Math.random() * 90000000).toString();
      
      const docRes = await pool.query(`
        INSERT INTO doctors (name, phone, hospital_id, spec_id, is_available)
        VALUES ($1, $2, $3, $4, $5) RETURNING doctor_id
      `, [name, phone, h_id, s_id, Math.random() > 0.2]);
      
      const d_id = docRes.rows[0].doctor_id;

      // Seed Schedule
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      for (const day of days) {
        if (Math.random() > 0.3) {
          await pool.query(`
            INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time)
            VALUES ($1, $2, '09:00:00', '17:00:00')
          `, [d_id, day]);
        }
      }

      // Seed Assignments
      if (Math.random() > 0.5) {
        const p_id = patients[Math.floor(Math.random() * patients.length)];
        const statuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
        await pool.query(`
          INSERT INTO doctor_assignments (patient_id, doctor_id, appointment_date, appointment_time, status)
          VALUES ($1, $2, CURRENT_DATE + (random() * 7)::int, '10:00:00', $3)
        `, [p_id, d_id, statuses[Math.floor(Math.random() * statuses.length)]]);
      }
    }
    
    console.log('Seeded 20 doctors, schedules, and assignments.');

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    pool.end();
  }
}

run();
