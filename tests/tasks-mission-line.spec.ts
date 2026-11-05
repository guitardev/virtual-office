import { test, expect } from "./fixtures";

test.describe("Tasks Module - Kamphaeng Phet MSO Mission Groups & LINE Integration", () => {
  const todayIso = new Date().toISOString().split("T")[0];

  test.beforeEach(async ({ page }) => {
    // Intercept Supabase tasks API to return standard test tasks
    await page.route("**/rest/v1/tasks*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "550e8400-e29b-41d4-a716-446655440001",
              title: "ลงพื้นที่เยี่ยมบ้านและประเมินสภาพความเดือดร้อนครัวเรือนเปราะบาง อ.พรานกระต่าย",
              description: JSON.stringify({
                dept: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
                targetDivision: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
                details: "ติดตามช่วยเหลือครอบครัวเปราะบางรายครัวเรือนตามฐานข้อมูล TPMAP",
                visibility: "department",
                missionGroup: "vulnerable_household",
                assigneeName: "นายเสกพล ดิษฐโชติ",
                subtasks: [{ id: "sub1", text: "บันทึกข้อมูลสมุดพกครอบครัว", done: true }],
              }),
              priority: "high",
              status: "todo",
              due_date: "2026-11-01",
              created_at: new Date().toISOString(),
            },
            {
              id: "550e8400-e29b-41d4-a716-446655440002",
              title: "ตรวจสอบสิทธิ์และรับคำขอเงินอุดหนุนเด็กแรกเกิดประจำเดือน",
              description: JSON.stringify({
                dept: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
                targetDivision: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
                details: "ตรวจสอบข้อมูลความถูกต้องผู้ขอรับสิทธิ์ 600 บาท",
                visibility: "department",
                missionGroup: "child_support",
                assigneeName: "นางอรัญญา เกิดสุข",
                subtasks: [{ id: "sub2", text: "ตรวจเอกสารรับรองรายได้", done: false }],
              }),
              priority: "medium",
              status: "in_progress",
              due_date: todayIso,
              created_at: new Date().toISOString(),
            },
            {
              id: "550e8400-e29b-41d4-a716-446655440003",
              title: "สรุปผลการเบิกจ่ายงบประมาณกองทุนฟื้นฟูสมรรถภาพคนพิการ",
              description: JSON.stringify({
                dept: "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
                targetDivision: "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
                details: "จัดทำเอกสารประกอบการประชุมคณะอนุกรรมการกองทุนคนพิการ",
                visibility: "public",
                missionGroup: "disabilities_fund",
                assigneeName: "นายเสกพล ดิษฐโชติ",
                subtasks: [],
              }),
              priority: "low",
              status: "done",
              due_date: "2026-11-30",
              created_at: new Date().toISOString(),
            },
          ]),
        });
      } else if (route.request().method() === "POST") {
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "550e8400-e29b-41d4-a716-446655440099",
            ...postData,
            created_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("http://localhost:3000/tasks");
  });

  test("1. Renders Kanban Board with MSO Mission badges and Deadline intelligence", async ({
    page,
  }) => {
    // Check page header
    await expect(page.locator("h1:has-text('กระดานติดตามงาน')")).toBeVisible({ timeout: 10000 });

    // Verify Mission badges are displayed on cards
    await expect(page.locator("span.truncate:has-text('กลุ่มเปราะบาง/ศรส.')")).toBeVisible();
    await expect(page.locator("span.truncate:has-text('เงินอุดหนุนเด็ก')")).toBeVisible();

    // Verify Deadline Intelligence badges
    // Task 1 was due 2026-11-01 (overdue)
    await expect(page.locator("text=/เลยกำหนดส่ง/").first()).toBeVisible();

    // Task 2 is due today
    await expect(page.locator("text=ครบกำหนดส่งวันนี้!").first()).toBeVisible();

    // Verify LINE quick button exists on cards
    await expect(page.locator("button:has-text('LINE')").first()).toBeVisible();
  });

  test("2. Filters tasks by Kamphaeng Phet MSO Mission Group", async ({ page }) => {
    await expect(page.locator("h1:has-text('กระดานติดตามงาน')")).toBeVisible({ timeout: 10000 });

    // Find the mission filter select
    const missionSelect = page.locator("select").filter({ hasText: "ทุกกลุ่มภารกิจ พมจ." });
    await expect(missionSelect).toBeVisible();

    // Filter by 'vulnerable_household'
    await missionSelect.selectOption("vulnerable_household");

    // Vulnerable task should be visible
    await expect(page.locator("text=ลงพื้นที่เยี่ยมบ้านและประเมินสภาพความเดือดร้อน")).toBeVisible();

    // Child support task should be hidden
    await expect(page.locator("text=ตรวจสอบสิทธิ์และรับคำขอเงินอุดหนุนเด็กแรกเกิด")).not.toBeVisible();

    // Reset filter to 'all'
    await missionSelect.selectOption("all");
    await expect(page.locator("text=ตรวจสอบสิทธิ์และรับคำขอเงินอุดหนุนเด็กแรกเกิด")).toBeVisible();
  });

  test("3. Opens LINE Share modal with formatted civil-service announcement text", async ({
    page,
    context,
  }) => {
    await expect(page.locator("h1:has-text('กระดานติดตามงาน')")).toBeVisible({ timeout: 10000 });

    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Click LINE button on the first task
    const lineBtn = page.locator("button:has-text('LINE')").first();
    await lineBtn.click();

    // Verify modal is open
    await expect(page.locator("text=ส่งต่อภารกิจราชการเข้ากลุ่ม LINE")).toBeVisible();

    // Verify preview text contains civil service formatting
    const preText = await page.locator("pre").textContent();
    expect(preText).toContain("มอบหมายภารกิจราชการ (Smart MSO)");
    expect(preText).toContain("สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร");
    expect(preText).toContain("กลุ่มภารกิจ:");
    expect(preText).toContain("ระบบสำนักงานเสมือนจริง Smart MSO");

    // Test Copy button
    const copyBtn = page.locator("button:has-text('คัดลอกข้อความ')");
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(page.locator("text=คัดลอกเรียบร้อย!")).toBeVisible();

    // Verify LINE external link button
    const lineLink = page.locator("a:has-text('เปิดแอป LINE เพื่อส่ง')");
    await expect(lineLink).toBeVisible();
    const href = await lineLink.getAttribute("href");
    expect(href).toContain("https://line.me/R/msg/text/?");

    // Close modal
    await page.locator("button.bg-white\\/20:has-text('✕')").click();
    await expect(page.locator("text=ส่งต่อภารกิจราชการเข้ากลุ่ม LINE")).not.toBeVisible();
  });

  test("4. Creates new task with Mission Group selection and verifies card appearance", async ({
    page,
  }) => {
    await expect(page.locator("h1:has-text('กระดานติดตามงาน')")).toBeVisible({ timeout: 10000 });

    // Open Add Modal
    await page.locator("button:has-text('เพิ่มงานใหม่')").click();
    await expect(page.locator("text=เพิ่มภารกิจใหม่ (New Government Task)")).toBeVisible();

    // Fill title
    await page.fill(
      "input[placeholder*='จัดทำรายงานการเงินประจำเดือน']",
      "ภารกิจตรวจเยี่ยมศูนย์บริการคนพิการตำบลท่าพุทรา"
    );

    // Select Mission Group: disabilities_fund
    const missionModalSelect = page.locator("form select").filter({ hasText: "งานศูนย์บริการคนพิการและกองทุนคนพิการ" });
    await missionModalSelect.selectOption("disabilities_fund");

    // Check that department auto-selected to ศูนย์บริการคนพิการ
    const deptSelect = page.locator("form select").filter({ hasText: "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร" });
    await expect(deptSelect).toBeVisible();

    // Fill due date
    await page.fill("input[type='date']", "2026-11-20");

    // Verify Thai date preview is displayed
    await expect(page.locator("text=/วันที่กำหนด:/")).toBeVisible();

    // Submit form
    await page.locator("button:has-text('บันทึกลง Supabase')").click();

    // Verify task is added to board with mission badge
    await expect(
      page.locator("text=ภารกิจตรวจเยี่ยมศูนย์บริการคนพิการตำบลท่าพุทรา")
    ).toBeVisible({ timeout: 5000 });
    await expect(page.locator("span:has-text('คนพิการ/กองทุน')").first()).toBeVisible();
  });

  test("5. Switches to List / Table View and verifies MSO columns and actions", async ({ page }) => {
    await expect(page.locator("h1:has-text('กระดานติดตามงาน')")).toBeVisible({ timeout: 10000 });

    // Switch to List View
    await page.locator("button:has-text('ตารางรายการ')").click();

    // Verify table headers
    await expect(page.locator("th:has-text('กลุ่มภารกิจ พมจ.')")).toBeVisible();
    await expect(page.locator("th:has-text('กำหนดส่ง')")).toBeVisible();
    await expect(page.locator("th:has-text('การจัดการ')")).toBeVisible();

    // Verify rows contain mission badge and LINE button
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await expect(page.locator("table tbody button:has-text('LINE')").first()).toBeVisible();
  });
});

