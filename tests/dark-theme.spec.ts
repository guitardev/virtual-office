import { test, expect } from "./fixtures";

test.describe("Dark Theme & Light Mode Complete Integration", () => {
  test("should toggle between light mode and dark theme seamlessly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. Initial state check: default or saved theme
    const themeToggleBtn = page.locator("button[aria-label='Toggle Dark Mode']");
    await expect(themeToggleBtn).toBeVisible();

    // 2. Toggle to Dark Theme if currently light
    const isInitiallyDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    if (!isInitiallyDark) {
      await themeToggleBtn.click();
    }

    // Verify dark class applied to documentElement and root container
    const isDarkNow = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDarkNow).toBe(true);

    const savedTheme = await page.evaluate(() => localStorage.getItem("smart_mso_theme"));
    expect(savedTheme).toBe("dark");

    // Verify header, sidebar, and main viewport dark theme styles
    const header = page.locator("header");
    await expect(header).toBeVisible();
    await expect(page.locator("text=โหมดสว่าง").first()).toBeVisible();

    // 3. Toggle back to Light Mode
    await themeToggleBtn.click();

    const isDarkAfterToggle = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDarkAfterToggle).toBe(false);

    const savedThemeLight = await page.evaluate(() => localStorage.getItem("smart_mso_theme"));
    expect(savedThemeLight).toBe("light");
    await expect(page.locator("text=โหมดกลางคืน").first()).toBeVisible();
  });

  test("should toggle theme via User Profile popover menu", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click user avatar / profile button
    const userMenuBtn = page.locator("button[title='เมนูโปรไฟล์และเซสชัน']");
    await userMenuBtn.click();

    // Verify theme toggle item inside profile menu
    const menuThemeToggle = page.locator("button", { hasText: /สลับเป็นโหมด/ });
    await expect(menuThemeToggle).toBeVisible();
    await menuThemeToggle.click();

    // Verify html.dark toggled
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    const saved = await page.evaluate(() => localStorage.getItem("smart_mso_theme"));
    expect(saved).toBe(isDark ? "dark" : "light");
  });
});
