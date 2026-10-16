import { test, expect } from "@playwright/test";

test.describe("Database Auth Exclusive Authentication", () => {
  test("LoginPage displays Database Auth without Synology branding and hides inactive auth options", async ({ page }) => {
    // Navigate without pre-injected session
    await page.goto("/");

    // 1. Check Header & Exclusive Authentication Title
    await expect(page.locator("h2")).toContainText("เข้าสู่ระบบสำนักงานเสมือน");
    await expect(page.getByText("ระบบยืนยันตัวตนหลัก: Database Auth")).toBeVisible();
    await expect(page.getByText("ระบบอื่นปิดไว้ชั่วคราว เพื่อรอการพัฒนาให้สมบูรณ์")).toBeVisible();

    // 2. Check Database Auth status indicators
    await expect(page.getByText("Database Auth Live", { exact: true })).toBeVisible();

    // 3. Verify credentials inputs exist with sanitized generic placeholders and empty value
    const usernameInput = page.getByPlaceholder("ระบุชื่อบัญชีผู้ใช้งาน");
    await expect(usernameInput).toBeVisible();
    await expect(usernameInput).toHaveValue("");

    const passwordInput = page.getByPlaceholder("ระบุรหัสผ่านบัญชีผู้ใช้งาน");
    await expect(passwordInput).toBeVisible();

    // 4. Verify submit button
    const submitBtn = page.getByRole("button", { name: "เข้าสู่ระบบ ➜" });
    await expect(submitBtn).toBeVisible();

    // 5. Verify NO "Synology" or "DSM" is exposed in visible text on the login card
    const loginCard = page.locator(".w-full.max-w-md");
    const loginText = await loginCard.innerText();
    expect(loginText.toLowerCase()).not.toContain("synology");

    // 6. Verify inactive alternatives (Email tab, Sign Up tab, OAuth SSO) are NOT present
    await expect(page.getByRole("button", { name: "✉️ อีเมล" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "✍️ ลงทะเบียน" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Google" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "LINE" })).not.toBeVisible();
    await expect(page.getByText("ขอสิทธิ์เข้าใช้งานใหม่ (Request Access)")).not.toBeVisible();
  });
});
