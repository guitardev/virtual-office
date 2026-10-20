import { test, expect } from "./fixtures";

test.describe("ระบบจัดกลุ่มเมนูแถบข้างและการย่อ/ขยาย (Grouped Collapsible Sidebar)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("ควรแสดงกลุ่มเมนูหลักครบทั้ง 4 กลุ่ม พร้อมรายการเมนูภายใต้แต่ละกลุ่ม", async ({ page }) => {
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();

    // Verify all 4 group headers exist
    await expect(sidebar.getByText("ภาพรวมสำนักงาน")).toBeVisible();
    await expect(sidebar.getByText("การประสานงาน & สื่อสาร")).toBeVisible();
    await expect(sidebar.getByText("สารบรรณ & บริการองค์กร")).toBeVisible();
    await expect(sidebar.getByText("ระบบและการตั้งค่า")).toBeVisible();

    // Verify menu items under groups are visible
    await expect(sidebar.getByRole("button", { name: /หน้าแรก/ })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: /แชททีม/ })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: /เวียนหนังสือราชการ/ })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: /ข้อมูลส่วนตัว/ })).toBeVisible();
  });

  test("ควรสามารถยุบและขยายกลุ่มเมนูเฉพาะกลุ่มได้ (Accordion Group Toggle)", async ({ page }) => {
    const sidebar = page.locator("aside").first();
    const overviewGroupBtn = sidebar.locator("button:has-text('ภาพรวมสำนักงาน')");

    // Initially "หน้าแรก" should be visible
    const homeBtn = sidebar.locator("button:has-text('หน้าแรก')");
    await expect(homeBtn).toBeVisible();

    // Click to collapse "ภาพรวมสำนักงาน" group
    await overviewGroupBtn.click();
    await expect(homeBtn).not.toBeVisible();

    // Check localStorage saved the collapsed group
    const storedGroups = await page.evaluate(() => localStorage.getItem("smartmso_collapsed_groups"));
    expect(storedGroups).toContain("overview");

    // Click to expand again
    await overviewGroupBtn.click();
    await expect(homeBtn).toBeVisible();
  });

  test("ควรสามารถยุบ Sidebar เป็นโหมดไอคอนกะทัดรัด (Mini Sidebar) และขยายกลับได้", async ({ page }) => {
    const sidebar = page.locator("aside").first();
    const collapseToggleBtn = sidebar.getByTitle("ยุบแถบเมนู (Collapse Sidebar)");

    // Initially expanded
    await expect(collapseToggleBtn).toBeVisible();

    // Click to collapse sidebar
    await collapseToggleBtn.click();

    // Sidebar should now have w-20 class and expand toggle button
    await expect(sidebar).toHaveClass(/w-20/);
    const expandToggleBtn = sidebar.getByTitle("ขยายแถบเมนู (Expand Sidebar)");
    await expect(expandToggleBtn).toBeVisible();

    // Verify localStorage persistence
    const isCollapsedStored = await page.evaluate(() => localStorage.getItem("smartmso_sidebar_collapsed"));
    expect(isCollapsedStored).toBe("true");

    // Click to expand sidebar back
    await expandToggleBtn.click();
    await expect(sidebar).toHaveClass(/w-64/);

    const isCollapsedAfter = await page.evaluate(() => localStorage.getItem("smartmso_sidebar_collapsed"));
    expect(isCollapsedAfter).toBe("false");
  });
});
