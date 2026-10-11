import { test, expect } from "./fixtures";

test.describe("ระบบแชทกลุ่มทางการของกลุ่มงาน/ฝ่าย (Official Division Chat)", () => {
  test("ควรแสดงกลุ่มงานทางการของสำนักงาน และเปิด/ปิด Modal สร้างกลุ่มใหม่ได้", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนู แชททีม
    const chatNav = page
      .locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')")
      .first();
    await chatNav.click();

    // 2. ตรวจสอบกลุ่มงานทางการของสำนักงาน
    const divisionGroup = page.locator("text=กลุ่มงานประจำสำนักงาน").first();
    await expect(divisionGroup).toBeVisible();

    // 3. ตรวจสอบปุ่มสร้างกลุ่มแชท
    const createGroupBtn = page.locator("button:has-text('+ สร้างกลุ่ม'), button:has-text('สร้างกลุ่ม')").first();
    await expect(createGroupBtn).toBeVisible();
    await createGroupBtn.click();

    // 4. ตรวจสอบ Modal สร้างกลุ่มใหม่
    const modalTitle = page.locator("h3:has-text('สร้างกลุ่มแชทโครงการใหม่')");
    await expect(modalTitle).toBeVisible();

    // ตรวจสอบปุ่มปิดสีแดงเด่นชัด
    const closeBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
    await expect(closeBtn).toBeVisible();

    // 5. ปิดหน้าต่าง
    await closeBtn.click();
    await expect(modalTitle).not.toBeVisible();
  });
});
