import { chromium } from '@playwright/test';

async function testCleanKanban() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addInitScript(() => {
    const adminUser = {
      id: "usr_1",
      prefix: "นางสาว",
      firstName: "มะลิวัน",
      lastName: "สิทธิโยธี",
      name: "นางสาวมะลิวัน สิทธิโยธี",
      personnelType: "ข้าราชการ",
      position: "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
      division: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)",
      department: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)",
      email: "maliwan.s@m-society.go.th",
      phone: "055-705031",
      lineId: "@maliwan_kpp",
      role: "admin",
      status: "active",
      joinedDate: "1 ม.ค. 2565",
      avatarUrl: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/10/S__2457668.jpg",
      avatarText: "มล",
    };
    const sessionData = JSON.stringify({
      user: adminUser,
      loginTime: "09:00 น.",
      rememberMe: true,
    });
    localStorage.setItem("smartmso_auth_session", sessionData);
    localStorage.setItem("omnioffice_auth_session", sessionData);
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Navigate to Tasks
  await page.locator('aside button:has-text("งานและโปรเจกต์")').first().click();
  await page.waitForTimeout(2000);

  // Capture full Kanban Board with cards
  await page.screenshot({ path: 'kanban-board-cards.png', fullPage: true });

  // Switch to list view and screenshot
  await page.locator('button:has-text("ตารางรายการ")').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'kanban-table-active.png', fullPage: true });

  // Switch back to Kanban
  await page.locator('button:has-text("กระดาน Kanban")').click();
  await page.waitForTimeout(800);

  // Click on a task card to view Detail Modal
  const card = page.locator('h4').first();
  if (await card.isVisible()) {
    await card.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'kanban-detail-modal.png' });
  }

  await browser.close();
  console.log('✅ Clean screenshots captured successfully!');
}

testCleanKanban().catch(console.error);
