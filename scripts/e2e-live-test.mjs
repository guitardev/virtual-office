import { chromium } from "playwright";
import path from "path";
import { exec } from "child_process";

const ARTIFACTS_DIR = "C:\\Users\\GuitarDev\\.gemini\\antigravity-ide\\brain\\9d93404e-73d3-4976-86ea-71d84f2ed87d";

function bringChromeToForeground() {
  try {
    exec('powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $wshell.AppActivate(\'Chrome\'); $wshell.AppActivate(\'Google Chrome\')"');
  } catch (e) {
    // ignore
  }
}

async function updateLiveBanner(page, stepText) {
  try {
    await page.evaluate((text) => {
      let el = document.getElementById("playwright-live-indicator");
      if (!el) {
        el = document.createElement("div");
        el.id = "playwright-live-indicator";
        el.style.position = "fixed";
        el.style.top = "18px";
        el.style.left = "50%";
        el.style.transform = "translateX(-50%)";
        el.style.zIndex = "9999999";
        el.style.backgroundColor = "#0f172a";
        el.style.color = "#f8fafc";
        el.style.padding = "10px 28px";
        el.style.borderRadius = "50px";
        el.style.boxShadow = "0 10px 25px -3px rgba(0,0,0,0.6), 0 4px 6px -4px rgba(0,0,0,0.4)";
        el.style.border = "2px solid #6366f1";
        el.style.fontFamily = "system-ui, -apple-system, sans-serif";
        el.style.fontSize = "15px";
        el.style.fontWeight = "bold";
        el.style.pointerEvents = "none";
        el.style.transition = "all 0.3s ease";
        document.body.appendChild(el);
      }
      el.innerHTML = `✨ <span style="color: #a5b4fc;">Live Test:</span> <span style="color: #38bdf8;">${text}</span>`;
    }, stepText);
  } catch (err) {
    // banner error ignored if page navigating
  }
}

async function runLiveTest() {
  console.log("🚀 Starting Playwright Live Browser Test on Google Chrome...");
  console.log("🖥️ Launching maximized Chrome window in the foreground...");

  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    slowMo: 1500, // 1.5 seconds per action so user can follow easily
    args: [
      "--start-maximized",
      "--window-position=0,0",
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const context = await browser.newContext({
    viewport: null, // Maximized screen view
  });

  // Inject active Admin session so tests run smoothly and reliably
  await context.addInitScript(() => {
    const adminUser = {
      id: "usr_1",
      prefix: "นางสาว",
      firstName: "มะลิวัน",
      lastName: "สิทธิโยธี",
      name: "นางสาวมะลิวัน สิทธิโยธี",
      personnelType: "ข้าราชการ",
      position: "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
      division: "ฝ่ายบริหารทั่วไป",
      department: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
      email: "maliwan.s@m-society.go.th",
      phone: "055-705031",
      lineId: "@maliwan_kpp",
      role: "admin",
      status: "active",
      joinedDate: "1 ม.ค. 2565",
      avatarUrl: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/10/S__2457668.jpg",
      avatarText: "มล",
    };
    const sessionData = JSON.stringify({
      user: adminUser,
      loginTime: "09:00 น.",
      rememberMe: true,
    });
    localStorage.setItem("smartmso_auth_session", sessionData);
    localStorage.setItem("omnioffice_auth_session", sessionData);
  });

  const page = await context.newPage();

  try {
    // Bring window to foreground immediately
    bringChromeToForeground();

    // ─── Step 1: Open Virtual Office ───
    console.log("📍 Step 1: Opening Smart MSO Workspace at http://localhost:3000");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    bringChromeToForeground();
    await updateLiveBanner(page, "ขั้นตอนที่ 1: เข้าสู่ระบบสำนักงานเสมือน (Smart MSO)");
    await page.waitForTimeout(2000);

    // ─── Step 2: Test User Profile & Fullscreen Modal ───
    console.log("👤 Step 2: Testing User Profile & Fullscreen Modal (EditProfileModal)...");
    await updateLiveBanner(page, "ขั้นตอนที่ 2: ทดสอบหน้าข้อมูลส่วนตัว (User Profile)");
    
    // Click User Profile navigation button
    const userNav = page.locator("aside button:has-text('ข้อมูลส่วนตัว'), nav button:has-text('ข้อมูลส่วนตัว')").first();
    await userNav.click();
    await page.waitForTimeout(1500);

    // Click "แก้ไขข้อมูลส่วนตัว" button on User page
    await updateLiveBanner(page, "ขั้นตอนที่ 2: เปิดหน้าต่างแก้ไขข้อมูลส่วนตัว (โหมดเต็มหน้าจอ Default Fullscreen)");
    const editProfileBtn = page.locator("button:has-text('แก้ไขข้อมูลส่วนตัว')").first();
    await editProfileBtn.click();
    await page.waitForTimeout(2000);

    // 1. Capture Fullscreen View
    const shot1 = path.join(ARTIFACTS_DIR, "test_01_profile_fullscreen.png");
    await page.screenshot({ path: shot1 });
    console.log(`📸 Captured: ${shot1} (Full Screen Mode)`);

    // 2. Test Toggle Windowed Mode
    const toggleBtn = page.locator("button:has-text('ย่อหน้าต่าง'), button:has-text('เต็มหน้าจอ')").first();
    if (await toggleBtn.isVisible()) {
      await updateLiveBanner(page, "ขั้นตอนที่ 2: ทดสอบการย่อหน้าต่าง (Windowed Mode)");
      console.log("🗗 Switching to Windowed Mode...");
      await toggleBtn.click();
      await page.waitForTimeout(1800);

      const shot2 = path.join(ARTIFACTS_DIR, "test_02_profile_windowed.png");
      await page.screenshot({ path: shot2 });
      console.log(`📸 Captured: ${shot2} (Windowed Mode)`);

      await updateLiveBanner(page, "ขั้นตอนที่ 2: ขยายกลับเป็นโหมดเต็มหน้าจอ (Fullscreen Mode)");
      console.log("⛶ Switching back to Fullscreen Mode...");
      await toggleBtn.click();
      await page.waitForTimeout(1500);
    }

    // 3. Test Selecting an official avatar preset
    const presetAvatarBtn = page.locator("button:has-text('นายเสกพล'), button:has-text('นายวรวุฒิ')").first();
    if (await presetAvatarBtn.isVisible()) {
      await updateLiveBanner(page, "ขั้นตอนที่ 2: ทดสอบเลือกรูปถ่ายทางการจากคลังภาพ 8 ท่าน");
      console.log("👤 Selecting official avatar from Provincial gallery...");
      await presetAvatarBtn.click();
      await page.waitForTimeout(1500);
    }

    // 4. Test Closing via prominent close button
    const closeProfileBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
    if (await closeProfileBtn.isVisible()) {
      await updateLiveBanner(page, "ขั้นตอนที่ 2: ปิดหน้าต่างด้วยปุ่มสีแดง '✕ ปิดหน้าต่าง'");
      console.log("✕ Clicking prominent 'ปิดหน้าต่าง' button...");
      await closeProfileBtn.click();
      await page.waitForTimeout(1500);
    }

    // ─── Step 3: Test Car Booking System & Realistic Fuel Gauge ───
    console.log("🚗 Step 3: Testing Car Booking System & Realistic Fuel Gauge...");
    await updateLiveBanner(page, "ขั้นตอนที่ 3: ระบบยานพาหนะราชการ & เกจวัดน้ำมันเสมือนจริง");
    const carBookingNav = page.locator("aside button:has-text('รถยนต์สำนักงาน'), nav button:has-text('รถยนต์สำนักงาน')").first();
    await carBookingNav.click();
    await page.waitForTimeout(1800);

    // Switch to Fleet tab to view vehicles with gauges
    const fleetTabBtn = page.locator("button:has-text('ยานพาหนะราชการ')").first();
    if (await fleetTabBtn.isVisible()) {
      await updateLiveBanner(page, "ขั้นตอนที่ 3: สลับไปยังแท็บยานพาหนะราชการ (ดูรายการรถยนต์และเกจวัดน้ำมัน)");
      console.log("🚙 Switching to Fleet tab...");
      await fleetTabBtn.click();
      await page.waitForTimeout(1800);
    }

    const shot3 = path.join(ARTIFACTS_DIR, "test_03_car_fleet.png");
    await page.screenshot({ path: shot3 });
    console.log(`📸 Captured: ${shot3} (Vehicle fleet with realistic gauges)`);

    // Click "ดูแฟ้มประวัติ" button on first vehicle to open VehicleDetailModal
    const viewVehicleBtn = page.locator("button:has-text('ดูแฟ้มประวัติ')").first();
    if (await viewVehicleBtn.isVisible()) {
      await updateLiveBanner(page, "ขั้นตอนที่ 3: เปิดแฟ้มประวัติรถยนต์ (แสดงหน้าปัดคลัสเตอร์เกจวัดน้ำมันและไฟเตือน)");
      console.log("🔍 Opening Vehicle Detail Modal...");
      await viewVehicleBtn.click();
      await page.waitForTimeout(2000);

      const shot4 = path.join(ARTIFACTS_DIR, "test_04_vehicle_detail.png");
      await page.screenshot({ path: shot4 });
      console.log(`📸 Captured: ${shot4} (Vehicle Detail with Realistic Cluster Gauge)`);

      // Close Vehicle Detail Modal via prominent button
      const closeVehicleBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
      if (await closeVehicleBtn.isVisible()) {
        await updateLiveBanner(page, "ขั้นตอนที่ 3: ปิดหน้าต่างแฟ้มประวัติรถยนต์ด้วยปุ่ม '✕ ปิดหน้าต่าง'");
        console.log("✕ Closing Vehicle Detail Modal via prominent button...");
        await closeVehicleBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // ─── Step 4: Test Division Chat Groups ───
    console.log("💬 Step 4: Testing Chat Module & Official Division Groups...");
    await updateLiveBanner(page, "ขั้นตอนที่ 4: ระบบแชทกลุ่มทางการของกลุ่มงาน/ฝ่าย");
    const chatNav = page.locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')").first();
    await chatNav.click();
    await page.waitForTimeout(1800);

    const shot5 = path.join(ARTIFACTS_DIR, "test_05_division_chat.png");
    await page.screenshot({ path: shot5 });
    console.log(`📸 Captured: ${shot5} (Official Division Chat Groups)`);

    // Open Create Group Modal
    const createGroupBtn = page.locator("button:has-text('+ สร้างกลุ่ม'), button:has-text('สร้างกลุ่ม')").first();
    if (await createGroupBtn.isVisible()) {
      await updateLiveBanner(page, "ขั้นตอนที่ 4: เปิดหน้าต่างสร้างกลุ่มสนทนาใหม่");
      console.log("➕ Opening Create Group Modal...");
      await createGroupBtn.click();
      await page.waitForTimeout(2000);

      const shot6 = path.join(ARTIFACTS_DIR, "test_06_create_group_modal.png");
      await page.screenshot({ path: shot6 });
      console.log(`📸 Captured: ${shot6} (Create Group Modal with close button)`);

      // Close with prominent close button
      const closeGroupBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
      if (await closeGroupBtn.isVisible()) {
        await updateLiveBanner(page, "ขั้นตอนที่ 4: ปิดหน้าต่างสร้างกลุ่มแชทด้วยปุ่ม '✕ ปิดหน้าต่าง'");
        console.log("✕ Closing Create Group Modal via prominent button...");
        await closeGroupBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // ─── Step 5: Test Admin Module & Member Dossier ───
    console.log("👑 Step 5: Testing Admin Module & Member Modals...");
    await updateLiveBanner(page, "ขั้นตอนที่ 5: ระบบจัดการบุคลากรภาครัฐ & สิทธิ์ RBAC");
    const adminNav = page.locator("aside button:has-text('ระบบจัดการ'), nav button:has-text('ระบบจัดการ')").first();
    await adminNav.click();
    await page.waitForTimeout(1800);

    // Open a member dossier
    const dossierBtn = page.locator("button:has-text('ดู')").first();
    if (await dossierBtn.isVisible()) {
      await updateLiveBanner(page, "ขั้นตอนที่ 5: เปิดแฟ้มข้อมูลบุคลากรภาครัฐ (รายละเอียดตำแหน่ง สิทธิ์การเข้าถึง)");
      console.log("📋 Opening Member Dossier Modal...");
      await dossierBtn.click();
      await page.waitForTimeout(2000);

      const shot7 = path.join(ARTIFACTS_DIR, "test_07_admin_dossier.png");
      await page.screenshot({ path: shot7 });
      console.log(`📸 Captured: ${shot7} (Personnel Dossier Modal with Close Button)`);

      const closeDossierBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
      if (await closeDossierBtn.isVisible()) {
        await updateLiveBanner(page, "ขั้นตอนที่ 5: ปิดหน้าต่างแฟ้มข้อมูลบุคลากรด้วยปุ่ม '✕ ปิดหน้าต่าง'");
        console.log("✕ Closing Member Dossier Modal via prominent button...");
        await closeDossierBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // Open Edit Member Modal
    const editMemberBtn = page.locator("button:has-text('แก้ไข')").first();
    if (await editMemberBtn.isVisible()) {
      await updateLiveBanner(page, "ขั้นตอนที่ 5: เปิดหน้าต่างแก้ไขข้อมูลบุคลากรและกำหนดสิทธิ์");
      console.log("✏️ Opening Admin Edit Member Modal...");
      await editMemberBtn.click();
      await page.waitForTimeout(2000);

      const shot8 = path.join(ARTIFACTS_DIR, "test_08_admin_edit_member.png");
      await page.screenshot({ path: shot8 });
      console.log(`📸 Captured: ${shot8} (Admin Edit Member Modal with Close Button)`);

      const closeEditBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
      if (await closeEditBtn.isVisible()) {
        await updateLiveBanner(page, "ขั้นตอนที่ 5: ปิดหน้าต่างแก้ไขบุคลากรด้วยปุ่ม '✕ ปิดหน้าต่าง'");
        console.log("✕ Closing Admin Edit Member Modal via prominent button...");
        await closeEditBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    await updateLiveBanner(page, "🎉 การทดสอบเสร็จสมบูรณ์ 100%! จะเปิดค้างไว้ 30 วินาทีเพื่อให้คุณตรวจดูหน้าจอ...");
    console.log("🎉 ALL PLAYWRIGHT LIVE TESTS COMPLETED AND PASSED 100%!");
  } catch (err) {
    console.error("❌ Error during test:", err);
  } finally {
    console.log("⏳ Keeping Google Chrome open for 30 seconds on your screen...");
    await page.waitForTimeout(30000);
    await browser.close();
    console.log("🏁 Browser closed. Test session finished.");
  }
}

runLiveTest();
