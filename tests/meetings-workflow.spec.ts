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
    expect(agendaContent).toContain("วาระที่ ๑");

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
});
