import { test, expect } from "./fixtures";

test.describe("ระบบจัดการข้อมูลลงเวลาปฏิบัติราชการ (Attendance Live Sync & Dynamic Counts)", () => {
  test("1. GET /api/attendance?checkHardware=1 ต้องคืนค่ายอดจริงจากเครื่องสแกนและซิงก์ล่าสุดครบถ้วน", async ({
    request,
  }) => {
    const res = await request.get("/api/attendance?page=1&pageSize=20&checkHardware=1");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.canSyncFromScanner).toBe(true);
    expect(data.isCloudServer).toBe(false);
    expect(data.deviceTotalRecords).toBeGreaterThan(30061);
    expect(data.totalStoredLogs).toBeGreaterThanOrEqual(30366);
    expect(data.lastSyncedAt).toBeTruthy();
    expect(data.latestScanTimestamp).toBeTruthy();
    expect(data.deviceOverview?.serialNumber).toBeTruthy();
    expect(data.deviceOverview?.registeredUsersCount).toBeGreaterThan(0);

    // ตรวจสอบสถิติ 4 ช่วงเวลาและ availableMonths
    expect(typeof data.summaryStats?.checkInOnTime).toBe("number");
    expect(typeof data.summaryStats?.lateOrLeave).toBe("number");
    expect(typeof data.summaryStats?.midDay).toBe("number");
    expect(typeof data.summaryStats?.checkOut).toBe("number");
    expect(
      data.summaryStats.checkInOnTime +
        data.summaryStats.lateOrLeave +
        data.summaryStats.midDay +
        data.summaryStats.checkOut
    ).toBe(data.filteredTotal);
    expect(Array.isArray(data.availableMonths)).toBe(true);
    expect(data.availableMonths).toContain("2026-11");
    expect(data.availableMonths).toContain("2026-10");

    // ตรวจสอบการกรองประเภท ioMode=2 (ออกราชการ 16:30+)
    const checkOutRes = await request.get("/api/attendance?page=1&pageSize=10&ioMode=2");
    expect(checkOutRes.ok()).toBeTruthy();
    const checkOutData = await checkOutRes.json();
    expect(checkOutData.success).toBe(true);
    expect(checkOutData.filteredTotal).toBeGreaterThan(15000);
    expect(checkOutData.logs.length).toBeGreaterThan(0);
    for (const item of checkOutData.logs) {
      expect(item.ioMode).toBe(2);
      expect(item.ioLabel).toBe("ออกราชการ (Check-Out)");
      const timePart = String(item.scanTimestamp).split(" ")[1] || "";
      expect(timePart >= "16:30:00").toBe(true);
    }
  });

  test("2. หน้า /attendance แสดงยอดเครื่องสแกนจริง 4 ประเภทเวลา และปฏิทินปีงบประมาณไทยครบถ้วน", async ({
    page,
  }) => {
    await page.goto("/attendance", { waitUntil: "domcontentloaded" });

    await expect(
      page.locator("h1:has-text('ระบบจัดการข้อมูลลงเวลาปฏิบัติราชการ')")
    ).toBeVisible({ timeout: 15000 });

    const syncButton = page.locator("button:has-text('ซิงก์ข้อมูลจาก')").first();
    await expect(syncButton).toBeVisible();
    await expect(syncButton).toBeEnabled({ timeout: 15000 });

    // ตรวจสอบว่าไม่มียอด 30,061 ค้างอยู่บนการ์ดเครื่องสแกน
    const scannerCard = page.locator("div:has(> div > span:has-text('เครื่องสแกนลายนิ้วมือ'))").first();
    await expect(scannerCard).toBeVisible();
    await expect(scannerCard).not.toContainText("30,061 รายการ");
    await expect(scannerCard).toContainText(/30,3\d{2}|30,[4-9]\d{2}|[3-9]\d,\d{3}/);
    await expect(scannerCard).toContainText("สแกนล่าสุดในฐานข้อมูล:");

    // ตรวจสอบการ์ดสถิติ 4 ประเภทตามระเบียบเวลาราชการ
    const statsCard = page.locator("div:has(> div > span:has-text('สถิติรายการตามตัวกรอง'))").first();
    await expect(statsCard).toContainText("เข้าเช้าปกติ");
    await expect(statsCard).toContainText("สาย / อาจลา");
    await expect(statsCard).toContainText("ออกราชการ");
    await expect(statsCard).toContainText("แก้ไขแล้ว");

    // ตรวจสอบตารางแสดงป้ายปีงบประมาณและเดือน พ.ศ.
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 15000 });
    await expect(firstRow).toContainText(/ปีงบ 25\d{2}/);

    // ตรวจสอบ Dropdown ปีงบประมาณและเดือนตามปฏิทินปีงบประมาณ
    const fySelect = page.getByLabel("ปีงบประมาณ", { exact: true });
    await expect(fySelect).toContainText("ปีงบ 2570");
    await expect(fySelect).toContainText("ปีงบ 2569");

    const monthSelect = page.getByLabel("เดือน (ปฏิทินปีงบประมาณ)");
    await expect(monthSelect).toContainText("พ.ย. 2569");

    // เลือกเดือน พ.ย. 2569 (2026-11) แล้วตรวจการกรอง
    await monthSelect.selectOption("2026-11");
    await expect(page.locator("text=พฤศจิกายน 2569 (ปีงบประมาณ 2570 • ไตรมาส 1)")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("tbody tr").first()).toContainText("พ.ย. 2569");
  });

  test("3. จำลองโหมด Cloud Server (Vercel) ต้องแสดงยอด Telemetry ล่าสุด ตัวเลือกปีงบประมาณ และปิดปุ่มซิงก์เครื่อง LAN อย่างถูกต้อง", async ({
    page,
  }) => {
    await page.route("**/api/attendance*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          dataSource: "supabase",
          isCloudServer: true,
          canSyncFromScanner: false,
          page: 1,
          pageSize: 200,
          totalPages: 153,
          mysqlConfig: {
            connectionMode: "direct_tcp",
            host: "192.168.162.23",
            port: 3308,
            user: "smartmso",
            password: "••••••••",
            database: "smart_mso_attendance",
            scannerIp: "192.168.162.15",
            scannerPort: 5005,
            scannerPassword: 0,
          },
          mysqlStatus: {
            connected: false,
            host: "192.168.162.23",
            port: 3308,
            database: "smart_mso_attendance",
            user: "smartmso",
            errorCode: "CLOUD_LAN_UNREACHABLE",
          },
          supabaseStatus: { ready: true, count: 30420 },
          deviceOverview: {
            serialNumber: "6812112298",
            registeredUsersCount: 64,
            fingerprintsCount: 40,
            attendanceLogsCount: 30420,
          },
          lastSyncedAt: "2026-11-12T07:05:00.000Z",
          lastMysqlSyncedAt: "2026-11-12T07:05:00.000Z",
          latestScanTimestamp: "2026-11-12 13:55:00",
          deviceTotalRecords: 30420,
          totalStoredLogs: 30420,
          availableDates: ["2026-11-12"],
          availableMonths: ["2026-11", "2026-10", "2026-09"],
          mappings: {},
          authorizedEditors: [],
          summaryStats: {
            checkInOnTime: 14750,
            lateOrLeave: 350,
            midDay: 45,
            checkOut: 15275,
            checkInTotal: 15100,
            edited: 0,
            checkIn: 15100,
            lateCount: 350,
            lateCountIsApprox: false,
          },
          logs: [],
          filteredTotal: 30420,
        }),
      });
    });

    await page.goto("/attendance", { waitUntil: "domcontentloaded" });

    const scannerCard = page.locator("div:has(> div > span:has-text('เครื่องสแกนลายนิ้วมือ'))").first();
    await expect(scannerCard).toContainText("30,420 รายการ", { timeout: 10000 });
    await expect(scannerCard).toContainText("ยอดในเครื่อง (ณ เวลาซิงก์ล่าสุด):");
    await expect(scannerCard).toContainText("2026-11-12 13:55:00");

    const fySelect = page.getByLabel("ปีงบประมาณ", { exact: true });
    await expect(fySelect).toContainText("ปีงบ 2570");
    await expect(fySelect).toContainText("ปีงบ 2569");

    const monthSelect = page.getByLabel("เดือน (ปฏิทินปีงบประมาณ)");
    await expect(monthSelect).toContainText("พ.ย. 2569 (เดือน 2/12 • ปีงบ 2570)");

    const syncButton = page.locator("button:has-text('ซิงก์ข้อมูลจาก')").first();
    await expect(syncButton).toBeDisabled();
  });
});

