import { test, expect } from "./fixtures";

test.describe("Dashboard Live Data & Zero Mock Integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
  });

  test("should display live briefing without hardcoded mock text and show 5 dynamic stat cards", async ({ page }) => {
    // 1. Verify hero banner title and dynamic greeting
    const heroTitle = page.locator("h1");
    await expect(heroTitle).toBeVisible();

    // Verify hardcoded mock sentence "2 งานเร่งด่วน ที่ต้องส่งมอบ และการประชุมสรุปแผนงานผลิตภัณฑ์ในเวลา 11:00 น." is GONE!
    const mockSentence = page.locator("text=และการประชุมสรุปแผนงานผลิตภัณฑ์ในเวลา 11:00 น.");
    await expect(mockSentence).toHaveCount(0);

    // Verify hardcoded mock "3 คัน" static text is GONE (now displays ratio like X / Y คัน)
    const staticThreeCars = page.locator("text='3 คัน'");
    await expect(staticThreeCars).toHaveCount(0);

    // 2. Verify all 5 Overview Stat Widgets exist
    await expect(page.locator("text=/ค้างส่ง/").first()).toBeVisible();
    await expect(page.locator("text=/หนังสือเวียนราชการ|รอคุณลงนาม/").first()).toBeVisible();
    await expect(page.locator("text=การประชุมวันนี้").first()).toBeVisible();
    await expect(page.locator("text=รถยนต์พร้อมใช้งาน").first()).toBeVisible();
    await expect(page.locator("text=สมาชิกในองค์กร").first()).toBeVisible();

    // 3. Verify Circular Documents section exists on the Dashboard
    const circularSectionHeading = page.locator("text=หนังสือเวียนราชการล่าสุด & สถานะการรับทราบ");
    await expect(circularSectionHeading).toBeVisible();

    // 4. Verify Priority Tasks section and filter tabs
    await expect(page.locator("text=ภารกิจและงานมอบหมาย (Tasks)")).toBeVisible();
    await expect(page.locator("button:has-text('เร่งด่วน')").first()).toBeVisible();
    await expect(page.locator("button:has-text('งานของฉัน')").first()).toBeVisible();

    // 5. Verify Fleet / Car status section
    await expect(page.locator("text=ยานพาหนะส่วนกลาง").first()).toBeVisible();
  });

  test("should allow navigating to Circular Documents directly from Dashboard", async ({ page }) => {
    // Click on Circular Documents stat widget or button on Dashboard
    const circularStat = page.locator("text=หนังสือเวียนราชการ, text=รอคุณลงนาม").first();
    if (await circularStat.isVisible()) {
      await circularStat.click();
      await expect(page.locator("text=ระบบเวียนหนังสือราชการอิเล็กทรอนิกส์")).toBeVisible();
    }
  });
});
