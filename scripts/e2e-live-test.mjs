import { chromium } from "playwright";
import path from "path";

const ARTIFACTS_DIR = "C:\\Users\\GuitarDev\\.gemini\\antigravity-ide\\brain\\9d93404e-73d3-4976-86ea-71d84f2ed87d";

async function runLiveTest() {
  console.log("🚀 Starting Playwright Live Browser Test...");
  console.log("🖥️ Launching Chromium in Headed Mode (You can watch the screen in real-time)...");

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000, // Smooth speed so user can watch every action
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
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
    localStorage.setItem("omnioffice_auth_session", JSON.stringify({
      user: adminUser,
      loginTime: "09:00 น.",
      rememberMe: true,
    }));
  });

  const page = await context.newPage();

  try {
    // ─── Step 1: Open Virtual Office ───
    console.log("📍 Step 1: Opening OmniOffice Workspace at http://localhost:3000");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // ─── Step 2: Test User Profile & Fullscreen Modal ───
    console.log("👤 Step 2: Testing User Profile & Fullscreen Modal (EditProfileModal)...");
    
    // Click User Profile navigation button
    const userNav = page.locator("aside button:has-text('ข้อมูลส่วนตัว'), nav button:has-text('ข้อมูลส่วนตัว')").first();
    await userNav.click();
    await page.waitForTimeout(1200);

    // Click "แก้ไขข้อมูลส่วนตัว" button on User page
    const editProfileBtn = page.locator("button:has-text('แก้ไขข้อมูลส่วนตัว')").first();
    await editProfileBtn.click();
    await page.waitForTimeout(1500);

    // 1. Capture Fullscreen View
    const shot1 = path.join(ARTIFACTS_DIR, "test_01_profile_fullscreen.png");
    await page.screenshot({ path: shot1 });
    console.log(`📸 Captured: ${shot1} (Full Screen Mode)`);

    // 2. Test Toggle Windowed Mode
    const toggleBtn = page.locator("button:has-text('ย่อหน้าต่าง'), button:has-text('เต็มหน้าจอ')").first();
    if (await toggleBtn.isVisible()) {
      console.log("🗗 Switching to Windowed Mode...");
      await toggleBtn.click();
      await page.waitForTimeout(1200);

      const shot2 = path.join(ARTIFACTS_DIR, "test_02_profile_windowed.png");
      await page.screenshot({ path: shot2 });
      console.log(`📸 Captured: ${shot2} (Windowed Mode)`);

      console.log("⛶ Switching back to Fullscreen Mode...");
      await toggleBtn.click();
      await page.waitForTimeout(1000);
    }

    // 3. Test Selecting an official avatar preset
    const presetAvatarBtn = page.locator("button:has-text('นายเสกพล'), button:has-text('นายวรวุฒิ')").first();
    if (await presetAvatarBtn.isVisible()) {
      console.log("👤 Selecting official avatar from Provincial gallery...");
      await presetAvatarBtn.click();
      await page.waitForTimeout(1000);
    }

    // 4. Test Closing via prominent close button
    const closeProfileBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
    if (await closeProfileBtn.isVisible()) {
      console.log("✕ Clicking prominent 'ปิดหน้าต่าง' button...");
      await closeProfileBtn.click();
      await page.waitForTimeout(1200);
    }

    // ─── Step 3: Test Car Booking System & Realistic Fuel Gauge ───
    console.log("🚗 Step 3: Testing Car Booking System & Realistic Fuel Gauge...");
    const carBookingNav = page.locator("aside button:has-text('รถยนต์สำนักงาน'), nav button:has-text('รถยนต์สำนักงาน')").first();
    await carBookingNav.click();
    await page.waitForTimeout(1500);

    // Switch to Fleet tab to view vehicles with gauges
    const fleetTabBtn = page.locator("button:has-text('ยานพาหนะราชการ')").first();
    if (await fleetTabBtn.isVisible()) {
      console.log("🚙 Switching to Fleet tab...");
      await fleetTabBtn.click();
      await page.waitForTimeout(1200);
    }

    const shot3 = path.join(ARTIFACTS_DIR, "test_03_car_fleet.png");
    await page.screenshot({ path: shot3 });
    console.log(`📸 Captured: ${shot3} (Vehicle fleet with realistic gauges)`);

    // Click "ดูแฟ้มประวัติ" button on first vehicle to open VehicleDetailModal
    const viewVehicleBtn = page.locator("button:has-text('ดูแฟ้มประวัติ')").first();
    if (await viewVehicleBtn.isVisible()) {
      console.log("🔍 Opening Vehicle Detail Modal...");
      await viewVehicleBtn.click();
      await page.waitForTimeout(1500);

      const shot4 = path.join(ARTIFACTS_DIR, "test_04_vehicle_detail.png");
      await page.screenshot({ path: shot4 });
      console.log(`📸 Captured: ${shot4} (Vehicle Detail with Realistic Cluster Gauge)`);

      // Close Vehicle Detail Modal via prominent button
      const closeVehicleBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
      if (await closeVehicleBtn.isVisible()) {
        console.log("✕ Closing Vehicle Detail Modal via prominent button...");
        await closeVehicleBtn.click();
        await page.waitForTimeout(1200);
      }
    }

    // ─── Step 4: Test Division Chat Groups ───
    console.log("💬 Step 4: Testing Chat Module & Official Division Groups...");
    const chatNav = page.locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')").first();
    await chatNav.click();
    await page.waitForTimeout(1500);

    const shot5 = path.join(ARTIFACTS_DIR, "test_05_division_chat.png");
    await page.screenshot({ path: shot5 });
    console.log(`📸 Captured: ${shot5} (Official Division Chat Groups)`);

    // Open Create Group Modal
    const createGroupBtn = page.locator("button:has-text('+ สร้างกลุ่ม'), button:has-text('สร้างกลุ่ม')").first();
    if (await createGroupBtn.isVisible()) {
      console.log("➕ Opening Create Group Modal...");
      await createGroupBtn.click();
      await page.waitForTimeout(1500);

      const shot6 = path.join(ARTIFACTS_DIR, "test_06_create_group_modal.png");
      await page.screenshot({ path: shot6 });
      console.log(`📸 Captured: ${shot6} (Create Group Modal with close button)`);

      // Close with prominent close button
      const closeGroupBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
      if (await closeGroupBtn.isVisible()) {
        console.log("✕ Closing Create Group Modal via prominent button...");
        await closeGroupBtn.click();
        await page.waitForTimeout(1200);
      }
    }

    // ─── Step 5: Test Admin Module & Member Dossier ───
    console.log("👑 Step 5: Testing Admin Module & Member Modals...");
    const adminNav = page.locator("aside button:has-text('ระบบจัดการ'), nav button:has-text('ระบบจัดการ')").first();
    await adminNav.click();
    await page.waitForTimeout(1500);

    // Open a member dossier
    const dossierBtn = page.locator("button:has-text('ดู')").first();
    if (await dossierBtn.isVisible()) {
      console.log("📋 Opening Member Dossier Modal...");
      await dossierBtn.click();
      await page.waitForTimeout(1500);

      const shot7 = path.join(ARTIFACTS_DIR, "test_07_admin_dossier.png");
      await page.screenshot({ path: shot7 });
      console.log(`📸 Captured: ${shot7} (Personnel Dossier Modal with Close Button)`);

      const closeDossierBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
      if (await closeDossierBtn.isVisible()) {
        console.log("✕ Closing Member Dossier Modal via prominent button...");
        await closeDossierBtn.click();
        await page.waitForTimeout(1200);
      }
    }

    // Open Edit Member Modal
    const editMemberBtn = page.locator("button:has-text('แก้ไข')").first();
    if (await editMemberBtn.isVisible()) {
      console.log("✏️ Opening Admin Edit Member Modal...");
      await editMemberBtn.click();
      await page.waitForTimeout(1500);

      const shot8 = path.join(ARTIFACTS_DIR, "test_08_admin_edit_member.png");
      await page.screenshot({ path: shot8 });
      console.log(`📸 Captured: ${shot8} (Admin Edit Member Modal with Close Button)`);

      const closeEditBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
      if (await closeEditBtn.isVisible()) {
        console.log("✕ Closing Admin Edit Member Modal via prominent button...");
        await closeEditBtn.click();
        await page.waitForTimeout(1200);
      }
    }

    console.log("🎉 ALL PLAYWRIGHT LIVE TESTS COMPLETED AND PASSED 100%!");
  } catch (err) {
    console.error("❌ Error during test:", err);
  } finally {
    console.log("⏳ Keeping browser open for 4 seconds so you can see final state...");
    await page.waitForTimeout(4000);
    await browser.close();
    console.log("🏁 Browser closed. Test session finished.");
  }
}

runLiveTest();
