import { test, expect } from "./fixtures";

test.describe("ระบบแชทกลุ่มทางการของกลุ่มงาน/ฝ่าย (Official Division Chat)", () => {
  test("ควรแสดงกลุ่มงานทางการของสำนักงาน และเปิด/ปิด Modal สร้างกลุ่มใหม่ได้", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนู แชททีม
    const chatNav = page
      .locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')")
      .first();
    await chatNav.click();

    // 2. ตรวจสอบกลุ่มงานทางการของสำนักงาน
    const divisionGroup = page.locator("text=กลุ่มงานประจำสำนักงาน").first();
    await expect(divisionGroup).toBeVisible();

    // 3. ตรวจสอบปุ่มสร้างกลุ่มแชท
    const createGroupBtn = page.locator("button:has-text('+ สร้างกลุ่ม'), button:has-text('สร้างกลุ่ม')").first();
    await expect(createGroupBtn).toBeVisible();
    await createGroupBtn.click();

    // 4. ตรวจสอบ Modal สร้างกลุ่มใหม่
    const modalTitle = page.locator("h3:has-text('สร้างกลุ่มแชทโครงการใหม่')");
    await expect(modalTitle).toBeVisible();

    // ตรวจสอบปุ่มปิดสีแดงเด่นชัด
    const closeBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
    await expect(closeBtn).toBeVisible();

    // 5. ปิดหน้าต่าง
    await closeBtn.click();
    await expect(modalTitle).not.toBeVisible();
  });

  test("ควรสามารถแนบเอกสารราชการหลายประเภท (PDF, Word, Excel) พร้อมกัน ตรวจสอบรายการ และส่งข้อความได้", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนู แชททีม
    const chatNav = page
      .locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')")
      .first();
    await chatNav.click();

    // 2. คลิกปุ่มแบบฟอร์มราชการ เพื่อเปิด Dropdown
    const templateBtn = page.locator("button:has-text('แบบฟอร์มราชการ')").first();
    await expect(templateBtn).toBeVisible();
    await templateBtn.click();

    // 3. ตรวจสอบรายการแบบฟอร์มราชการ และเลือกแนบ PDF
    const pdfTemplate = page.locator("button:has-text('บันทึกข้อความ')").first();
    await expect(pdfTemplate).toBeVisible();
    await pdfTemplate.click();

    // 4. แนบแบบฟอร์ม Word เพิ่มเติม
    await templateBtn.click();
    const docTemplate = page.locator("button:has-text('ร่างคำสั่งจังหวัด')").first();
    await expect(docTemplate).toBeVisible();
    await docTemplate.click();

    // 5. ตรวจสอบว่ามีกล่องแสดงไฟล์ที่พร้อมส่ง (Draft chips) ปรากฏ 2 รายการ
    const draftContainer = page.locator("text=ไฟล์ที่พร้อมส่ง (2 รายการ)");
    await expect(draftContainer).toBeVisible();

    // 6. พิมพ์ข้อความและกดส่ง
    const messageInput = page.locator("textarea[placeholder*='พิมพ์ข้อความสนทนา']").first();
    await messageInput.fill("เรียนทุกท่าน ขอส่งบันทึกข้อความและร่างคำสั่งจังหวัดเพื่อโปรดพิจารณา");

    const sendBtn = page.locator("button[type='submit']:has-text('ส่ง')").first();
    await sendBtn.click();

    // 7. ตรวจสอบว่าข้อความถูกส่งเข้าไปในกล่องแชทเรียบร้อย
    const sentMessage = page.locator("text=เรียนทุกท่าน ขอส่งบันทึกข้อความและร่างคำสั่งจังหวัดเพื่อโปรดพิจารณา").first();
    await expect(sentMessage).toBeVisible();

    // 8. ตรวจสอบว่าการ์ดไฟล์แนบแสดงครบทั้ง 2 ชิ้น พร้อมป้ายประเภทและปุ่มดาวน์โหลด
    const pdfCard = page.locator("div:has-text('บันทึกข้อความ_ขออนุมัติจัดโครงการสัมมนา2569.pdf')").first();
    await expect(pdfCard).toBeVisible();

    const docCard = page.locator("div:has-text('ร่างคำสั่งจังหวัดกำแพงเพชร_แต่งตั้งคณะทำงาน.docx')").first();
    await expect(docCard).toBeVisible();

    // 9. ทดสอบคลิกปุ่มดาวน์โหลดเอกสาร
    const downloadBtn = pdfCard.locator("button:has-text('ดาวน์โหลด')").first();
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();
  });

  test("ควรรองรับการแนบไฟล์จริงผ่าน File Input และแสดงภาพพรีวิวขนาดเล็ก (Thumbnail)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนู แชททีม
    const chatNav = page
      .locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')")
      .first();
    await chatNav.click();

    // 2. จำลองการเลือกไฟล์จริงผ่าน input type=file
    const fileInput = page.locator("input[type='file']").first();
    await fileInput.setInputFiles([
      {
        name: "รายงานผลการดำเนินงาน_ประจำปี.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from("dummy excel content"),
      },
      {
        name: "หลักฐานประกอบ_ใบเสร็จ.zip",
        mimeType: "application/zip",
        buffer: Buffer.from("dummy zip content"),
      },
    ]);

    // 3. ตรวจสอบว่าแสดงรายการไฟล์พร้อมส่ง
    const readyFiles = page.locator("text=ไฟล์ที่พร้อมส่ง (2 รายการ)");
    await expect(readyFiles).toBeVisible();

    // ตรวจสอบชิปไฟล์ Excel และ ZIP
    await expect(page.locator("text=รายงานผลการดำเนินงาน_ประจำปี.xlsx").first()).toBeVisible();
    await expect(page.locator("text=หลักฐานประกอบ_ใบเสร็จ.zip").first()).toBeVisible();

    // 4. ทดสอบลบไฟล์ออกจากชิป 1 ไฟล์
    const deleteZipBtn = page.locator("button[data-testid='remove-att-หลักฐานประกอบ_ใบเสร็จ.zip']").first();
    await deleteZipBtn.click();

    // 5. เหลือ 1 รายการ
    await expect(page.locator("text=ไฟล์ที่พร้อมส่ง (1 รายการ)")).toBeVisible();

    // 6. ส่งข้อความพร้อมไฟล์ Excel ที่เหลือ
    const messageInput = page.locator("textarea[placeholder*='พิมพ์ข้อความสนทนา']").first();
    await messageInput.fill("แนบไฟล์สรุปงบประมาณประจำปีครับ");
    const sendBtn = page.locator("button[type='submit']:has-text('ส่ง')").first();
    await sendBtn.click();

    // 7. ตรวจสอบข้อความและการ์ดไฟล์ Excel ในห้องแชท
    const sentBubble = page.locator("div.rounded-2xl:has-text('แนบไฟล์สรุปงบประมาณประจำปีครับ')").first();
    await expect(sentBubble).toBeVisible();
    await expect(sentBubble.locator("text=รายงานผลการดำเนินงาน_ประจำปี.xlsx").first()).toBeVisible();
  });

  test("การจัดเก็บบน Synology NAS: ตรวจสอบสถานะ /chat_attachments, ป้าย NAS บนไฟล์แนบ และการดาวน์โหลดผ่าน NAS API", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนู แชททีม
    const chatNav = page
      .locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')")
      .first();
    await chatNav.click();

    // 2. ตรวจสอบแถบสถานะการเชื่อมต่อ Synology NAS (/chat_attachments)
    const nasStatusPill = page.locator("text=Synology NAS: /chat_attachments").first();
    await expect(nasStatusPill).toBeVisible();

    // 3. แนบแบบฟอร์มราชการ
    const templateBtn = page.locator("button:has-text('แบบฟอร์มราชการ')").first();
    await templateBtn.click();
    const tpl = page.locator("button:has-text('รายงานแผนงบประมาณและตัวชี้วัด')").first();
    await expect(tpl).toBeVisible();
    await tpl.click();

    // 4. ตรวจสอบว่าชิปแสดงไฟล์พร้อมส่ง มีป้าย 'NAS' กำกับ
    const draftNasBadge = page.locator("div.flex:has-text('รายงานแผนงบประมาณและตัวชี้วัด_Q1_2569.xlsx') span:has-text('NAS')").first();
    await expect(draftNasBadge).toBeVisible();

    // 5. ส่งข้อความพร้อมเอกสารที่จัดเก็บบน Synology NAS
    const messageInput = page.locator("textarea[placeholder*='พิมพ์ข้อความสนทนา']").first();
    await messageInput.fill("ส่งแผนงบประมาณ Q1 จัดเก็บบน Synology NAS เรียบร้อยครับ");
    const sendBtn = page.locator("button[type='submit']:has-text('ส่ง')").first();
    await sendBtn.click();

    // 6. ตรวจสอบข้อความและการ์ดไฟล์ในห้องแชท พร้อมป้าย '💾 NAS'
    const bubble = page.locator("div.rounded-2xl:has-text('ส่งแผนงบประมาณ Q1 จัดเก็บบน Synology NAS เรียบร้อยครับ')").first();
    await expect(bubble).toBeVisible();
    await expect(bubble.locator("span:has-text('NAS')").first()).toBeVisible();

    // 7. ทดสอบคลิกดาวน์โหลดเอกสารจาก NAS
    const dlBtn = bubble.locator("button:has-text('ดาวน์โหลด')").first();
    await expect(dlBtn).toBeVisible();
    await dlBtn.click();

    // บันทึกภาพถ่ายหน้าจอสด
    await page.screenshot({ path: 'chat-nas-live.png' });
  });

  test("ควรแสดงสถานะออนไลน์ของสมาชิกในลิ้นชักข้อมูลกลุ่ม (Group Members Online Presence)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนู แชททีม
    const chatNav = page
      .locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')")
      .first();
    await chatNav.click();

    // 2. ตรวจสอบปุ่มสมาชิกกลุ่มในแถบส่วนหัว และคลิกเพื่อเปิดลิ้นชัก
    const membersBtn = page.locator("button:has-text('สมาชิก (')").first();
    await expect(membersBtn).toBeVisible();
    await membersBtn.click();

    // 3. ตรวจสอบว่าลิ้นชักสมาชิกแสดงผล พร้อมข้อความระบุจำนวนสมาชิกและสถานะออนไลน์
    const memberSummary = page.locator("text=สมาชิกทั้งหมด").first();
    await expect(memberSummary).toBeVisible();
    await expect(memberSummary).toContainText("ออนไลน์");

    // 4. ตรวจสอบปุ่มปิดลิ้นชัก
    const closeDrawerBtn = page.locator("button:has-text('✕')").first();
    await expect(closeDrawerBtn).toBeVisible();
    await closeDrawerBtn.click();
  });

  test("กลุ่มนโยบายและวิชาการ: ควรแสดง UI สนทนาที่ครบถ้วน และแสดงจำนวนสมาชิกถูกต้องสำหรับบุคลากรในกลุ่ม", async ({
    page,
  }) => {
    // กำหนด session เป็นบุคลากรกลุ่มนโยบายและวิชาการ (เช่น นายธนวัฒน์)
    await page.addInitScript(() => {
      const policyOfficer = {
        id: "syno_ธนวัฒน์",
        prefix: "นาย",
        firstName: "ธนวัฒน์",
        lastName: "แกมขุนทด",
        name: "นายธนวัฒน์ แกมขุนทด",
        personnelType: "ข้าราชการ",
        position: "นักวิชาการคอมพิวเตอร์ปฏิบัติการ",
        division: "กลุ่มนโยบายและวิชาการ",
        department: "กลุ่มนโยบายและวิชาการ",
        email: "thanawat.k@m-society.go.th",
        role: "member",
        status: "active",
      };
      const sessionData = JSON.stringify({
        user: policyOfficer,
        loginTime: "09:00 น.",
        rememberMe: true,
      });
      localStorage.setItem("smartmso_auth_session", sessionData);
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. นำทางไปยังเมนู แชททีม
    const chatNav = page.locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')").first();
    await chatNav.click();

    // 2. คลิกเลือกห้อง 'กลุ่มนโยบายและวิชาการ'
    const policyChannelBtn = page.locator("button:has-text('กลุ่มนโยบายและวิชาการ')").first();
    await expect(policyChannelBtn).toBeVisible();
    await policyChannelBtn.click();

    // 3. ตรวจสอบว่า UI ครบถ้วนสมบูรณ์ (ไม่ติดหน้าจอล็อค 🔒)
    // 3.1 กล่องพิมพ์ข้อความต้องแสดงผล
    const chatInput = page.locator("textarea[placeholder*='กลุ่มนโยบายและวิชาการ']");
    await expect(chatInput).toBeVisible();

    // 3.2 ปุ่มส่งข้อความ และเครื่องมือแนบไฟล์ต้องแสดงผล
    await expect(page.locator("button:has-text('แนบไฟล์')")).toBeVisible();
    await expect(page.locator("button:has-text('รูปภาพ')")).toBeVisible();
    await expect(page.locator("button:has-text('แบบฟอร์มราชการ')")).toBeVisible();
    await expect(page.locator("button[type='submit']:has-text('ส่ง')")).toBeVisible();

    // 3.3 ต้องไม่มีข้อความแจ้งเตือนถูกล็อคสิทธิ์
    await expect(page.locator("text=คุณไม่ได้เป็นสมาชิกในกลุ่มนี้")).not.toBeVisible();

    // 4. ตรวจสอบสถานะจำนวนสมาชิกในกลุ่ม ต้องไม่เป็น 0 คน
    const membersBadge = page.locator("button:has-text('สมาชิก (')").first();
    await expect(membersBadge).toBeVisible();
    const membersBadgeText = await membersBadge.textContent();
    // ต้องมีสมาชิกอย่างน้อย 1 คน (ไม่แสดง 0)
    expect(membersBadgeText).not.toContain("สมาชิก (0)");

    // 5. เปิดลิ้นชักดูรายชื่อสมาชิก และตรวจสอบว่ามีชื่อบุคลากรสังกัดกลุ่มนโยบายและวิชาการ
    await membersBadge.click();
    const drawerSummary = page.locator("text=สมาชิกทั้งหมด").first();
    await expect(drawerSummary).toBeVisible();
    await expect(drawerSummary).not.toContainText("สมาชิกทั้งหมด 0 คน");
  });

  test("ควรรองรับการแสดงภาพพรีวิวกรณีที่ user อื่นส่งเข้ามาในแชท (Other user image preview via /api/nas/download)", async ({
    page,
  }) => {
    // กำหนดข้อความแชทล่วงหน้าใน localStorage โดยจำลองข้อความจากผู้ใช้อื่นที่มีรูปภาพแนบ
    await page.addInitScript(() => {
      const otherUserMsg = {
        id: "msg_test_other_user_img",
        groupId: "ch_all_staff",
        senderId: "syno_somchai_other",
        senderName: "นายสมชาย ใจดี",
        senderRole: "member",
        senderPosition: "เจ้าพนักงานพัฒนาสังคมชำนาญงาน",
        text: "ส่งภาพกิจกรรมเปิดงานโครงการเฉลิมพระเกียรติครับ",
        timestamp: "10:30 น.",
        attachmentName: "activity_ceremony_2569.jpg",
        attachmentType: "image",
        attachmentSize: "2.5 MB",
        attachmentUrl: "/api/nas/download?path=%2Fchat_attachments%2Factivity_ceremony_2569.jpg",
        attachments: [
          {
            id: "att_other_img_1",
            name: "activity_ceremony_2569.jpg",
            type: "image",
            size: "2.5 MB",
            nasPath: "/chat_attachments/activity_ceremony_2569.jpg",
            url: "/api/nas/download?path=%2Fchat_attachments%2Factivity_ceremony_2569.jpg",
            storageType: "nas",
            uploadedToNas: true,
          },
        ],
      };
      localStorage.setItem("smartmso_chat_messages_v2", JSON.stringify([otherUserMsg]));
      localStorage.setItem("omnioffice_chat_messages_v2", JSON.stringify([otherUserMsg]));
      localStorage.setItem("smartmso_chat_messages", JSON.stringify([otherUserMsg]));
      localStorage.setItem("omnioffice_chat_messages", JSON.stringify([otherUserMsg]));
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนู แชททีม
    const chatNav = page.locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')").first();
    await chatNav.click();

    // 2. ตรวจสอบว่าข้อความจากผู้ใช้อื่นแสดงผล
    const otherMsgText = page.locator("text=ส่งภาพกิจกรรมเปิดงานโครงการเฉลิมพระเกียรติครับ").first();
    await expect(otherMsgText).toBeVisible();

    // 3. ตรวจสอบว่ารูปภาพของ user อื่นแสดงผล (tag img แสดงและ src เชื่อมโยงไปที่ api/nas/download พร้อม mode=open)
    const imgEl = page.locator("img[alt='activity_ceremony_2569.jpg']").first();
    await expect(imgEl).toBeVisible();

    const imgSrc = await imgEl.getAttribute("src");
    expect(imgSrc).toContain("/api/nas/download");
    expect(imgSrc).toContain("mode=open");

    // 4. ทดสอบคลิกที่รูปภาพเพื่อเปิด Lightbox ขยายภาพพรีวิว
    await imgEl.click();

    // 5. ตรวจสอบว่า Modal Lightbox ขยายภาพเปิดขึ้นมาอย่างสมบูรณ์
    const lightboxModal = page.locator("div.fixed.inset-0:has-text('พรีวิวไฟล์แนบ')").first();
    await expect(lightboxModal).toBeVisible();
    await expect(lightboxModal.locator("text=activity_ceremony_2569.jpg").first()).toBeVisible();

    // 6. ปิด Modal
    const closeBtn = lightboxModal.locator("button:has-text('✕')").first();
    await closeBtn.click();
    await expect(lightboxModal).toBeHidden();
  });
});


