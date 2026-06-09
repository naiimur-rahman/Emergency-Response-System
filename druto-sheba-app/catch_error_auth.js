const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));

  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login');
  
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  console.log('Waiting for navigation to analytics...');
  await page.waitForURL('http://localhost:3000/analytics', { timeout: 10000 }).catch(() => {});
  
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
