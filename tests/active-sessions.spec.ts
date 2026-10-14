import { test, expect } from "./fixtures";

test.describe("ระบบตรวจสอบ อุปกรณ์และเซสชันที่ใช้งานอยู่ (Active Sessions)", () => {
  test("ควรตรวจสอบอุปกรณ์ปัจจุบันแบบ Real-time และสามารถจำลองและยกเลิกเซสชันอุปกรณ์อื่นได้จริง", async ({
    page,
  }) => {
    // 1. ไปที่หน้าหลัก
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 2. ไปที่เมนู 'ข้อมูลส่วนตัว'
    const userNav = page
      .locator("aside button:has-text('ข้อมูลส่วนตัว'), nav button:has-text('ข้อมูลส่วนตัว')")
      .first();
    await userNav.click();

    // 3. ตรวจสอบหัวข้อ 'อุปกรณ์และเซสชันที่ใช้งานอยู่ (Active Sessions)'
    const sessionHeader = page.locator("h3:has-text('อุปกรณ์และเซสชันที่ใช้งานอยู่')").first();
    await expect(sessionHeader).toBeVisible();

    // 4. ตรวจสอบว่ามีอุปกรณ์ปัจจุบัน (Current Device) พร้อมสถานะออนไลน์
    const currentDeviceBadge = page
      .locator("span:has-text('อุปกรณ์ปัจจุบัน (Current Device)')")
      .first();
    await expect(currentDeviceBadge).toBeVisible();

    const onlineStatus = page.locator("span:has-text('ออนไลน์')").first();
    await expect(onlineStatus).toBeVisible();

    // 5. ตรวจสอบการจำลองอุปกรณ์อื่น (เช่น iPhone 16 Pro)
    const simulateBtn = page.locator("button:has-text('จำลองอุปกรณ์ทดสอบ')").first();
    await expect(simulateBtn).toBeVisible();
    await simulateBtn.click();

    const iphoneOption = page.locator("button:has-text('iPhone 16 Pro')").first();
    await expect(iphoneOption).toBeVisible();
    await iphoneOption.click();

    // ตรวจสอบว่ามีอุปกรณ์ iPhone 16 Pro ปรากฏขึ้นในรายการ
    const iphoneCard = page.locator("div:has-text('iPhone 16 Pro')").first();
    await expect(iphoneCard).toBeVisible();

    // ตรวจสอบว่ามีปุ่ม 'ยกเลิกเซสชัน' และปุ่ม 'บังคับออกจากระบบทุกอุปกรณ์อื่น'
    const revokeBtn = page.locator("button:has-text('ยกเลิกเซสชัน')").first();
    await expect(revokeBtn).toBeVisible();

    const revokeAllBtn = page
      .locator("button:has-text('บังคับออกจากระบบทุกอุปกรณ์อื่น')")
      .first();
    await expect(revokeAllBtn).toBeVisible();

    // 6. ทดสอบการยกเลิกเซสชัน (Auto-confirm window.confirm dialog)
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await revokeBtn.click();

    // ตรวจสอบว่าปุ่มยกเลิกเซสชันและปุ่มบังคับออกจากระบบทุกอุปกรณ์อื่นหายไปเมื่อเหลือเฉพาะอุปกรณ์ปัจจุบัน
    await expect(revokeAllBtn).not.toBeVisible();

    // 7. ตรวจสอบปุ่มรีเฟรชสถานะเซสชัน
    const refreshBtn = page.locator("button:has-text('รีเฟรช')").first();
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(currentDeviceBadge).toBeVisible();
  });
});
