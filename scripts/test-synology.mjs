import { chromium } from '@playwright/test';

async function testSynologyIntegration() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('🌐 1. Navigating to Login Page at http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Capture Login Screen with Synology NAS as Primary Authentication
  console.log('📸 2. Capturing Synology NAS Login screen...');
  await page.screenshot({ path: 'login-synology-live.png', fullPage: true });

  // 2. Perform Login with Admin quick button
  console.log('⚡ 3. Clicking "เข้าด้วยสิทธิ์ Admin พมจ."...');
  const quickAdminBtn = page.locator('button:has-text("เข้าด้วยสิทธิ์ Admin พมจ.")').first();
  if (await quickAdminBtn.isVisible()) {
    await quickAdminBtn.click();
  } else {
    // Fill credentials manually
    await page.fill('input[placeholder*="admin"]', 'admin');
    await page.fill('input[placeholder*="รหัสผ่าน"]', 'admin1234');
    await page.click('button:has-text("เข้าสู่ระบบผ่าน Synology NAS")');
  }
  await page.waitForTimeout(2000);

  // 3. Navigate to Admin Page (ระบบจัดการ & สิทธิ์)
  console.log('⚙️ 4. Navigating to Admin Control Center...');
  const adminNav = page.locator('aside button:has-text("จัดการสิทธิ์"), aside button:has-text("ระบบจัดการ")').first();
  if (await adminNav.isVisible()) {
    await adminNav.click();
  } else {
    // Open user dropdown in top right and click admin
    await page.locator('header button').last().click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("ระบบจัดการ & สิทธิ์")').click();
  }
  await page.waitForTimeout(1500);

  // 4. Click on "💾 Synology NAS" Tab
  console.log('💾 5. Clicking "Synology NAS" tab...');
  const nasTabBtn = page.locator('button:has-text("Synology NAS")').first();
  await nasTabBtn.click();
  await page.waitForTimeout(2000);

  // 5. Capture Synology NAS Admin Control Center
  console.log('📸 6. Capturing Synology NAS Management Hub...');
  await page.screenshot({ path: 'nas-admin-control-center.png', fullPage: true });

  console.log('🎉 Synology NAS Integration Test Completed Successfully!');
  await browser.close();
}

testSynologyIntegration().catch(console.error);
