import { chromium } from '@playwright/test';

async function captureProfile() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addInitScript(() => {
    localStorage.setItem('omnioffice_auth_session', JSON.stringify({
      user: {
        id: 'usr_1',
        prefix: 'นางสาว',
        firstName: 'มะลิวัน',
        lastName: 'สิทธิโยธี',
        name: 'นางสาวมะลิวัน สิทธิโยธี',
        personnelType: 'ข้าราชการ',
        position: 'พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร',
        division: 'สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)',
        department: 'สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)',
        email: 'maliwan.s@m-society.go.th',
        phone: '055-705031',
        lineId: '@maliwan_kpp',
        role: 'admin',
        status: 'active',
        joinedDate: '1 ม.ค. 2565',
        avatarUrl: 'https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/10/S__2457668.jpg',
        avatarText: 'มล',
      },
      loginTime: '09:00 น.',
      rememberMe: true,
    }));
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Navigate to user profile page
  await page.locator('aside button:has-text("ข้อมูลส่วนตัว")').first().click();
  await page.waitForTimeout(1000);

  // Click edit profile button
  await page.locator('button:has-text("แก้ไขข้อมูลส่วนตัว")').first().click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'profile-edit-clean.png' });
  await browser.close();
  console.log('✅ Clean screenshot saved to profile-edit-clean.png');
}

captureProfile().catch(console.error);
