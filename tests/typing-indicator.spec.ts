import { test, expect } from "./fixtures";

test.describe("Chat Live Typing Indicator", () => {
  test("ควรแสดงสถานะ 'กำลังพิมพ์...' เมื่อสมาชิกคนอื่นกำลังพิมพ์ข้อความ", async ({ browser }) => {
    // Context 1: User A (นายเสกพล)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    pageA.on("console", (msg) => console.log("PageA console:", msg.text()));
    await pageA.addInitScript(() => {
      localStorage.setItem(
        "smartmso_auth_session",
        JSON.stringify({
          user: {
            id: "usr_2",
            name: "นายเสกพล ดิษฐโชติ",
            role: "manager",
            division: "ฝ่ายบริหารทั่วไป",
          },
        })
      );
    });

    // Context 2: User B (นายวรวุฒิ)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    pageB.on("console", (msg) => console.log("PageB console:", msg.text()));
    await pageB.addInitScript(() => {
      localStorage.setItem(
        "smartmso_auth_session",
        JSON.stringify({
          user: {
            id: "usr_3",
            name: "นายวรวุฒิ พึ่งพัก",
            role: "manager",
            division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
          },
        })
      );
    });

    // Open both pages
    await pageA.goto("/", { waitUntil: "domcontentloaded" });
    await pageB.goto("/", { waitUntil: "domcontentloaded" });

    // Both navigate to chat
    const chatBtnA = pageA.locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')").first();
    const chatBtnB = pageB.locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')").first();
    await chatBtnA.click();
    await chatBtnB.click();

    // Both are in the default group "ch_all_staff"
    await pageA.waitForTimeout(2000);
    await pageB.waitForTimeout(2000);

    // User A types in chat input
    const inputA = pageA.locator("textarea[placeholder*='พิมพ์ข้อความ']").first();
    await expect(inputA).toBeVisible();
    await inputA.click();
    await inputA.fill("สวัสดีครับ กำลังพิมพ์ข้อความทดสอบ");

    // Check if Page B sees "กำลังพิมพ์..."
    await pageB.waitForTimeout(2000);
    const typingIndicatorB = pageB.locator("text=กำลังพิมพ์...");
    const isVisible = await typingIndicatorB.isVisible().catch(() => false);
    expect(isVisible).toBe(true);

    await contextA.close();
    await contextB.close();
  });
});
