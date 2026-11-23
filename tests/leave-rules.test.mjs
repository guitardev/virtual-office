import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

// Allow Node 24 native TypeScript loader to resolve extensionless relative .ts imports used by bundler tsconfig
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !path.extname(specifier) &&
      context.parentURL
    ) {
      const parentPath = fileURLToPath(context.parentURL);
      const tsCandidate = path.resolve(path.dirname(parentPath), `${specifier}.ts`);
      if (existsSync(tsCandidate)) {
        return { url: pathToFileURL(tsCandidate).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});

const { DEFAULT_THAI_HOLIDAYS, buildHolidayMap, getHolidayFiscalYear } = await import(
  "../lib/thai-holidays.ts"
);
const {
  getEffectiveLeaveDays,
  getWorkingDatesBetween,
  calculateLeavePeriodDetails,
  detectLeaveOverlap,
  countWorkingDaysInRange,
  resolveLeaveAttachmentUrl,
} = await import("../lib/leave-utils.ts");

function makeMockLeave(overrides = {}) {
  return {
    id: "leave-1",
    requestNo: "LEAVE-2570-001",
    leaveType: "sick_leave",
    leaveDayPeriod: "full",
    writtenAt: "พมจ.สระบุรี",
    writtenDate: "2026-11-23",
    subject: "ขออนุญาตลาป่วย",
    toRecipient: "ผู้ว่าราชการจังหวัดสระบุรี",
    applicantUserId: "syno_เสกพล",
    applicantName: "นายเสกพล ดิษฐโชติ",
    applicantPosition: "นักพัฒนาสังคมชำนาญการ",
    applicantDivision: "ฝ่ายบริหารทั่วไป",
    reason: "มีไข้",
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
    contactInfo: "สระบุรี",
    contactPhone: "0812345678",
    vacationAccumulatedDays: 10,
    vacationAnnualDays: 10,
    actingPersonUserId: null,
    actingPersonName: "",
    actingPersonPosition: "",
    fiscalYear: 2570,
    prevSickDays: 0,
    prevPersonalDays: 0,
    prevMaternityDays: 0,
    prevVacationDays: 0,
    status: "approved",
    verifierUserId: null,
    verifierName: null,
    verifierPosition: null,
    verifierNote: null,
    verifiedAt: null,
    supervisorUserId: null,
    supervisorName: null,
    supervisorPosition: null,
    supervisorComment: null,
    supervisorReviewedAt: null,
    approverUserId: null,
    approverName: null,
    approverPosition: null,
    orderDecision: "approved",
    orderComment: null,
    orderedAt: null,
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
    syncedAt: null,
    syncNote: null,
    createdAt: "2026-11-23T08:00:00Z",
    updatedAt: "2026-11-23T08:00:00Z",
    ...overrides,
  };
}

describe("Leave System v2 Business Rules & Thai Holiday Calculations", () => {
  it("should exclude weekends and Thai public holidays during Songkran range", () => {
    // 2026-04-10 (Fri) .. 2026-04-17 (Fri):
    // 04-10 (Fri: work), 04-11..12 (Sat/Sun: 2 weekends), 04-13..15 (Mon-Wed: 3 Songkran holidays),
    // 04-16 (Thu: work), 04-17 (Fri: work) => 3 working days
    const res = calculateLeavePeriodDetails({
      startDate: "2026-04-10",
      endDate: "2026-04-17",
      leaveType: "vacation_leave",
      holidayMap: DEFAULT_THAI_HOLIDAYS,
    });

    assert.equal(res.isCalendarCount, false);
    assert.equal(res.allCalendarDays, 8);
    assert.equal(res.skippedWeekends, 2);
    assert.equal(res.skippedHolidays.length, 3);
    assert.deepEqual(res.workingDates, ["2026-04-10", "2026-04-16", "2026-04-17"]);
    assert.equal(res.totalWorkingDays, 3);
  });

  it("should respect custom DB holiday additions and inactive overrides in buildHolidayMap", () => {
    const customMap = buildHolidayMap([
      {
        holidayDate: "2026-11-25",
        name: "วันหยุดกรณีพิเศษทดสอบ",
        fiscalYear: getHolidayFiscalYear("2026-11-25"),
        isActive: true,
      },
      {
        holidayDate: "2026-04-06",
        name: "วันจักรี (ทดลองปิด)",
        fiscalYear: 2569,
        isActive: false,
      },
    ]);

    assert.equal(customMap["2026-11-25"], "วันหยุดกรณีพิเศษทดสอบ");
    assert.equal(customMap["2026-04-06"], undefined);

    const dates = getWorkingDatesBetween("2026-11-24", "2026-11-26", customMap);
    assert.deepEqual(dates, ["2026-11-24", "2026-11-26"]);
  });

  it("should calculate half-day leave as 0.5 on working days and 0 on holidays", () => {
    const morningWork = calculateLeavePeriodDetails({
      startDate: "2026-11-25",
      endDate: "2026-11-25",
      leaveType: "personal_leave",
      leaveDayPeriod: "morning",
    });
    assert.equal(morningWork.totalWorkingDays, 0.5);

    const holidayMorning = calculateLeavePeriodDetails({
      startDate: "2026-04-06", // วันจักรี 2026 (Monday)
      endDate: "2026-04-06",
      leaveType: "sick_leave",
      leaveDayPeriod: "morning",
    });
    assert.equal(holidayMorning.totalWorkingDays, 0);
    assert.equal(holidayMorning.skippedHolidays.length, 1);
  });

  it("should count maternity leave in continuous calendar days including weekends & holidays", () => {
    const maternity = calculateLeavePeriodDetails({
      startDate: "2026-04-10",
      endDate: "2026-04-17",
      leaveType: "maternity_leave",
    });

    assert.equal(maternity.isCalendarCount, true);
    assert.equal(maternity.allCalendarDays, 8);
    assert.equal(maternity.totalWorkingDays, 8);
  });

  it("should detect overlapping leaves accurately and allow morning + afternoon split on same day", () => {
    const existing = [
      makeMockLeave({
        id: "approved-full",
        startDate: "2026-11-25",
        endDate: "2026-11-26",
        leaveDayPeriod: "full",
        status: "approved",
      }),
      makeMockLeave({
        id: "approved-morning-only",
        startDate: "2026-12-01",
        endDate: "2026-12-01",
        leaveDayPeriod: "morning",
        totalWorkingDays: 0.5,
        status: "approved",
      }),
      makeMockLeave({
        id: "cancelled-leave",
        startDate: "2026-12-15",
        endDate: "2026-12-16",
        status: "cancelled",
      }),
      makeMockLeave({
        id: "cancel-form",
        leaveType: "cancel_leave",
        startDate: "2026-11-25",
        endDate: "2026-11-25",
        status: "pending_supervisor",
      }),
    ];

    // Full overlap against active leave -> blocked
    const fullOverlap = detectLeaveOverlap({
      candidateStart: "2026-11-26",
      candidateEnd: "2026-11-27",
      candidatePeriod: "full",
      existingRequests: existing,
    });
    assert.equal(fullOverlap.hasOverlap, true);
    assert.equal(fullOverlap.conflicts[0].id, "approved-full");

    // Same-day morning + afternoon -> allowed
    const splitAllowed = detectLeaveOverlap({
      candidateStart: "2026-12-01",
      candidateEnd: "2026-12-01",
      candidatePeriod: "afternoon",
      existingRequests: existing,
    });
    assert.equal(splitAllowed.hasOverlap, false);

    // Same-day morning + morning -> blocked
    const sameHalfBlocked = detectLeaveOverlap({
      candidateStart: "2026-12-01",
      candidateEnd: "2026-12-01",
      candidatePeriod: "morning",
      existingRequests: existing,
    });
    assert.equal(sameHalfBlocked.hasOverlap, true);

    // Cancelled leave -> allowed
    const againstCancelled = detectLeaveOverlap({
      candidateStart: "2026-12-15",
      candidateEnd: "2026-12-15",
      candidatePeriod: "full",
      existingRequests: existing,
    });
    assert.equal(againstCancelled.hasOverlap, false);
  });

  it("should subtract cancelled days and slice 6-month evaluation boundary accurately", () => {
    const partialCancelled = makeMockLeave({
      startDate: "2026-03-30", // Mon
      endDate: "2026-04-02", // Thu -> 4 working days across 31 Mar / 1 Apr boundary
      totalWorkingDays: 4,
      cancelledDays: 1,
    });

    assert.equal(getEffectiveLeaveDays(partialCancelled), 3);

    // Oct 1 .. Mar 31 half-year period covers 2026-03-30 and 2026-03-31 (2 days)
    const inH1 = countWorkingDaysInRange(partialCancelled, "2025-10-01", "2026-03-31");
    assert.equal(inH1, 2);

    // Apr 1 .. Sep 30 half-year period covers 2026-04-01 and 2026-04-02 (capped at effective=3 -> 2 days)
    const inH2 = countWorkingDaysInRange(partialCancelled, "2026-04-01", "2026-09-30");
    assert.equal(inH2, 2);
  });

  it("should resolve NAS file paths vs HTTP URLs in resolveLeaveAttachmentUrl", () => {
    assert.equal(
      resolveLeaveAttachmentUrl("/SmartMSO/leave/cert.pdf"),
      "/api/nas/download?path=%2FSmartMSO%2Fleave%2Fcert.pdf&mode=open"
    );
    assert.equal(
      resolveLeaveAttachmentUrl("https://cdn.example.com/cert.pdf"),
      "https://cdn.example.com/cert.pdf"
    );
    assert.equal(resolveLeaveAttachmentUrl("  "), null);
  });
});

describe("Vacation Leave Word DOCX Template Alignment", async () => {
  const JSZip = (await import("jszip")).default;
  const { buildLeaveDocumentXml, buildLeaveDocxUint8Array } = await import(
    "../lib/leave-docx-export.ts"
  );

  const templateSampleLeave = makeMockLeave({
    id: "vac-sample-1",
    requestNo: "LEAVE-2570-009",
    leaveType: "vacation_leave",
    leaveDayPeriod: "full",
    writtenAt: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    writtenDate: "2026-11-23",
    subject: "ขอลาพักผ่อน",
    toRecipient: "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    applicantUserId: "syno_ธนวัฒน์",
    applicantName: "นายธนวัฒน์ แกมขุนทด",
    applicantPosition: "นักพัฒนาสังคม",
    applicantDivision: "กลุ่มนโยบายและวิชาการ",
    startDate: "2026-11-30",
    endDate: "2026-12-01",
    totalWorkingDays: 2,
    contactInfo: "100/1 ม.13 ต.คลองลานพัฒนา อ.คลองลาน จ.กำแพงเพชร",
    contactPhone: "0888968819",
    vacationAccumulatedDays: 5,
    vacationAnnualDays: 10,
    prevVacationDays: 0,
    actingPersonName: "นางสาวขวัญนภา ศิริสมบัติ",
    verifierName: "นายยุทธนา เจนจบ",
    verifierPosition: "เจ้าพนักงานธุรการปฏิบัติงาน",
    verifiedAt: "2026-11-23T09:00:00Z",
    supervisorName: "นายวรวุฒิ พึ่งพัก",
    supervisorPosition: "นักพัฒนาสังคมชำนาญการพิเศษ",
    supervisorComment: null,
    supervisorReviewedAt: null,
    approverName: "นางสาวมะลิวัน สิทธิโยธี",
    approverPosition: "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    orderDecision: null,
    orderedAt: null,
  });

  it("should match uploaded ใบลาพักผ่อน typography, indents, table grid, and bold labels", () => {
    const xml = buildLeaveDocumentXml(templateSampleLeave);

    // Title size 36, body size 32
    assert.match(xml, /<w:sz w:val="36"\/>.*?ใบลาพักผ่อน/s);
    assert.match(xml, /<w:sz w:val="32"\/>/);

    // WrittenAt shortened & indents matching user's template
    assert.ok(xml.includes("สนง.พมจ.กำแพงเพชร"));
    assert.ok(xml.includes('w:left="5540" w:firstLine="220"'));
    assert.ok(xml.includes('w:left="5100" w:firstLine="660"'));

    // Key bold labels present
    for (const boldLabel of [
      "เขียนที่",
      "ข้าพเจ้า",
      "ตำแหน่ง",
      "กลุ่ม/ฝ่าย",
      "สังกัด",
      "มีวันลาพักผ่อนสะสม",
      "ขอลาพักผ่อนตั้งแต่วันที่",
      "มีกำหนด",
      "ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่",
      "(ลงชื่อ)",
      "ผู้ตรวจสอบ",
      "ผู้มอบ",
      "ผู้ปฏิบัติหน้าที่แทน",
      "ความเห็นผู้บังคับบัญชา",
      "คำสั่ง   ",
    ]) {
      assert.ok(
        xml.includes(`<w:b/><w:bCs/><w:color w:val="000000"/></w:rPr><w:t`) ||
          xml.includes(boldLabel),
        `Expected XML to contain ${boldLabel}`
      );
      const escapedLabel = boldLabel.trim();
      const boldPattern = new RegExp(
        `<w:b\\/><w:bCs\\/>(?:(?!<\\/w:rPr>).)*<\\/w:rPr><w:t[^>]*>[^<]*${escapedLabel.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )}`
      );
      assert.match(xml, boldPattern, `Expected "${boldLabel}" run to be bolded`);
    }

    // Explicit line breaks (<w:br/>) before มีกำหนด and inside approver long position
    assert.match(xml, /<w:br\/>.*?มีกำหนด/s);
    assert.match(xml, /พัฒนาสังคมและความมั่นคงของมนุษย์.*?<w:br\/>.*?จังหวัดกำแพงเพชร/s);

    // Outer table (9582 -> 4712 / 363 / 4507) and stats table (4485 -> 1495 x 3)
    assert.ok(xml.includes('<w:tblW w:w="9582" w:type="dxa"/>'));
    assert.ok(
      xml.includes(
        '<w:tblGrid><w:gridCol w:w="4712"/><w:gridCol w:w="363"/><w:gridCol w:w="4507"/></w:tblGrid>'
      )
    );
    assert.ok(xml.includes('<w:tblW w:w="4485" w:type="dxa"/>'));
    assert.ok(
      xml.includes(
        '<w:tblGrid><w:gridCol w:w="1495"/><w:gridCol w:w="1495"/><w:gridCol w:w="1495"/></w:tblGrid>'
      )
    );

    // Fix duplicate นาย/นาง/นางสาว before นางสาวขวัญนภา ศิริสมบัติ
    assert.ok(!xml.includes("นาย/นาง/นางสาว นางสาวขวัญนภา"));
    assert.ok(xml.includes("นางสาวขวัญนภา ศิริสมบัติ ปฏิบัติหน้าที่แทน"));

    // Verifier signature line must NOT contain typed นายยุทธนา เจนจบ even when verifiedAt is set
    const verifierLineMatch = xml.match(
      /<w:t[^>]*>\(ลงชื่อ\)<\/w:t>.*?<w:t[^>]*>ผู้ตรวจสอบ<\/w:t>/s
    );
    assert.ok(verifierLineMatch, "Expected verifier signature line paragraph");
    assert.ok(!verifierLineMatch[0].includes("นายยุทธนา เจนจบ"));
  });

  it("should generate a valid .docx ZIP archive containing document.xml and 16pt styles.xml", async () => {
    const bytes = await buildLeaveDocxUint8Array(templateSampleLeave);
    assert.ok(bytes instanceof Uint8Array);
    assert.ok(bytes.byteLength > 500);

    const zip = await JSZip.loadAsync(bytes);
    const docXml = await zip.file("word/document.xml")?.async("string");
    const stylesXml = await zip.file("word/styles.xml")?.async("string");

    assert.ok(docXml && docXml.includes("ใบลาพักผ่อน"));
    assert.ok(docXml && docXml.includes("นายธนวัฒน์ แกมขุนทด"));
    assert.ok(stylesXml && stylesXml.includes('<w:sz w:val="32"/>'));
    assert.ok(stylesXml && stylesXml.includes('<w:lang w:val="th-TH"'));
  });

  it("should enforce sole legal approver (นางสาวมะลิวัน) and proxy operator (นายยุทธนา)", async () => {
    const {
      SOLE_LEAVE_APPROVER,
      DEFAULT_LEAVE_ORDER_OPERATOR,
      LEAVE_STATUS_META,
    } = await import("../lib/leave-utils.ts");

    assert.equal(
      LEAVE_STATUS_META.pending_supervisor.label,
      "รอหัวหน้ากลุ่ม/ฝ่ายลงความเห็น"
    );
    assert.equal(
      LEAVE_STATUS_META.pending_approver.label,
      "รอเสนอแฟ้ม พมจ. / ปรับสถานะ"
    );

    assert.deepEqual(SOLE_LEAVE_APPROVER, {
      userId: "syno_มะลิวัน",
      name: "นางสาวมะลิวัน สิทธิโยธี",
      position: "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    });
    assert.deepEqual(DEFAULT_LEAVE_ORDER_OPERATOR, {
      userId: "syno_ยุทธนา",
      name: "นายยุทธนา เจนจบ",
      position: "เจ้าพนักงานธุรการปฏิบัติงาน",
    });

    const proxyRecordedLeave = makeMockLeave({
      ...templateSampleLeave,
      status: "approved",
      orderDecision: "approved",
      orderedAt: "2026-11-23T10:00:00Z",
      approverUserId: SOLE_LEAVE_APPROVER.userId,
      approverName: SOLE_LEAVE_APPROVER.name,
      approverPosition: SOLE_LEAVE_APPROVER.position,
      approverSignature: null,
      syncNote: `ซิงก์ลงรายงานลงเวลาแล้ว 2 วันทำการ (บันทึกคำสั่งในระบบแทนโดย ${DEFAULT_LEAVE_ORDER_OPERATOR.name})`,
    });

    const xml = buildLeaveDocumentXml(proxyRecordedLeave);
    assert.ok(xml.includes(SOLE_LEAVE_APPROVER.name));
    assert.ok(!xml.includes("บันทึกคำสั่งในระบบแทนโดย"));
  });
});

describe("Individual Leave Control Register (ทะเบียนคุมวันลารายบุคคล)", async () => {
  const JSZip = (await import("jszip")).default;
  const { buildLeaveRegisterData, buildLeaveRegisterXlsxUint8Array } = await import(
    "../lib/leave-register.ts"
  );

  it("should compute chronological counts, running totals, and remaining vacation balance accurately", () => {
    const member = {
      userId: "syno_ธนวัฒน์",
      name: "นายธนวัฒน์ แกมขุนทด",
      position: "นักพัฒนาสังคม",
      division: "กลุ่มนโยบายและวิชาการ",
    };

    const balance = {
      userId: "syno_ธนวัฒน์",
      fiscalYear: 2570,
      sickDaysCarried: 1,
      personalDaysCarried: 0,
      maternityDaysCarried: 0,
      vacationAccumulatedDays: 5,
      vacationAnnualDays: 10,
      vacationDaysCarried: 0,
    };

    const requests = [
      // Deliberately out of chronological order to verify sorting
      makeMockLeave({
        id: "r-vac-1",
        requestNo: "LV-2570-003",
        applicantUserId: "syno_ธนวัฒน์",
        leaveType: "vacation_leave",
        startDate: "2026-11-30",
        endDate: "2026-12-01",
        totalWorkingDays: 2,
        status: "approved",
      }),
      makeMockLeave({
        id: "r-sick-1",
        requestNo: "LV-2570-001",
        applicantUserId: "syno_ธนวัฒน์",
        leaveType: "sick_leave",
        leaveDayPeriod: "morning",
        startDate: "2026-10-15",
        endDate: "2026-10-15",
        totalWorkingDays: 0.5,
        status: "approved",
      }),
      makeMockLeave({
        id: "r-per-1",
        requestNo: "LV-2570-002",
        applicantUserId: "syno_ธนวัฒน์",
        leaveType: "personal_leave",
        startDate: "2026-11-05",
        endDate: "2026-11-06",
        totalWorkingDays: 2,
        cancelledDays: 1,
        status: "approved",
      }),
      // Pending leave must be excluded from official register
      makeMockLeave({
        id: "r-pending",
        requestNo: "LV-2570-004",
        applicantUserId: "syno_ธนวัฒน์",
        leaveType: "vacation_leave",
        startDate: "2026-12-15",
        endDate: "2026-12-16",
        totalWorkingDays: 2,
        status: "pending_approver",
      }),
    ];

    const reg = buildLeaveRegisterData({
      member,
      fiscalYear: 2570,
      requests,
      balance,
    });

    assert.equal(reg.openingNote, "สะสม 5 ประจำปี 10");
    assert.equal(reg.vacationEntitledDays, 15);
    assert.equal(reg.rows.length, 3);

    // Row 1: sick leave 0.5 day + carried 1 = total 1.5
    assert.equal(reg.rows[0].sickCount, 1);
    assert.equal(reg.rows[0].sickDays, 0.5);
    assert.equal(reg.rows[0].sickTotal, 1.5);
    assert.ok(reg.rows[0].note.includes("ครึ่งเช้า"));

    // Row 2: personal leave 2 - 1 cancelled = 1 day
    assert.equal(reg.rows[1].personalCount, 1);
    assert.equal(reg.rows[1].personalDays, 1);
    assert.equal(reg.rows[1].personalTotal, 1);
    assert.ok(reg.rows[1].note.includes("ยกเลิกบางส่วน -1 วัน"));

    // Row 3: vacation leave 2 days -> remaining 15 - 2 = 13
    assert.equal(reg.rows[2].vacationCount, 1);
    assert.equal(reg.rows[2].vacationDays, 2);
    assert.equal(reg.rows[2].vacationTotal, 2);
    assert.equal(reg.rows[2].vacationRemaining, 13);

    assert.equal(reg.summary.sickTotal, 1.5);
    assert.equal(reg.summary.personalTotal, 1);
    assert.equal(reg.summary.vacationTotal, 2);
    assert.equal(reg.summary.vacationRemaining, 13);
  });

  it("should export a valid Excel (.xlsx) workbook matching the 12-column A1:L merged register template", async () => {
    const reg = buildLeaveRegisterData({
      member: {
        userId: "syno_ธนวัฒน์",
        name: "นายธนวัฒน์ แกมขุนทด",
        position: "นักพัฒนาสังคม",
      },
      fiscalYear: 2570,
      requests: [
        makeMockLeave({
          id: "r-vac-xlsx",
          requestNo: "LV-2570-009",
          applicantUserId: "syno_ธนวัฒน์",
          leaveType: "vacation_leave",
          startDate: "2026-11-30",
          endDate: "2026-12-01",
          totalWorkingDays: 2,
          status: "approved",
        }),
      ],
      balance: {
        userId: "syno_ธนวัฒน์",
        fiscalYear: 2570,
        sickDaysCarried: 0,
        personalDaysCarried: 0,
        maternityDaysCarried: 0,
        vacationAccumulatedDays: 5,
        vacationAnnualDays: 10,
        vacationDaysCarried: 0,
      },
    });

    const bytes = await buildLeaveRegisterXlsxUint8Array(reg);
    assert.ok(bytes instanceof Uint8Array);
    assert.ok(bytes.byteLength > 500);

    const zip = await JSZip.loadAsync(bytes);
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
    assert.ok(sheetXml);
    assert.ok(
      sheetXml.includes("สถิติวันลาของข้าราชการ/พนักงานราชการ/พนักงานกองทุน")
    );
    assert.ok(sheetXml.includes("นายธนวัฒน์ แกมขุนทด"));
    assert.ok(sheetXml.includes("สะสม 5 ประจำปี 10"));
    assert.ok(sheetXml.includes('<mergeCell ref="B5:D5"/>'));
    assert.ok(sheetXml.includes('<mergeCell ref="H5:K5"/>'));
    assert.ok(sheetXml.includes('<mergeCell ref="L5:L6"/>'));
  });
});

describe("Last Leave History Calculation & Validation (ประวัติการลาครั้งสุดท้าย)", async () => {
  const { normalizeAndValidateLastLeave, findLatestApprovedGeneralLeave } =
    await import("../lib/leave-utils.ts");

  it("should return all nulls when last leave fields are blank (never storing 0.0)", () => {
    const res = normalizeAndValidateLastLeave({
      lastLeaveType: "",
      lastLeaveStartDate: "",
      lastLeaveEndDate: "",
      lastLeaveDays: "0",
    });
    assert.equal(res.error, null);
    assert.equal(res.lastLeaveType, null);
    assert.equal(res.lastLeaveStartDate, null);
    assert.equal(res.lastLeaveEndDate, null);
    assert.equal(res.lastLeaveDays, null);
  });

  it("should auto-calculate 1 working day for 2026-10-30..2026-10-30, allow 0.5, and reject 2 days", () => {
    const autoCalc = normalizeAndValidateLastLeave({
      lastLeaveType: "sick_leave",
      lastLeaveStartDate: "2026-10-30",
      lastLeaveEndDate: "2026-10-30",
      lastLeaveDays: "",
    });
    assert.equal(autoCalc.error, null);
    assert.equal(autoCalc.lastLeaveDays, 1);
    assert.equal(autoCalc.calculatedDays, 1);

    const halfDay = normalizeAndValidateLastLeave({
      lastLeaveType: "sick_leave",
      lastLeaveStartDate: "2026-10-30",
      lastLeaveEndDate: "2026-10-30",
      lastLeaveDays: "0.5",
    });
    assert.equal(halfDay.error, null);
    assert.equal(halfDay.lastLeaveDays, 0.5);

    const overDays = normalizeAndValidateLastLeave({
      lastLeaveType: "sick_leave",
      lastLeaveStartDate: "2026-10-30",
      lastLeaveEndDate: "2026-10-30",
      lastLeaveDays: "2",
    });
    assert.ok(overDays.error && overDays.error.includes("มากกว่าจำนวนวันทำการจริง"));
  });

  it("should exclude weekends/holidays for sick/personal last leave and count calendar days for maternity", () => {
    // Songkran range 2026-04-10..2026-04-17: 3 working days for sick/personal, 8 calendar days for maternity
    const personal = normalizeAndValidateLastLeave({
      lastLeaveType: "personal_leave",
      lastLeaveStartDate: "2026-04-10",
      lastLeaveEndDate: "2026-04-17",
      lastLeaveDays: "",
    });
    assert.equal(personal.error, null);
    assert.equal(personal.lastLeaveDays, 3);

    const maternity = normalizeAndValidateLastLeave({
      lastLeaveType: "maternity_leave",
      lastLeaveStartDate: "2026-04-10",
      lastLeaveEndDate: "2026-04-17",
      lastLeaveDays: "",
    });
    assert.equal(maternity.error, null);
    assert.equal(maternity.lastLeaveDays, 8);
  });

  it("should reject endDate < startDate, incomplete date pair, and holiday-only ranges", () => {
    const reversed = normalizeAndValidateLastLeave({
      lastLeaveType: "sick_leave",
      lastLeaveStartDate: "2026-11-10",
      lastLeaveEndDate: "2026-11-05",
      lastLeaveDays: "1",
    });
    assert.ok(reversed.error);

    const incomplete = normalizeAndValidateLastLeave({
      lastLeaveType: "sick_leave",
      lastLeaveStartDate: "2026-11-10",
      lastLeaveEndDate: "",
      lastLeaveDays: "1",
    });
    assert.ok(incomplete.error);

    const holidayOnly = normalizeAndValidateLastLeave({
      lastLeaveType: "sick_leave",
      lastLeaveStartDate: "2026-04-13",
      lastLeaveEndDate: "2026-04-15",
      lastLeaveDays: "",
    });
    assert.ok(holidayOnly.error);
  });

  it("should pick the latest approved general leave by calendar endDate/startDate rather than createdAt", () => {
    const olderLeaveCreatedLater = makeMockLeave({
      id: "older-date-newer-created",
      leaveType: "sick_leave",
      startDate: "2026-10-10",
      endDate: "2026-10-10",
      totalWorkingDays: 1,
      status: "approved",
      createdAt: "2026-11-20T09:00:00Z",
    });
    const newerLeaveCreatedEarlier = makeMockLeave({
      id: "newer-date-older-created",
      leaveType: "personal_leave",
      startDate: "2026-11-15",
      endDate: "2026-11-16",
      totalWorkingDays: 2,
      status: "approved",
      createdAt: "2026-11-01T09:00:00Z",
    });

    const latest = findLatestApprovedGeneralLeave([
      olderLeaveCreatedLater,
      newerLeaveCreatedEarlier,
    ]);
    assert.equal(latest?.id, "newer-date-older-created");
  });
});
