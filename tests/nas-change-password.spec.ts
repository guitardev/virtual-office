import { test, expect } from "./fixtures";

test.describe("ระบบเปลี่ยนรหัสผ่าน Synology NAS โดยตรง (Direct NAS Password Change)", () => {
  test("ควรสามารถเปิด Modal เปลี่ยนรหัสผ่านจากหน้า User Profile และตรวจสอบความปลอดภัยของรหัสผ่านได้ครบถ้วน", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนูข้อมูลส่วนตัว (User Profile)
    const userNav = page
      .locator("aside button:has-text('ข้อมูลส่วนตัว'), nav button:has-text('ข้อมูลส่วนตัว')")
      .first();
    await userNav.click();

    // 2. ตรวจสอบการแสดงผลของ Synology NAS Security Card
    const nasSecurityCard = page.locator("text=รหัสผ่านบัญชี Synology NAS & Cloud Storage").first();
    await expect(nasSecurityCard).toBeVisible();

    const nasDomainBadge = page.locator("text=nas.smso.site").first();
    await expect(nasDomainBadge).toBeVisible();

    // 3. คลิกปุ่ม 'เปลี่ยนรหัสผ่าน NAS'
    const changeNasPassBtn = page.locator("[data-testid='open-change-nas-password-btn']").first();
    await expect(changeNasPassBtn).toBeVisible();
    await changeNasPassBtn.click();

    // 4. ตรวจสอบว่า Modal เปลี่ยนรหัสผ่านเปิดขึ้นมา
    const modalHeader = page.locator("h3:has-text('เปลี่ยนรหัสผ่าน Synology NAS')").first();
    await expect(modalHeader).toBeVisible();

    // ตรวจสอบข้อมูลบัญชีผู้ใช้งาน
    const accountInfo = page.locator("text=บัญชี NAS:").first();
    await expect(accountInfo).toBeVisible();

    // 5. ตรวจสอบช่องกรอกรหัสผ่านด้วย data-testid
    const oldPassInput = page.locator("[data-testid='nas-old-password-input']").first();
    const newPassInput = page.locator("[data-testid='nas-new-password-input']").first();
    const confirmPassInput = page.locator("[data-testid='nas-confirm-password-input']").first();
    const submitBtn = page.locator("[data-testid='nas-submit-btn']").first();

    await expect(oldPassInput).toBeVisible();
    await expect(newPassInput).toBeVisible();
    await expect(confirmPassInput).toBeVisible();

    // ปุ่ม Submit ต้องถูก disable ไว้เมื่อยังไม่กรอกรหัสผ่าน
    await expect(submitBtn).toBeDisabled();

    // ทดสอบกรอกรหัสผ่านใหม่แบบสั้น (3 ตัวอักษร)
    await newPassInput.fill("abc");
    await expect(page.locator("text=ยาวอย่างน้อย ๖ ตัวอักษร").first()).toBeVisible();

    // ตรวจสอบว่าปุ่ม Submit ยังคงถูก disable อยู่
    await expect(submitBtn).toBeDisabled();

    // ทดสอบกรอกรหัสผ่านใหม่ที่ตรงเกณฑ์: มีตัวพิมพ์ใหญ่-เล็ก และตัวเลข (เช่น SmartMso2026)
    await newPassInput.fill("SmartMso2026");
    await confirmPassInput.fill("SmartMso2026");

    // รหัสผ่านตรงกัน ปุ่ม Submit ต้องเปิดใช้งาน (enabled)
    await expect(submitBtn).toBeEnabled();

    // 6. ปิดหน้าต่าง Modal ด้วยปุ่มยกเลิก
    const cancelBtn = page.locator("[data-testid='nas-cancel-btn']").first();
    await cancelBtn.click();
    await expect(modalHeader).not.toBeVisible();
  });

  test("ควรสามารถเปิด Modal เปลี่ยนรหัสผ่านจากหน้าต่าง EditProfileModal ได้", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนูข้อมูลส่วนตัว
    const userNav = page
      .locator("aside button:has-text('ข้อมูลส่วนตัว'), nav button:has-text('ข้อมูลส่วนตัว')")
      .first();
    await userNav.click();

    // 2. เปิดหน้าต่าง EditProfileModal
    const editProfileBtn = page.locator("button:has-text('แก้ไขข้อมูลส่วนตัว')").first();
    await editProfileBtn.click();

    // 3. คลิกปุ่มเปลี่ยนรหัสผ่าน NAS จากการ์ดใน EditProfileModal
    const cardChangeBtn = page.locator("[data-testid='edit-profile-card-change-nas-password-btn']").first();
    await expect(cardChangeBtn).toBeVisible();
    await cardChangeBtn.click();

    // 4. ตรวจสอบว่า Modal เปลี่ยนรหัสผ่าน Synology NAS เปิดขึ้นมา
    const modalHeader = page.locator("h3:has-text('เปลี่ยนรหัสผ่าน Synology NAS')").first();
    await expect(modalHeader).toBeVisible();

    // 5. ปิด Modal
    const closeBtn = page.locator("button:has-text('✕')").first();
    await closeBtn.click();
    await expect(modalHeader).not.toBeVisible();
  });
});
