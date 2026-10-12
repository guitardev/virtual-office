import { chromium } from '@playwright/test';

async function testKanban() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1. Inject Admin session
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
    localStorage.setItem("omnioffice_auth_session", JSON.stringify({
      user: adminUser,
      loginTime: "09:00 น.",
      rememberMe: true,
    }));
  });

  const page = await context.newPage();

  console.log('🌐 1. Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click on "งานและโปรเจกต์" in sidebar
  console.log('📋 2. Clicking "งานและโปรเจกต์" in sidebar...');
  const taskNav = page.locator('aside button:has-text("งานและโปรเจกต์"), aside button:has-text("งาน")').first();
  await taskNav.click();
  await page.waitForTimeout(1500);

  // Take screenshot of empty/initial Kanban Board
  console.log('📸 3. Capturing initial Kanban Board...');
  await page.screenshot({ path: 'kanban-board-live.png', fullPage: true });

  // Test Creating a Task with Scope "👥 เฉพาะกลุ่มงาน"
  console.log('➕ 4. Opening "เพิ่มงานใหม่" modal...');
  const addBtn = page.locator('button:has-text("เพิ่มงานใหม่")').first();
  await addBtn.click();
  await page.waitForTimeout(1000);

  // Fill in Task Form
  console.log('✍️ 5. Filling task form...');
  await page.fill('input[placeholder*="จัดทำรายงาน"]', 'จัดเตรียมรายงานการเงินและพัสดุไตรมาส 1');
  await page.fill('textarea[placeholder*="ระบุข้อกำหนด"]', 'รวบรวมข้อมูลใบเสร็จค่าน้ำมันและรายงานพัสดุเสนอหัวหน้าฝ่ายบริหารทั่วไป');
  
  // Choose "👥 กลุ่มงาน"
  const deptRadio = page.locator('label:has-text("กลุ่มงาน") input[type="radio"]');
  if (await deptRadio.isVisible()) {
    await deptRadio.check();
  }

  // Choose priority High
  await page.selectOption('select:has-text("สูงมาก")', 'high');

  // Add a subtask
  const subtaskInput = page.locator('input[placeholder*="พิมพ์ขั้นตอนย่อย"]');
  if (await subtaskInput.isVisible()) {
    await subtaskInput.fill('ตรวจนับฎีกาเบิกจ่าย');
    await subtaskInput.press('Enter');
    await page.waitForTimeout(400);
    await subtaskInput.fill('ตรวจสอบยอดงบค่าน้ำมันเชื้อเพลิง');
    await subtaskInput.press('Enter');
    await page.waitForTimeout(400);
  }

  // Take screenshot of modal
  await page.screenshot({ path: 'kanban-add-modal.png' });

  // Submit task
  console.log('💾 6. Submitting task...');
  await page.locator('button[type="submit"]:has-text("บันทึกลง Supabase")').click();
  await page.waitForTimeout(2000);

  // Take screenshot after task added
  console.log('📸 7. Capturing Kanban Board with new task...');
  await page.screenshot({ path: 'kanban-board-with-task.png', fullPage: true });

  // Test Quick Move button (➡️ ถัดไป) to move to in_progress
  console.log('➡️ 8. Moving task to In Progress via Quick Shift...');
  const nextBtn = page.locator('button:has-text("ถัดไป")').first();
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await page.waitForTimeout(1500);
  }

  // Take screenshot of In Progress column
  await page.screenshot({ path: 'kanban-in-progress.png', fullPage: true });

  // Click on the task card to open details modal
  console.log('🔍 9. Clicking task card to open Details Modal...');
  const taskCard = page.locator('h4:has-text("จัดเตรียมรายงานการเงิน")').first();
  if (await taskCard.isVisible()) {
    await taskCard.click();
    await page.waitForTimeout(1000);
    // Toggle subtask in detail modal
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: 'kanban-detail-modal.png' });
    // Close modal
    await page.locator('.fixed button:has-text("✕")').first().click();
    await page.waitForTimeout(500);
  }

  // Test View Mode toggle to List view
  console.log('📋 10. Switching to Table / List View...');
  await page.locator('button:has-text("ตารางรายการ")').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'kanban-table-view.png', fullPage: true });

  console.log('🎉 Kanban Board E2E Test Completed Successfully!');
  await browser.close();
}

testKanban().catch(console.error);
