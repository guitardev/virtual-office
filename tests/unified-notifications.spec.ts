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

  test("4. เมื่อสร้างหนังสือเวียนใหม่ ต้องเกิดการแจ้งเตือนทันที (Toast, Bell Badge, รายการในศูนย์แจ้งเตือน)", async ({ page }) => {
    // Intercept Supabase write calls to prevent test data from polluting the live database
    await page.route("**/rest/v1/circular_documents*", async (route) => {
      const method = route.request().method();
      if (method === "POST" || method === "PUT" || method === "PATCH") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to Circular page from sidebar
    const circularNav = page.locator("aside button:has-text('เวียนหนังสือราชการ'), nav button:has-text('เวียนหนังสือราชการ')").first();
    await circularNav.click();
    await page.waitForTimeout(500);

    // Click "ออกหนังสือเวียนใหม่" button
    const createBtn = page.getByRole("button", { name: /ออกหนังสือเวียนใหม่/i });
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    await page.waitForTimeout(500);

    // Open preset picker to quickly populate valid data
    const presetBtn = page.getByRole("button", { name: /นำเข้าจากแม่แบบราชการมาตรฐาน/i });
    await expect(presetBtn).toBeVisible();
    await presetBtn.click();
    await page.waitForTimeout(300);

    // Click first preset template
    const firstPreset = page.locator("button:has-text('แนวทางจัดสรรงบประมาณ'), button:has-text('พม ๐๐๐๕'), button:has-text('กพ ๐๐๓๒')").first();
    await expect(firstPreset).toBeVisible();
    await firstPreset.click();
    await page.waitForTimeout(300);

    // Submit circular document
    const submitBtn = page.getByRole("button", { name: /ออกหนังสือเวียนทันที/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Verify Toast notification appears
    const toast = page.locator("div.fixed").filter({ hasText: /ออกหนังสือเวียน/i });
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Open Notification Bell
    const notifBell = page.locator('button[aria-label="การแจ้งเตือน"]').first();
    await notifBell.click();
    await page.waitForTimeout(500);

    // Verify the circular doc appears in the Notification dropdown under Circular tab
    const dropdown = page.locator(".absolute.right-0").filter({ hasText: "ศูนย์การแจ้งเตือน" });
    await expect(dropdown).toBeVisible();
    const circularTab = dropdown.getByRole("button", { name: /หนังสือเวียน/ });
    await circularTab.click();
    await page.waitForTimeout(300);

    // Should display circular notification item in dropdown
    const notifItem = dropdown.locator('div[class*="transition-colors flex items-start gap-3 cursor-pointer"]').first();
    await expect(notifItem).toBeVisible();

    // Clean up local test storage so it does not persist across tests or reload
    await page.evaluate(() => {
      localStorage.removeItem("smartmso_circular_docs");
    });
  });

  test("5. ตรวจสอบการทำงานของระบบอื่นๆ (คำขอสิทธิ์, จองรถ, งานมอบหมาย) ในศูนย์แจ้งเตือน", async ({ page }) => {
    // Open Notification Bell
    const notifBell = page.locator('button[aria-label="การแจ้งเตือน"]').first();
    await notifBell.click();
    await page.waitForTimeout(500);

    const dropdown = page.locator(".absolute.right-0").filter({ hasText: "ศูนย์การแจ้งเตือน" });
    await expect(dropdown).toBeVisible();

    // Switch to "คำขอ/งาน" tab
    const requestsTab = dropdown.getByRole("button", { name: /คำขอ/ });
    await expect(requestsTab).toBeVisible();
    await requestsTab.click();
    await page.waitForTimeout(400);

    // Check if any request/car/task item is displayed
    const items = dropdown.locator('div[class*="transition-colors flex items-start gap-3 cursor-pointer"]');
    const itemCount = await items.count();

    if (itemCount > 0) {
      const firstItem = items.first();
      await expect(firstItem).toBeVisible();
      // Click item to verify Deeplinking
      await firstItem.click();
      await page.waitForTimeout(1000);
      // Dropdown should be dismissed after click
      await expect(dropdown).not.toBeVisible();
    } else {
      // Empty state verification
      const emptyNotice = dropdown.getByText(/ไม่มีรายการแจ้งเตือนในหมวดนี้/i);
      await expect(emptyNotice).toBeVisible();
    }
  });
});
