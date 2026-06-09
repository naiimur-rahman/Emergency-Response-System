const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../druto-sheba-app/.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
  const match = line.match(/^([^#\s][^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const pool = new Pool({
  connectionString: env.PG_CONNECTION_STRING
});

const names = ['Rahim Ahmed', 'Farhana Khan', 'Tarek Rahman', 'Salma Begum', 'Shahin Islam', 'Nusrat Jahan', 'Karim Hossain', 'Riyad Ahmed', 'Ayesha Siddiqua', 'Kamrul Hasan', 'Sadia Afrin', 'Mehedi Hasan', 'Monir Hossain', 'Sharmin Akter', 'Rubel Mia', 'Tania Sultana', 'Zahid Hasan', 'Fatema Zohra', 'Rafiqul Islam', 'Sonia Akter'];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing doctors to prevent duplicates if run multiple times
    await client.query('DELETE FROM doctor_schedules');
    await client.query('DELETE FROM doctor_assignments');
    await client.query('DELETE FROM doctors');
    console.log('Cleared existing doctor data.');

    const hospitalsRes = await client.query('SELECT hospital_id, name FROM hospitals');
    const specsRes = await client.query('SELECT spec_id, spec_name FROM specializations');

    const hospitals = hospitalsRes.rows;
    const specializations = specsRes.rows;

    let doctorCount = 0;
    let scheduleCount = 0;

    console.log(`Generating 4 doctors per hospital per specialization...`);

    for (const h of hospitals) {
      for (const s of specializations) {
        for (let i = 0; i < 4; i++) {
          const name = 'Dr. ' + names[doctorCount % names.length];
          const phone = '01711' + doctorCount.toString().padStart(6, '0');
          const is_available = Math.random() > 0.2; // 80% available

          const docRes = await client.query(
            'INSERT INTO doctors (name, phone, hospital_id, spec_id, is_available) VALUES ($1, $2, $3, $4, $5) RETURNING doctor_id',
            [name, phone, h.hospital_id, s.spec_id, is_available]
          );
          
          const doctorId = docRes.rows[0].doctor_id;
          doctorCount++;

          // Give each doctor 2 schedules
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const day1 = days[Math.floor(Math.random() * 3)];
          const day2 = days[Math.floor(Math.random() * 3) + 3];

          await client.query(
            'INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
            [doctorId, day1, '09:00:00', '13:00:00']
          );
          await client.query(
            'INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
            [doctorId, day2, '15:00:00', '19:00:00']
          );
          scheduleCount += 2;
        }
      }
    }

    await client.query('COMMIT');
    console.log(`Successfully seeded ${doctorCount} doctors and ${scheduleCount} schedules into the database!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding doctors:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
