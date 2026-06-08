const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// 1. Generate JWT Secret
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('--- SECURE JWT SECRET ---');
console.log(jwtSecret);
console.log('-------------------------');

// 2. Generate secure random passwords
const adminPassword = crypto.randomBytes(8).toString('hex');
const dispatcherPassword = crypto.randomBytes(8).toString('hex');

console.log('\n--- NEW PASSWORDS ---');
console.log(`Admin Username: admin`);
console.log(`Admin Password: ${adminPassword}`);
console.log(`Dispatcher Username: dispatcher`);
console.log(`Dispatcher Password: ${dispatcherPassword}`);
console.log('---------------------\n');

async function hashPasswords() {
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const dispatcherHash = await bcrypt.hash(dispatcherPassword, 10);

  console.log('--- SEED SCRIPT (database/secure-seed.sql) ---');
  console.log(`
-- First clear existing demo staff users
DELETE FROM Staff_Users;

-- Insert securely hashed admin & dispatcher
INSERT INTO Staff_Users (User_ID, Username, Password_Hash, Role)
VALUES 
  (1, 'admin', '${adminHash}', 'Admin'),
  (2, 'dispatcher', '${dispatcherHash}', 'Dispatcher');
`);
}

hashPasswords();
