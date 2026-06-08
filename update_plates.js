const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: "postgresql://postgres.pwkdehymrayzdzgcaxzv:Sohan786%400112420186@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
});

const prefixes = ['KA', 'KHA', 'GA', 'GHA', 'CHA', 'CHHA'];

function genPlate() {
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const n1 = Math.floor(Math.random() * 89) + 11;
  const n2 = Math.floor(Math.random() * 8999) + 1000;
  return `DHAKA METRO-${p} ${n1}-${n2}`;
}

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT vehicle_id FROM Ambulances;");
    for (const row of res.rows) {
      await client.query("UPDATE Ambulances SET License_Plate = $1 WHERE vehicle_id = $2;", [genPlate(), row.vehicle_id]);
    }
    console.log("Database updated successfully!");
    
    // update seed.sql
    let content = fs.readFileSync('database/seed.sql', 'utf8');
    content = content.replace(/\('DHA-[0-9-]+'/g, () => `('${genPlate()}'`);
    content = content.replace(/\('DHK-(?:METRO-AMB|MEGA)-[A-Z0-9-]+'/g, () => `('${genPlate()}'`);
    
    fs.writeFileSync('database/seed.sql', content);
    console.log("seed.sql updated successfully!");
  } finally {
    client.release();
    pool.end();
  }
}

run();
