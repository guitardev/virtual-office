import { test, expect } from "./fixtures";

test.describe("ระบบการประชุมและนัดหมาย พร้อมเชื่อมโยง Calendar มาตรฐาน (Meetings & Calendar Sync)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
  });

  test("1. ควรเปิดหน้าระบบการประชุมและนัดหมาย และแสดงตัวกรองหมวดหมู่และรูปแบบการประชุม", async ({
    page,
  }) => {
    // Navigate to Meetings module
    const meetingsNav = page
      .locator("aside button:has-text('การประชุม'), nav button:has-text('การประชุม')")
      .first();
    await expect(meetingsNav).toBeVisible();
    await meetingsNav.click();

    // Verify Header
    await expect(page.locator("h1:has-text('การประชุมและนัดหมาย')")).toBeVisible();
    await expect(page.locator("text=Supabase Live").first()).toBeVisible();

    // Verify Filter Tabs
    await expect(page.locator("button:has-text('ประชุมกลุ่มงาน/ฝ่าย')").first()).toBeVisible();
    await expect(page.locator("button:has-text('ประชุมผู้บริหาร')").first()).toBeVisible();
    await expect(page.locator("button:has-text('ประชุมด่วน/เฉพาะกิจ')").first()).toBeVisible();

    // Verify Type Filters
    await expect(page.locator("button:has-text('ออนไลน์')").first()).toBeVisible();
    await expect(page.locator("button:has-text('ออนไซต์')").first()).toBeVisible();
    await expect(page.locator("button:has-text('ไฮบริด')").first()).toBeVisible();
  });

  test("2. สามารถสร้างการประชุมใหม่โดยนำเข้าจากแม่แบบราชการ และกรอกข้อมูลครบถ้วนตามมาตรฐาน", async ({
    page,
  }) => {
    // Navigate to Meetings
    const meetingsNav = page
      .locator("aside button:has-text('การประชุม'), nav button:has-text('การประชุม')")
      .first();
    await meetingsNav.click();

    // Click "สร้างการประชุมใหม่"
    const createBtn = page.locator("button:has-text('สร้างการประชุมใหม่')").first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Verify Modal
    await expect(page.locator("h3:has-text('สร้างการประชุมและนัดหมายใหม่')")).toBeVisible();

    // Click "เลือกแม่แบบ"
    const templateToggle = page.locator("button:has-text('เลือกแม่แบบ')");
    await expect(templateToggle).toBeVisible();
    await templateToggle.click();

    // Choose standard monthly meeting template
    const templateBtn = page.locator("button:has-text('ประชุมประจำเดือนข้าราชการและเจ้าหน้าที่ พมจ.')").first();
    await expect(templateBtn).toBeVisible();
    await templateBtn.click();

    // Verify inputs are filled automatically
    const titleInput = page.locator("input[placeholder*='ประชุมชี้แจงแนวทาง']");
    await expect(titleInput).toHaveValue(/ประจำเดือน/);

    // Verify Agenda textarea has content
    const agendaTextarea = page.locator("textarea[placeholder*='ระบุวาระการประชุม']");
    const agendaContent = await agendaTextarea.inputValue();
    expect(agendaContent).toContain("วาระที่ 1");

    // Click "เลือกทุกคน" for attendees
    const selectAllAttendeesBtn = page.locator("button:has-text('เลือกทุกคน')");
    await selectAllAttendeesBtn.click();

    // Submit form
    const submitBtn = page.locator("button[type='submit']:has-text('บันทึกนัดหมายลง Supabase')");
    await submitBtn.click();

    // Verify meeting card appears in list
    const createdCard = page.locator("h3:has-text('การประชุมประจำเดือนข้าราชการและเจ้าหน้าที่')").first();
    await expect(createdCard).toBeVisible();
  });

  test("3. ต้องมีปุ่มเชื่อมต่อ Google Calendar ที่ได้มาตรฐาน และสร้าง URL ครบถ้วน", async ({
    page,
  }) => {
    // Navigate to Meetings
    const meetingsNav = page
      .locator("aside button:has-text('การประชุม'), nav button:has-text('การประชุม')")
      .first();
    await meetingsNav.click();

    // Verify Google Calendar button exists on card
    const googleCalBtn = page.locator("a:has-text('เพิ่มลง Google Calendar')").first();
    await expect(googleCalBtn).toBeVisible();

    // Verify href URL structure complies with Google Calendar standards
    const href = await googleCalBtn.getAttribute("href");
    expect(href).toContain("calendar.google.com/calendar/render?action=TEMPLATE");
    expect(href).toContain("&text=");
    expect(href).toContain("&dates=");
    expect(href).toContain("&details=");
    expect(href).toContain("&location=");
  });

  test("4. เปิดดูรายละเอียดการประชุม (Detail Modal) ตรวจสอบวาระ ผู้เข้าร่วม และคัดลอกข้อความเชิญ", async ({
    page,
  }) => {
    // Navigate to Meetings
    const meetingsNav = page
      .locator("aside button:has-text('การประชุม'), nav button:has-text('การประชุม')")
      .first();
    await meetingsNav.click();

    // Click "รายละเอียด" button on first card
    const detailBtn = page.locator("button:has-text('รายละเอียด')").first();
    await expect(detailBtn).toBeVisible();
    await detailBtn.click();

    // Verify Detail Modal
    await expect(page.locator("h3:has-text('รายละเอียดการประชุมและนัดหมาย')")).toBeVisible();
    await expect(page.locator("text=ระเบียบวาระและรายละเอียดการประชุม")).toBeVisible();
    await expect(page.locator("text=ผู้เข้าร่วมประชุม")).toBeVisible();
    await expect(page.locator("text=บันทึกลงปฏิทินตามมาตรฐานสากล")).toBeVisible();

    // Test Copy Invitation button
    const copyBtn = page.locator("button:has-text('คัดลอกข้อความเชิญ')");
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    // Close modal
    const closeBtn = page.locator("button:has-text('ปิดหน้าต่าง')");
    await closeBtn.click();
    await expect(page.locator("h3:has-text('รายละเอียดการประชุมและนัดหมาย')")).not.toBeVisible();
  });

  test("5. สามารถดาวน์โหลดปฏิทินรวมทั้งหมดในรูปแบบ .ics ได้", async ({ page }) => {
    // Navigate to Meetings
    const meetingsNav = page
      .locator("aside button:has-text('การประชุม'), nav button:has-text('การประชุม')")
      .first();
    await meetingsNav.click();

    // Verify Export all .ics button
    const exportIcsBtn = page.locator("button:has-text('ส่งออกปฏิทิน (.ics)')").first();
    if (await exportIcsBtn.isVisible()) {
      await exportIcsBtn.click();
      // Toast notification confirms download
      await expect(page.locator("text=ดาวน์โหลดปฏิทินการประชุมทั้งหมด (.ics) เรียบร้อย")).toBeVisible();
    }
  });

  test("6. หน้า /meetings ต้องแสดงรายการ 'กำลังจะถึง' เป็นค่าเริ่มต้น พร้อมสลับดูทั้งหมดและที่ผ่านมาแล้วได้", async ({
    page,
  }) => {
    const now = Date.now();
    const pastStart = new Date(now - 72 * 3600 * 1000).toISOString();
    const pastEnd = new Date(now - 70 * 3600 * 1000).toISOString();
    const soonStart = new Date(now + 24 * 3600 * 1000).toISOString();
    const soonEnd = new Date(now + 26 * 3600 * 1000).toISOString();
    const laterStart = new Date(now + 96 * 3600 * 1000).toISOString();
    const laterEnd = new Date(now + 98 * 3600 * 1000).toISOString();

    await page.route("**/rest/v1/meetings*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "11111111-1111-4111-8111-111111111111",
              title: "ประชุมทดสอบที่ผ่านมาแล้ว (Past Mock)",
              start_time: pastStart,
              end_time: pastEnd,
              location: "ห้องประชุม 1",
              type: "onsite",
              category: "general",
              status: "confirmed",
              attendees: [],
            },
            {
              id: "22222222-2222-4222-8222-222222222222",
              title: "ประชุมทดสอบระยะไกลถัดไป (Later Upcoming Mock)",
              start_time: laterStart,
              end_time: laterEnd,
              location: "ห้องประชุม 2",
              type: "online",
              category: "division",
              status: "confirmed",
              attendees: [],
            },
            {
              id: "33333333-3333-4333-8333-333333333333",
              title: "ประชุมทดสอบที่กำลังจะถึงเร็วๆ นี้ (Soonest Upcoming Mock)",
              start_time: soonStart,
              end_time: soonEnd,
              location: "ห้องประชุม 1",
              type: "hybrid",
              category: "management",
              status: "confirmed",
              attendees: [],
            },
          ]),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/meetings", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1:has-text('การประชุมและนัดหมาย')")).toBeVisible();

    const upcomingBtn = page.locator("button:has-text('กำลังจะถึง (2)')");
    const allBtn = page.locator("button:has-text('ทั้งหมด (3)')");
    const pastBtn = page.locator("button:has-text('ที่ผ่านมาแล้ว (1)')");

    await expect(upcomingBtn).toHaveAttribute("aria-pressed", "true");
    await expect(allBtn).toHaveAttribute("aria-pressed", "false");
    await expect(pastBtn).toHaveAttribute("aria-pressed", "false");

    // Default shows only upcoming meetings sorted soonest-first
    await expect(page.locator("h3:has-text('Soonest Upcoming Mock')")).toBeVisible();
    await expect(page.locator("h3:has-text('Later Upcoming Mock')")).toBeVisible();
    await expect(page.locator("h3:has-text('Past Mock')")).not.toBeVisible();

    const visibleTitles = await page.locator("div.grid h3").allTextContents();
    expect(visibleTitles[0]).toContain("Soonest Upcoming Mock");
    expect(visibleTitles[1]).toContain("Later Upcoming Mock");

    // Switch to Past
    await pastBtn.click();
    await expect(pastBtn).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("h3:has-text('Past Mock')")).toBeVisible();
    await expect(page.locator("h3:has-text('Soonest Upcoming Mock')")).not.toBeVisible();

    // Switch to All
    await allBtn.click();
    await expect(allBtn).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("h3:has-text('Past Mock')")).toBeVisible();
    await expect(page.locator("h3:has-text('Soonest Upcoming Mock')")).toBeVisible();
    await expect(page.locator("h3:has-text('Later Upcoming Mock')")).toBeVisible();
  });

  test("7. เมื่อไม่มีนัดหมายที่กำลังจะถึง ต้องแสดงข้อความเฉพาะและปุ่มดูการประชุมทั้งหมดได้ทันที", async ({
    page,
  }) => {
    const now = Date.now();
    const pastStart = new Date(now - 48 * 3600 * 1000).toISOString();
    const pastEnd = new Date(now - 46 * 3600 * 1000).toISOString();

    await page.route("**/rest/v1/meetings*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "44444444-4444-4444-8444-444444444444",
              title: "ประชุมประวัติย้อนหลังเท่านั้น (Archive Only Mock)",
              start_time: pastStart,
              end_time: pastEnd,
              location: "ห้องประชุม 1",
              type: "onsite",
              category: "general",
              status: "confirmed",
              attendees: [],
            },
          ]),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/meetings", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h3:has-text('ยังไม่มีนัดหมายการประชุมที่กำลังจะถึง')")).toBeVisible();

    const viewAllBtn = page.locator("button:has-text('ดูการประชุมทั้งหมด (1)')");
    await expect(viewAllBtn).toBeVisible();
    await viewAllBtn.click();

    await expect(page.locator("h3:has-text('Archive Only Mock')")).toBeVisible();
  });

  test("8. ระบบเลือกเวลาและแสดงผลเวลาการประชุมใช้รูปแบบ 24 ชม. (ไม่มี AM/PM)", async ({
    page,
  }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const afternoonStart = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      14,
      30,
      0
    ).toISOString();
    const afternoonEnd = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      16,
      0,
      0
    ).toISOString();

    await page.route("**/rest/v1/meetings*", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "55555555-5555-4555-8555-555555555555",
              title: "ประชุมภาคบ่าย 24 ชม. (Afternoon 24h Mock)",
              start_time: afternoonStart,
              end_time: afternoonEnd,
              location: "ห้องประชุมชั้น 2",
              type: "onsite",
              category: "general",
              status: "confirmed",
              attendees: [],
            },
          ]),
        });
        return;
      }
      if (method === "POST") {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "66666666-6666-4666-8666-666666666666",
            ...body,
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/meetings", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1:has-text('การประชุมและนัดหมาย')")).toBeVisible();

    // Hydrated afternoon meeting must display strict 24-hour format without AM/PM
    await expect(page.locator("h3:has-text('Afternoon 24h Mock')")).toBeVisible();
    await expect(page.getByText("14:30 - 16:00 น.")).toBeVisible();

    // Open Create Meeting Modal
    await page.locator("button:has-text('สร้างการประชุมใหม่')").first().click();
    await expect(page.locator("h3:has-text('สร้างการประชุมและนัดหมายใหม่')")).toBeVisible();

    // Must not use native <input type="time"> which renders AM/PM on en-US browsers
    await expect(page.locator('input[type="time"]')).toHaveCount(0);

    // 24-hour selects should allow selecting 15:30 - 18:00
    const startHourSelect = page.getByLabel("เวลาเริ่มต้น (ชั่วโมง)");
    const startMinSelect = page.getByLabel("เวลาเริ่มต้น (นาที)");
    const endHourSelect = page.getByLabel("เวลาสิ้นสุด (ชั่วโมง)");
    const endMinSelect = page.getByLabel("เวลาสิ้นสุด (นาที)");

    await expect(startHourSelect.locator('option[value="23"]')).toHaveCount(1);
    await startHourSelect.selectOption("15");
    await startMinSelect.selectOption("30");
    await endHourSelect.selectOption("18");
    await endMinSelect.selectOption("00");

    // Multi-day mode must also use 24-hour selects (zero native time inputs)
    const multiDayCheckbox = page
      .locator("label:has-text('การประชุมต่อเนื่องหลายวัน') input[type='checkbox']");
    await multiDayCheckbox.check();
    await expect(page.locator('input[type="time"]')).toHaveCount(0);
    await expect(page.getByLabel("เวลาเริ่ม (ชั่วโมง)")).toHaveValue("15");
    await expect(page.getByLabel("เวลาสิ้นสุด (ชั่วโมง)")).toHaveValue("18");

    // Switch back to single-day and submit
    await multiDayCheckbox.uncheck();
    await page
      .locator("input[placeholder*='ประชุมชี้แจงแนวทาง']")
      .fill("ทดสอบสร้างนัดหมาย 24 ชม.");
    await page.locator("button[type='submit']").click();

    await expect(page.locator("h3:has-text('ทดสอบสร้างนัดหมาย 24 ชม.')")).toBeVisible();
    await expect(page.getByText("15:30 - 18:00 น.")).toBeVisible();
  });
});
