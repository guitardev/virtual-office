import { test, expect } from "./fixtures";

test.describe("ระบบจัดการบุคลากรภาครัฐ & สิทธิ์ RBAC (Admin Suite)", () => {
  test("ควรเปิดแฟ้มข้อมูลบุคลากร และเปิดหน้าต่างแก้ไขข้อมูล/สิทธิ์ พร้อมปุ่มปิดเด่นชัดได้", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนู ระบบจัดการ
    const adminNav = page
      .locator("aside button:has-text('ระบบจัดการ'), nav button:has-text('ระบบจัดการ')")
      .first();
    await adminNav.click();

    // 2. ตรวจสอบตารางบุคลากร
    const memberTable = page.locator("table");
    await expect(memberTable).toBeVisible();

    // 3. ทดสอบเปิดแฟ้มข้อมูลบุคลากรภาครัฐ (Dossier Modal)
    const dossierBtn = page.locator("table button:has-text('ดู')").first();
    await expect(dossierBtn).toBeVisible();
    await dossierBtn.click();

    const dossierTitle = page.locator("h3:has-text('แฟ้มข้อมูลบุคลากรภาครัฐ')");
    await expect(dossierTitle).toBeVisible();

    // ตรวจสอบปุ่มปิดสีแดงเด่นชัด
    const closeDossierBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
    await expect(closeDossierBtn).toBeVisible();
    await closeDossierBtn.click();
    await expect(dossierTitle).not.toBeVisible();

    // 4. ทดสอบเปิดหน้าต่างแก้ไขข้อมูลบุคลากร & กำหนดสิทธิ์
    const editMemberBtn = page.locator("table button:has-text('แก้ไข')").first();
    await expect(editMemberBtn).toBeVisible();
    await editMemberBtn.click();

    const editModalTitle = page.locator("h3:has-text('แก้ไขข้อมูลบุคลากร & กำหนดสิทธิ์')");
    await expect(editModalTitle).toBeVisible();

    // ตรวจสอบคลังภาพโปรไฟล์บุคลากร
    const photoSection = page.locator("text=รูปถ่ายโปรไฟล์บุคลากร");
    await expect(photoSection).toBeVisible();

    // ตรวจสอบปุ่มปิดสีแดงเด่นชัด
    const closeEditBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
    await expect(closeEditBtn).toBeVisible();
    await closeEditBtn.click();
    await expect(editModalTitle).not.toBeVisible();
  });
});
