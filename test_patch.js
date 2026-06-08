const http = require('http');

const data = JSON.stringify({
  request_id: 'NX-697FE261',
  vehicle_id: '1',
  driver_id: '1',
  hospital_id: 1,
  dispatcher_id: 1
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/dispatcher/operations',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', e => console.error('Error:', e));
req.write(data);
req.end();
