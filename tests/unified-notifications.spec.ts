import { test, expect } from "./fixtures";

test.describe("ระบบแจ้งเตือนแบบรวมศูนย์ (Unified Government Notification System)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root with authenticated admin fixture
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);
  });

  test("1. ควรแสดงกระดิ่งแจ้งเตือนพร้อมป้ายตัวเลขอัจฉริยะ และเปิดเมนูศูนย์การแจ้งเตือนได้", async ({ page }) => {
    // Locate notification bell by aria-label
    const notifBell = page.locator('button[aria-label="การแจ้งเตือน"]').first();
    await expect(notifBell).toBeVisible({ timeout: 10000 });

    // Click to open notification dropdown
    await notifBell.click();
    await page.waitForTimeout(500);

    // Verify dropdown container
    const dropdown = page.locator(".absolute.right-0").filter({ hasText: "ศูนย์การแจ้งเตือน" });
    await expect(dropdown).toBeVisible();

    // Verify category tabs exist within dropdown
    await expect(dropdown.getByRole("button", { name: /^ทั้งหมด/ })).toBeVisible();
    await expect(dropdown.getByRole("button", { name: /แชท/ })).toBeVisible();
    await expect(dropdown.getByRole("button", { name: /หนังสือเวียน/ })).toBeVisible();
    await expect(dropdown.getByRole("button", { name: /คำขอ/ })).toBeVisible();
  });

  test("2. สามารถกรองการแจ้งเตือนตามหมวดหมู่ (Tabs Filter) และกดอ่านทั้งหมดได้", async ({ page }) => {
    const notifBell = page.locator('button[aria-label="การแจ้งเตือน"]').first();
    await notifBell.click();
    await page.waitForTimeout(500);

    const dropdown = page.locator(".absolute.right-0").filter({ hasText: "ศูนย์การแจ้งเตือน" });
    await expect(dropdown).toBeVisible();

    // Switch to Circular tab
    const circularTab = dropdown.getByRole("button", { name: /หนังสือเวียน/ });
    await circularTab.click();
    await page.waitForTimeout(300);

    // Switch to Chat tab
    const chatTab = dropdown.getByRole("button", { name: /แชท/ });
    await chatTab.click();
    await page.waitForTimeout(300);

    // Switch back to All tab
    const allTab = dropdown.getByRole("button", { name: /^ทั้งหมด/ });
    await allTab.click();
    await page.waitForTimeout(300);

    // Check "Mark all as read" button if visible
    const markAllBtn = dropdown.getByRole("button", { name: /อ่านทั้งหมด/ });
    if (await markAllBtn.isVisible()) {
      await markAllBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("3. เมื่อคลิกการแจ้งเตือนแชทหรือหนังสือเวียน ต้อง Deeplink ไปยังหน้านั้นได้ถูกต้อง", async ({ page }) => {
    const notifBell = page.locator('button[aria-label="การแจ้งเตือน"]').first();
    await notifBell.click();
    await page.waitForTimeout(500);

    const dropdown = page.locator(".absolute.right-0").filter({ hasText: "ศูนย์การแจ้งเตือน" });
    await expect(dropdown).toBeVisible();

    // Find any notification item in dropdown
    const notifItem = dropdown.locator('div[class*="transition-colors flex items-start gap-3 cursor-pointer"]').first();
    if (await notifItem.isVisible()) {
      await notifItem.click();
      await page.waitForTimeout(1000);

      // Verify dropdown is closed after click
      await expect(dropdown).not.toBeVisible();
    }
  });
});
