import { test, expect } from "@playwright/test";

test.describe("Synology NAS Exclusive Authentication", () => {
  test("LoginPage displays exclusively Synology NAS auth and hides inactive auth options", async ({ page }) => {
    // Navigate without pre-injected session
    await page.goto("/");

    // 1. Check Header & Exclusive Authentication Title
    await expect(page.locator("h2")).toContainText("เข้าสู่ระบบด้วย Synology NAS");
    await expect(page.getByText("ระบบยืนยันตัวตนหลัก: Synology DSM WebAPI")).toBeVisible();
    await expect(page.getByText("ระบบอื่นปิดไว้ชั่วคราว เพื่อรอการพัฒนาให้สมบูรณ์")).toBeVisible();

    // 2. Verify Synology credentials inputs exist
    const usernameInput = page.getByPlaceholder("เช่น admin หรือชื่อผู้ใช้บน NAS");
    await expect(usernameInput).toBeVisible();

    const passwordInput = page.getByPlaceholder("ระบุรหัสผ่านบัญชี Synology DSM");
    await expect(passwordInput).toBeVisible();

    // 3. Verify submit button
    const submitBtn = page.getByRole("button", { name: "เข้าสู่ระบบผ่าน Synology NAS ➜" });
    await expect(submitBtn).toBeVisible();

    // 4. Verify inactive alternatives (Email tab, Sign Up tab, OAuth SSO) are NOT present
    await expect(page.getByRole("button", { name: "✉️ อีเมล" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "✍️ ลงทะเบียน" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Google" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "LINE" })).not.toBeVisible();
    await expect(page.getByText("ขอสิทธิ์เข้าใช้งานใหม่ (Request Access)")).not.toBeVisible();
  });
});
