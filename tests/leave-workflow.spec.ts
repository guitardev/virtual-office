import { test, expect } from "./fixtures";

const MOCK_EXISTING_APPROVED_LEAVE = {
  id: "mock-leave-approved-1",
  requestNo: "LEAVE-2570-001",
  leaveType: "vacation_leave",
  leaveDayPeriod: "full",
  writtenAt: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดสระบุรี",
  writtenDate: "2026-11-20",
  subject: "ขอลาพักผ่อน",
  toRecipient: "ผู้ว่าราชการจังหวัดสระบุรี",
  applicantUserId: "syno_เสกพล",
  applicantName: "นายเสกพล ดิษฐโชติ",
  applicantPosition: "นักพัฒนาสังคมชำนาญการ",
  applicantDivision: "ฝ่ายบริหารทั่วไป",
  reason: "พักผ่อนประจำปี",
  startDate: "2026-11-25",
  endDate: "2026-11-26",
  totalWorkingDays: 2,
  cancelledDays: 0,
  cancelTargetLeaveId: null,
  cancelTargetRequestNo: null,
  cancelTargetLeaveType: null,
  cancelTargetStartDate: null,
  cancelTargetEndDate: null,
  cancelTargetDays: null,
  lastLeaveType: null,
  lastLeaveStartDate: null,
  lastLeaveEndDate: null,
  lastLeaveDays: null,
  contactInfo: "จังหวัดสระบุรี",
  contactPhone: "0812345678",
  vacationAccumulatedDays: 10,
  vacationAnnualDays: 10,
  actingPersonUserId: null,
  actingPersonName: "",
  actingPersonPosition: "",
  fiscalYear: 2570,
  prevSickDays: 1,
  prevPersonalDays: 0,
  prevMaternityDays: 0,
  prevVacationDays: 0,
  status: "approved",
  verifierUserId: "syno_เสกพล",
  verifierName: "นายเสกพล ดิษฐโชติ",
  verifierPosition: "นักพัฒนาสังคมชำนาญการ",
  verifierNote: "สถิติถูกต้อง",
  verifiedAt: "2026-11-20T09:00:00Z",
  supervisorUserId: "syno_เสกพล",
  supervisorName: "นายเสกพล ดิษฐโชติ",
  supervisorPosition: "นักพัฒนาสังคมชำนาญการ",
  supervisorComment: "เห็นควรอนุญาต",
  supervisorReviewedAt: "2026-11-20T09:10:00Z",
  approverUserId: "syno_เสกพล",
  approverName: "นายเสกพล ดิษฐโชติ",
  approverPosition: "นักพัฒนาสังคมชำนาญการ",
  orderDecision: "approved",
  orderComment: "อนุญาต",
  orderedAt: "2026-11-20T09:20:00Z",
  applicantSignature: null,
  actingPersonSignature: null,
  verifierSignature: null,
  supervisorSignature: null,
  approverSignature: null,
  attachmentUrl: null,
  attachmentName: null,
  attachmentStorage: null,
  excludedHolidays: [],
  returnedByName: null,
  returnedNote: null,
  returnedAt: null,
  syncedToAttendance: true,
  syncedAt: "2026-11-20T09:20:00Z",
  syncNote: "Synced",
  createdAt: "2026-11-20T08:30:00Z",
  updatedAt: "2026-11-20T09:20:00Z",
};

test.describe("ระบบใบลาอิเล็กทรอนิกส์ (Leave Request v2 Workflow)", () => {
  test.beforeEach(async ({ page }) => {
    // Mock /api/leave* and Supabase leave_requests reads/writes so production DB is untouched
    await page.route("**/rest/v1/leave_requests*", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
    });

    await page.route("**/rest/v1/leave_authorized_roles*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/leave/holidays*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, holidays: [] }),
      });
    });

    await page.route("**/api/leave?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          needsMigration: false,
          needsV2Migration: false,
          needsRoleMigration: false,
          requests: [MOCK_EXISTING_APPROVED_LEAVE],
          balances: [
            {
              userId: "syno_เสกพล",
              fiscalYear: 2570,
              sickDaysCarried: 1,
              personalDaysCarried: 0,
              maternityDaysCarried: 0,
              vacationAccumulatedDays: 10,
              vacationAnnualDays: 10,
              vacationDaysCarried: 0,
            },
          ],
          mappedUserIds: ["syno_เสกพล"],
          authorizedEditorIds: ["syno_เสกพล"],
          leaveRoles: [
            { userId: "syno_เสกพล", canVerify: true, canSupervise: true, canApprove: true },
          ],
          holidays: [],
        }),
      });
    });

    await page.goto("/leave");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("ระบบใบลาอิเล็กทรอนิกส์ (Leave Request)")).toBeVisible({
      timeout: 15000,
    });
  });

  test("1. แสดง KPI Cards 4 ใบ และปุ่มเลือกแบบฟอร์มมาตรฐานราชการ 3 แบบครบถ้วน", async ({
    page,
  }) => {
    await expect(page.getByText(/ลาป่วยปีงบฯ/)).toBeVisible();
    await expect(page.getByText("📋 เกณฑ์ 23 วัน (กิจ+ป่วย)")).toBeVisible();
    await expect(page.getByText("🌴 ลาพักผ่อนคงเหลือ")).toBeVisible();
    await expect(page.getByText("⏳ สถานะงานใบลา")).toBeVisible();

    await expect(
      page.getByRole("button", { name: /แบบฟอร์ม 1: ป่วย \/ กิจ \/ คลอด/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /แบบฟอร์ม 2: ใบลาพักผ่อน/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /แบบฟอร์ม 3: ขอยกเลิกวันลา/ })
    ).toBeVisible();
  });

  test("2. หักวันหยุดราชการสงกรานต์อัตโนมัติ + แสดงคำแนะนำใบรับรองแพทย์ (ป่วย >= 3 วัน) + แจ้งเตือน Overlap", async ({
    page,
  }) => {
    const dateCard = page.locator("div.rounded-2xl").filter({
      hasText: "จำนวนวันลาสุทธิ (คำนวณอัตโนมัติ)",
    });
    const startInput = dateCard.locator('input[type="date"]').nth(0);
    const endInput = dateCard.locator('input[type="date"]').nth(1);

    // Selecting Songkran range 2026-04-10 .. 2026-04-17: 8 calendar days -> 3 working days (skips Sat/Sun + 13-15 Apr)
    await startInput.fill("2026-04-10");
    await endInput.fill("2026-04-17");

    await expect(dateCard).toContainText("3 วันทำการ");
    await expect(page.getByText(/หักวันหยุดราชการ 3 วัน/)).toBeVisible();
    // Sick leave default + >= 3 working days triggers medical certificate recommendation
    await expect(
      page.getByText(/การลาป่วยตั้งแต่ 3 วันทำการขึ้นไป/)
    ).toBeVisible();

    // Overlapping mocked approved leave (2026-11-25 .. 2026-11-26) blocks submission
    await startInput.fill("2026-11-25");
    await endInput.fill("2026-11-26");

    await expect(
      page.getByText(/พบวันลาซ้อนทับกับคำขอที่มีอยู่แล้ว/)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /ส่งใบลาเข้าสู่สายการพิจารณา/ })
    ).toBeDisabled();
  });

  test("3. สลับไปยังแบบฟอร์ม 3 (ขอยกเลิกวันลา) และเปิดดูตัวอย่างแบบฟอร์ม A4 ได้", async ({
    page,
  }) => {
    // Switch to Form 3
    await page
      .getByRole("button", { name: /แบบฟอร์ม 3: ขอยกเลิกวันลา/ })
      .click();
    await expect(
      page.getByText(/เลือกใบลาที่ได้รับอนุญาตแล้วและต้องการขอยกเลิกวันลา/)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /ส่งแบบใบขอยกเลิกวันลา/ })
    ).toBeVisible();

    // Switch to Tab 2 (ใบลาของฉัน) and open A4 Preview modal
    await page.getByRole("button", { name: /ใบลาของฉัน/ }).click();
    await expect(page.getByText("LEAVE-2570-001").first()).toBeVisible();

    await page.getByRole("button", { name: /ดูตัวอย่าง A4/ }).first().click();
    await expect(page.locator("#leave-print-sheet")).toBeVisible();
    await expect(page.locator("#leave-print-sheet")).toContainText("นายเสกพล ดิษฐโชติ");
  });

  test("4. ล็อกผู้มีอำนาจสั่งอนุญาตเป็น นางสาวมะลิวัน สิทธิโยธี เพียงคนเดียว และรองรับการบันทึกผลแทนในระบบโดยไม่สวมลายเซ็น", async ({
    page,
  }) => {
    const pendingOrderLeave = {
      ...MOCK_EXISTING_APPROVED_LEAVE,
      id: "mock-leave-pending-order",
      requestNo: "LV-2570-0088",
      applicantUserId: "syno_ธนวัฒน์",
      applicantName: "นายธนวัฒน์ แกมขุนทด",
      status: "pending_approver",
      orderDecision: null,
      orderComment: null,
      orderedAt: null,
      approverUserId: "syno_มะลิวัน",
      approverName: "นางสาวมะลิวัน สิทธิโยธี",
      approverPosition: "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
      verifierUserId: "syno_ยุทธนา",
      verifierName: "นายยุทธนา เจนจบ",
      verifierPosition: "เจ้าพนักงานธุรการปฏิบัติงาน",
      verifiedAt: "2026-11-23T08:00:00Z",
      supervisorUserId: "syno_วรวุฒิ",
      supervisorName: "นายวรวุฒิ พึ่งพัก",
      supervisorPosition: "นักพัฒนาสังคมชำนาญการพิเศษ",
      supervisorComment: "เห็นควรอนุญาต",
      supervisorReviewedAt: "2026-11-23T08:30:00Z",
    };

    await page.route("**/api/leave?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          needsMigration: false,
          needsV2Migration: false,
          needsRoleMigration: false,
          requests: [MOCK_EXISTING_APPROVED_LEAVE, pendingOrderLeave],
          balances: [],
          mappedUserIds: ["syno_เสกพล"],
          authorizedEditorIds: ["syno_เสกพล"],
          leaveRoles: [],
          holidays: [],
        }),
      });
    });

    await page.reload();
    await expect(page.getByText("ระบบใบลาอิเล็กทรอนิกส์ (Leave Request)")).toBeVisible();

    // Tab 1: 4-step workflow strip & sole approver locked without picker dropdown + operator note
    await expect(page.getByText(/เสนอแฟ้มกระดาษให้ พมจ\./).first()).toBeVisible();
    await expect(page.getByText("นางสาวมะลิวัน สิทธิโยธี").first()).toBeVisible();
    await expect(
      page.getByText(/ผู้มีอำนาจสั่งอนุญาตเพียงผู้เดียว/).first()
    ).toBeVisible();
    await expect(page.getByText(/นายยุทธนา เจนจบ/).first()).toBeVisible();

    // Switch to Tab 3 (พิจารณาใบลา)
    await page.getByRole("button", { name: /พิจารณาใบลา/ }).click();
    await expect(page.getByText("LV-2570-0088").first()).toBeVisible();

    const recordOrderBtn = page.getByRole("button", {
      name: /3\. ปรับสถานะอนุญาต \(หลัง พมจ\. เซ็น\)/,
    });
    await expect(recordOrderBtn).toBeVisible();
    await recordOrderBtn.click();

    // Proxy order modal should display paper-handoff exports, notice, lock legal approver, and hide signature canvas
    await expect(
      page.getByText(/3\. ปรับสถานะคำสั่งอนุญาต \(หลัง พมจ\. เซ็นเอกสาร\)/)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Word เสนอแฟ้ม/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /PDF เสนอแฟ้ม/ })
    ).toBeVisible();
    await expect(
      page.getByText(/ผู้มีอำนาจสั่งอนุญาตตามเอกสารยังคงเป็น/)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /ยืนยันบันทึกผลตามเอกสาร/ })
    ).toBeVisible();
    await expect(page.getByText("ลายมือชื่อผู้พิจารณา")).toHaveCount(0);
  });

  test("5. เปิดดูทะเบียนคุมวันลารายบุคคลตรงตาม Template (12 คอลัมน์ + ยอดสะสม/ประจำปี + ปุ่มดาวน์โหลด Excel)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /ใบลาของฉัน/ }).click();
    const openRegisterBtn = page.getByRole("button", {
      name: /ทะเบียนคุมวันลาของฉัน/,
    });
    await expect(openRegisterBtn).toBeVisible();
    await openRegisterBtn.click();

    const sheet = page.locator("#leave-register-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText(
      "สถิติวันลาของข้าราชการ/พนักงานราชการ/พนักงานกองทุน"
    );
    await expect(sheet).toContainText(
      "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
    );
    await expect(sheet).toContainText("นายเสกพล ดิษฐโชติ");
    await expect(sheet).toContainText("ลาป่วย");
    await expect(sheet).toContainText("ลากิจ");
    await expect(sheet).toContainText("ลาพักผ่อน");
    await expect(sheet).toContainText("คงเหลือ");
    await expect(sheet).toContainText("สะสม 10 ประจำปี 10");
    await expect(sheet).toContainText("LEAVE-2570-001");
    await expect(
      page.getByRole("button", { name: /ดาวน์โหลด Excel/ })
    ).toBeVisible();
  });

  test("6. คำนวณจำนวนวันลาครั้งสุดท้ายอัตโนมัติตามช่วงวันที่ และป้องกันกรอกเกินวันทำการจริง", async ({
    page,
  }) => {
    const lastLeaveBox = page.locator("div.rounded-xl").filter({
      hasText: "ประวัติการลาครั้งสุดท้าย",
    });
    const lastTypeSelect = lastLeaveBox.locator("select");
    const lastStartInput = lastLeaveBox.locator('input[type="date"]').nth(0);
    const lastEndInput = lastLeaveBox.locator('input[type="date"]').nth(1);
    const lastDaysInput = lastLeaveBox.locator('input[type="number"]');

    // เลือกลาป่วย 2026-10-30 .. 2026-10-30 -> ต้องคำนวณอัตโนมัติเป็น 1 วัน
    await lastTypeSelect.selectOption("sick_leave");
    await lastStartInput.fill("2026-10-30");
    await expect(lastEndInput).toHaveValue("2026-10-30");
    await expect(lastDaysInput).toHaveValue("1");

    // ทดลองกรอก 2 วัน (เกินวันทำการจริง 1 วัน) -> ต้องแสดงข้อความเตือนและปิดปุ่มส่ง
    await lastDaysInput.fill("2");
    await expect(
      lastLeaveBox.getByText(/มากกว่าจำนวนวันทำการจริง/)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /ส่งใบลาเข้าสู่สายการพิจารณา/ })
    ).toBeDisabled();

    // ปรับเป็น 0.5 (ครึ่งวัน) -> ผ่าน ไม่มีข้อความเตือน
    await lastDaysInput.fill("0.5");
    await expect(
      lastLeaveBox.getByText(/มากกว่าจำนวนวันทำการจริง/)
    ).toHaveCount(0);
  });
});
