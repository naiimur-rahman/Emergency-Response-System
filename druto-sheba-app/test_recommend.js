const http = require('http');

const data = JSON.stringify({
  lat: 23.8103,
  lon: 90.4125,
  severity: 'Critical',
  patient_id: 1
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/hospitals/recommend',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      console.log(JSON.parse(body).hospitals.map(h => ({name: h.name, type: h.type, distance_km: h.distance_km})));
    } catch(e) { console.log(body); }
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
