import { test, expect } from "./fixtures";

test.describe("ระบบจัดการข้อมูลส่วนตัว (User Profile & EditProfileModal)", () => {
  test("ควรเปิด Modal เป็นโหมดเต็มหน้าจอ (Default Fullscreen) สลับหน้าต่างได้ และมีปุ่มปิดเด่นชัด", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนูข้อมูลส่วนตัว
    const userNav = page
      .locator("aside button:has-text('ข้อมูลส่วนตัว'), nav button:has-text('ข้อมูลส่วนตัว')")
      .first();
    await userNav.click();

    // 2. คลิกปุ่มแก้ไขข้อมูลส่วนตัว
    const editBtn = page.locator("button:has-text('แก้ไขข้อมูลส่วนตัว')").first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // 3. ตรวจสอบว่าเปิดขึ้นมาเป็นโหมดเต็มหน้าจอ (Default Fullscreen)
    const modalContainer = page.locator(".fixed.inset-0.z-50").first();
    await expect(modalContainer).toBeVisible();
    const fullscreenHeader = page.locator("h3:has-text('แก้ไขข้อมูลส่วนบุคคล')").first();
    await expect(fullscreenHeader).toBeVisible();

    // ตรวจสอบปุ่มปิดสีแดงเด่นชัด
    const closeBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
    await expect(closeBtn).toBeVisible();

    // 4. ทดสอบปุ่มสลับโหมดเป็น Windowed Mode (ย่อหน้าต่าง)
    const toggleWindowBtn = page
      .locator("button:has-text('ย่อหน้าต่าง'), button:has-text('เต็มหน้าจอ')")
      .first();
    await expect(toggleWindowBtn).toBeVisible();
    await toggleWindowBtn.click();
    await page.waitForTimeout(500);

    // ตรวจสอบว่าเปลี่ยนเป็นปุ่ม 'เต็มหน้าจอ'
    const expandBtn = page.locator("button:has-text('เต็มหน้าจอ')").first();
    await expect(expandBtn).toBeVisible();

    // สลับกลับเป็น Fullscreen
    await expandBtn.click();
    await page.waitForTimeout(500);

    // 5. ตรวจสอบคลังภาพถ่ายทางการ (Official Avatar Presets)
    const officialPresetsLabel = page.locator("text=ทำเนียบภาพถ่ายข้าราชการ").first();
    await expect(officialPresetsLabel).toBeVisible();

    // 6. ทดสอบปิดหน้าต่างผ่านปุ่ม '✕ ปิดหน้าต่าง'
    await closeBtn.click();
    await expect(fullscreenHeader).not.toBeVisible();
  });
});
