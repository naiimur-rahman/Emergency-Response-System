const { chromium } = require('playwright');
const { SignJWT } = require('jose');

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_development_only');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  const token = await new SignJWT({
    staff_id: 1,
    username: 'admin',
    role: 'Admin'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  await context.addCookies([{
    name: 'staff_session',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: false, // http
  }]);

  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));

  console.log('Navigating to analytics...');
  await page.goto('http://localhost:3000/analytics');
  
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
})();
