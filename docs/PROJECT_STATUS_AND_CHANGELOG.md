# Smart MSO Virtual Office — สรุปสถานะโปรเจ็คและบันทึกการพัฒนา (Project Status & Changelog)

> **อัปเดตล่าสุด:** 23 พฤศจิกายน 2569 (2026-11-23)  
> **Branch:** `main` (`origin/main`)  
> **Latest Commit:** `0c35894` (`fix(chat): remove mock seed data and legacy localStorage cache, use live Supabase only`)  
> **หน่วยงาน:** สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (พมจ.กำแพงเพชร)

---

## 1. ภาพรวมเทคโนโลยีและสถาปัตยกรรม (Tech Stack & Architecture)

| ส่วนประกอบ | เทคโนโลยีที่ใช้ |
| --- | --- |
| **Framework** | Next.js 16.4.6 (App Router, Turbopack), React, TypeScript |
| **Database & Realtime** | Supabase PostgreSQL + Supabase Realtime (`chat_channels`, `messages`, `meetings`, `tasks`, `leave_requests`, `leave_balances`, `leave_authorized_roles`, `thai_public_holidays`, `attendance_*`) |
| **On-Premise Storage** | Synology NAS (DSM File Station / Synology Photos) + Cloudflare R2 |
| **Document Export** | Word `.docx` (OOXML via `jszip`), PDF (Canvas A4), Excel `.xlsx` (`xlsx`) |
| **Testing** | Node.js built-in test runner (`node --test`, Node v24), Playwright E2E (`npx playwright test`) |
| **Deployment** | GitHub `origin/main` → Auto-deploy Production |

---

## 2. สรุปผลการพัฒนาเพิ่มเติมล่าสุด (Recent Changelog)

### 2.1 ระบบใบลาอิเล็กทรอนิกส์ (Leave Request)

#### ก. ยกระดับระบบใบลา v2 ครบวงจร (`063e753`)
- รองรับ **3 แบบฟอร์มราชการมาตรฐาน**:
  1. แบบฟอร์ม 1: ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว (`sick_leave`, `personal_leave`, `maternity_leave`)
  2. แบบฟอร์ม 2: ใบลาพักผ่อน (`vacation_leave`)
  3. แบบฟอร์ม 3: ใบขอยกเลิกวันลา (`cancel_leave`)
- รองรับการลา **ครึ่งวัน** (`morning` / `afternoon` = `0.5` วันทำการ)
- หักวันหยุดเสาร์-อาทิตย์และ **วันหยุดราชการไทย** อัตโนมัติ (อ่านจาก `thai_public_holidays` + ค่าเริ่มต้นใน `lib/thai-holidays.ts` และ Admin/ผู้ตรวจสอบเพิ่มวันหยุดพิเศษตามมติ ครม. ได้)
- ตรวจ **วันลาซ้อนทับ (Overlap Detection)** อัตโนมัติ (อนุญาตลาครึ่งเช้า + ครึ่งบ่ายในวันเดียวกันได้)
- รองรับ **ลายเซ็นดิจิทัล**, **ตีกลับให้ผู้ขอลาแก้ไข (`returned`)**, แนบเอกสาร (ใบรับรองแพทย์ ฯลฯ), และ **ซิงก์ข้อมูลเข้าตารางลงเวลาราชการ (`attendance_daily_notes`)** อัตโนมัติเมื่อได้รับคำสั่งอนุญาต

#### ข. ขั้นตอนการพิจารณาแบบเสนอแฟ้มกระดาษและผู้มีอำนาจสั่งอนุญาตเพียงผู้เดียว (`00c3d5f`)
- **ผู้มีอำนาจสั่งอนุญาตเพียงผู้เดียว:** `นางสาวมะลิวัน สิทธิโยธี` (`syno_มะลิวัน` — `SOLE_LEAVE_APPROVER`)
- **ผู้ตรวจสอบสถิติและผู้ดำเนินการในระบบแทน (หลัง พมจ. ลงนามเอกสารแล้ว):** `นายยุทธนา เจนจบ` (`syno_ยุทธนา` — `DEFAULT_LEAVE_ORDER_OPERATOR`)
- **ลำดับขั้นตอน (Workflow):**
  1. ผู้ขอลายื่นคำขอในระบบ (`pending_verifier`)
  2. ผู้ตรวจสอบสถิติ (`ยุทธนา`) ยืนยันข้อมูลสถิติวันลาถูกต้อง (`pending_supervisor`)
  3. หัวหน้ากลุ่ม/ฝ่าย (`manager` หรือผู้ได้รับสิทธิ์ `can_supervisor`) ใส่ความเห็นและลงนามในเอกสาร (`pending_approver`)
  4. `ยุทธนา` พิมพ์/ดาวน์โหลดใบลาเสนอแฟ้มกระดาษให้ พมจ. สั่งอนุญาต
  5. เมื่อ พมจ. ลงนามในเอกสารกระดาษแล้ว `ยุทธนา` ปรับสถานะในระบบเป็น `approved` (อนุญาต) หรือ `rejected` (ไม่อนุญาต) โดยระบบบันทึกชื่อผู้อนุญาตเป็น `นางสาวมะลิวัน สิทธิโยธี` และบันทึกหมายเหตุผู้ปรับสถานะในระบบ

#### ค. ทะเบียนคุมวันลารายบุคคล + ส่งออก Excel (`.xlsx`) (`b807b04`)
- เพิ่ม Modal แสดงผล **ทะเบียนคุมวันลารายบุคคล** ([LeaveControlRegisterModal.tsx](file:///c:/Users/GuitarDev/virtual-office/components/leave/LeaveControlRegisterModal.tsx)) เรียกดูได้ทั้งจากแท็บใบลาของฉันและแท็บสถิติวันลาประจำปี (ผู้ดูแล/ผู้ตรวจสอบสามารถสลับดูรายชื่อบุคลากรทุกคนได้)
- คำนวณสถิติเรียงตามลำดับเวลา, ยอดสะสมคงเหลือ, และรองรับการพิมพ์ A4 รวมถึงส่งออกไฟล์ Excel `.xlsx` ([leave-register-export.ts](file:///c:/Users/GuitarDev/virtual-office/lib/leave-register-export.ts)) ตามแบบฟอร์ม 12 คอลัมน์ (`A1:L`)

#### ง. แก้ไขและตรวจสอบการคำนวณ "จำนวนวันลาครั้งสุดท้าย" (`0a6656c`)
- เพิ่มฟังก์ชัน `normalizeAndValidateLastLeave` และ `findLatestApprovedGeneralLeave` ใน [leave-utils.ts](file:///c:/Users/GuitarDev/virtual-office/lib/leave-utils.ts)
- คำนวณจำนวนวันลาครั้งสุดท้ายอัตโนมัติตามช่วงวันที่ที่กรอก (หักวันหยุดเสาร์-อาทิตย์และวันหยุดราชการสำหรับลาป่วย/ลากิจ และนับวันต่อเนื่องสำหรับลาคลอด), รองรับลาครึ่งวัน (`0.5`), ป้องกันการเก็บค่า `0.0` เมื่อไม่ได้กรอก, และตรวจสอบทั้งฝั่ง UI, `POST /api/leave`, และ `PATCH /api/leave` (`resubmit`)

#### จ. เมนูจัดการลบใบลาที่ไม่ผ่านการอนุมัติหรือยกเลิกไปแล้ว (`4add3b8`)
- เพิ่มแท็บเมนู **🗑️ จัดการใบลาไม่ผ่าน/ยกเลิก** ใน [LeavePage.tsx](file:///c:/Users/GuitarDev/virtual-office/components/leave/LeavePage.tsx) และ endpoint `DELETE /api/leave` ใน [route.ts](file:///c:/Users/GuitarDev/virtual-office/app/api/leave/route.ts)
- **สิทธิ์เข้าใช้งาน:** เฉพาะ `นายยุทธนา เจนจบ` (`syno_ยุทธนา`), `Admin`, และผู้ที่ Admin มอบสิทธิ์ `3. บันทึกผลอนุญาต (แทน พมจ.)` (`can_approve`) ในตาราง `leave_authorized_roles`
- **เงื่อนไขความปลอดภัย:** ลบได้เฉพาะใบลาที่มีสถานะ `rejected` (ไม่อนุญาต) หรือ `cancelled` (ยกเลิกแล้ว) เท่านั้น (ตรวจสอบซ้ำทั้งฝั่ง UI และ Server) รองรับค้นหา, กรองตามสถานะ, ลบรายฉบับ, และลบหลายฉบับพร้อมกันพร้อม Modal ยืนยัน

#### ฉ. ปรับแบบฟอร์มเอกสาร `.docx` / `.pdf` / A4 Print View (`00c3d5f`, `4add3b8`)
- เพิ่มคำลงท้าย **"ขอแสดงความนับถือ"** เหนือส่วนลายเซ็นผู้ขอลาในแบบฟอร์ม **ใบลาพักผ่อน** ครบทั้ง 3 รูปแบบ ([LeaveFormPrintView.tsx](file:///c:/Users/GuitarDev/virtual-office/components/leave/LeaveFormPrintView.tsx), [leave-docx-export.ts](file:///c:/Users/GuitarDev/virtual-office/lib/leave-docx-export.ts), [leave-pdf-export.ts](file:///c:/Users/GuitarDev/virtual-office/lib/leave-pdf-export.ts))
- ปรับขนาดหน้ากระดาษ `.docx` ของ **ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว** และ **ใบลาพักผ่อน** ให้เป็น **A4 แผ่นเดียวพอดี** (`w:pgSz w:w="11906" w:h="16838"`, ขอบบน/ล่าง `567 dxa` = 1 ซม., นำ `docGrid` ออก, ปรับ `line="220"` และขนาดรูปลายเซ็นเป็น `~3.0 × 0.83 ซม.`)

---

### 2.2 ระบบการประชุมและนัดหมาย (Meetings)

#### ปรับเวลาเป็นระบบ 24 ชั่วโมงทั้งระบบ (`88dd4c8`)
- สร้างคอมโพเนนต์ [Time24Select.tsx](file:///c:/Users/GuitarDev/virtual-office/components/meetings/Time24Select.tsx) เลือกชั่วโมง `00`–`23` และนาที `00`–`55` (คงเศษนาทีเดิมไว้หากแก้ไขนัดหมายเก่า) พร้อมหน่วย `น.`
- แทนที่ `<input type="time">` ทั้งหมดใน [MeetingsPage.tsx](file:///c:/Users/GuitarDev/virtual-office/components/meetings/MeetingsPage.tsx) (ทั้งโหมดวันเดียวและหลายวันต่อเนื่อง) แก้ปัญหาเบราว์เซอร์ภาษาอังกฤษแสดงผล `AM/PM`
- เพิ่ม `formatTime24h` และ `formatMeetingTimeRange24h` ใน [calendar.ts](file:///c:/Users/GuitarDev/virtual-office/lib/calendar.ts) และใช้ใน `mapRowToMeeting` ของ [supabase.ts](file:///c:/Users/GuitarDev/virtual-office/lib/supabase.ts) เพื่อให้การแสดงผลเวลาในหน้าการ์ดนัดหมาย, ปฏิทิน, ห้องประชุม และ Dashboard เป็นระบบ 24 ชม. (`HH:mm - HH:mm น.`) ทั้งหมด

---

### 2.3 ระบบแชทกลุ่มราชการ (Official Division Chat)

#### ลบข้อมูลจำลองและแคชเก่าทั้งหมด ให้ใช้ข้อมูลจริงจาก Supabase 100% (`0c35894`)
- ลบข้อมูลจำลอง `DEFAULT_CHAT_GROUPS` (8 กลุ่ม) และ `INITIAL_CHAT_MESSAGES` (`msg_init_1`–`msg_init_6`) ออกจาก [chat-data.ts](file:///c:/Users/GuitarDev/virtual-office/lib/chat-data.ts)
- ลบการอ่าน/เขียนและ merge ข้อมูลจาก `localStorage` ใน [ChatPage.tsx](file:///c:/Users/GuitarDev/virtual-office/components/chat/ChatPage.tsx) พร้อมเพิ่ม `clearLegacyChatLocalStorage()` ล้างคีย์เก่าทั้งหมด (`smartmso_chat_*`, `omnioffice_chat_*`) อัตโนมัติเมื่อเปิดหน้า
- ปรับ `fetchChatGroups()` และ `fetchChatMessages()` ใน [supabase.ts](file:///c:/Users/GuitarDev/virtual-office/lib/supabase.ts) ให้คืนค่า `[]` เมื่อไม่มีข้อมูล แทนการ fallback เป็นข้อมูลจำลอง

---

### 2.4 ศูนย์ข้อมูล Data Hub, ลงเวลาราชการ และ UX (`a39cb75`, `349324e`, `b1293e5`, `d63e70e`, `00c0813`)
- เพิ่มหน้าวิเคราะห์ข้อมูล **TPMAP จ.กำแพงเพชร (2565–2569)** พร้อม API (`/api/tpmap`) และ Supabase schema
- อัปเดตลิงก์ระบบงาน 4 กลุ่มภารกิจ และลิงก์ `MSO e-Office` เป็น `https://mso.eoffice.go.th`
- เพิ่ม Pre-loading Skeleton (`PreloadSkeleton`) สำหรับหน้าหลัก, ระบบลงเวลาราชการ และระบบใบลา
- ปรับการส่งออกรายงานลงเวลาราชการ (`.xlsx` / `.docx` / `.pdf`) ให้รองรับลายเซ็นคอลัมน์ C และดาวน์โหลด PDF โดยตรง

---

## 3. แผนผังไฟล์สำคัญสำหรับพัฒนาต่อ (Key Files Reference)

### ระบบใบลาอิเล็กทรอนิกส์ (Leave)
- **UI หลัก:** [LeavePage.tsx](file:///c:/Users/GuitarDev/virtual-office/components/leave/LeavePage.tsx)
- **หน้าพิมพ์/ตัวอย่าง A4:** [LeaveFormPrintView.tsx](file:///c:/Users/GuitarDev/virtual-office/components/leave/LeaveFormPrintView.tsx), [LeavePreviewModal.tsx](file:///c:/Users/GuitarDev/virtual-office/components/leave/LeavePreviewModal.tsx)
- **ทะเบียนคุมวันลารายบุคคล:** [LeaveControlRegisterModal.tsx](file:///c:/Users/GuitarDev/virtual-office/components/leave/LeaveControlRegisterModal.tsx), [leave-register-export.ts](file:///c:/Users/GuitarDev/virtual-office/lib/leave-register-export.ts)
- **Export เอกสาร:** [leave-docx-export.ts](file:///c:/Users/GuitarDev/virtual-office/lib/leave-docx-export.ts), [leave-pdf-export.ts](file:///c:/Users/GuitarDev/virtual-office/lib/leave-pdf-export.ts)
- **Business Logic & วันหยุดไทย:** [leave-utils.ts](file:///c:/Users/GuitarDev/virtual-office/lib/leave-utils.ts), [thai-holidays.ts](file:///c:/Users/GuitarDev/virtual-office/lib/thai-holidays.ts)
- **API Routes:** [app/api/leave/route.ts](file:///c:/Users/GuitarDev/virtual-office/app/api/leave/route.ts), [app/api/leave/balances/route.ts](file:///c:/Users/GuitarDev/virtual-office/app/api/leave/balances/route.ts), [app/api/leave/holidays/route.ts](file:///c:/Users/GuitarDev/virtual-office/app/api/leave/holidays/route.ts), [app/api/leave/permissions/route.ts](file:///c:/Users/GuitarDev/virtual-office/app/api/leave/permissions/route.ts)
- **Unit Tests:** [leave-rules.test.mjs](file:///c:/Users/GuitarDev/virtual-office/tests/leave-rules.test.mjs) (19 เคส)

### ระบบการประชุมและนัดหมาย (Meetings)
- **UI & Components:** [MeetingsPage.tsx](file:///c:/Users/GuitarDev/virtual-office/components/meetings/MeetingsPage.tsx), [Time24Select.tsx](file:///c:/Users/GuitarDev/virtual-office/components/meetings/Time24Select.tsx), [MeetingCalendarView.tsx](file:///c:/Users/GuitarDev/virtual-office/components/meetings/MeetingCalendarView.tsx), [RoomBookingView.tsx](file:///c:/Users/GuitarDev/virtual-office/components/meetings/RoomBookingView.tsx)
- **Utilities & Data:** [calendar.ts](file:///c:/Users/GuitarDev/virtual-office/lib/calendar.ts), [meeting-data.ts](file:///c:/Users/GuitarDev/virtual-office/lib/meeting-data.ts), [supabase.ts](file:///c:/Users/GuitarDev/virtual-office/lib/supabase.ts)
- **E2E Tests:** [meetings-workflow.spec.ts](file:///c:/Users/GuitarDev/virtual-office/tests/meetings-workflow.spec.ts) (8 เคส)

### ระบบแชทกลุ่มราชการ (Chat)
- **UI:** [ChatPage.tsx](file:///c:/Users/GuitarDev/virtual-office/components/chat/ChatPage.tsx), [CreateGroupModal.tsx](file:///c:/Users/GuitarDev/virtual-office/components/chat/CreateGroupModal.tsx), [GroupMembersDrawer.tsx](file:///c:/Users/GuitarDev/virtual-office/components/chat/GroupMembersDrawer.tsx)
- **Utilities & Supabase:** [chat-data.ts](file:///c:/Users/GuitarDev/virtual-office/lib/chat-data.ts), [supabase.ts](file:///c:/Users/GuitarDev/virtual-office/lib/supabase.ts)

---

## 4. กติกาธุรกิจและข้อควรระวังในการพัฒนาต่อ (Guardrails)

1. **สิทธิ์อนุมัติใบลา:** ห้ามเปลี่ยน `SOLE_LEAVE_APPROVER` (`syno_มะลิวัน`) และ `DEFAULT_LEAVE_ORDER_OPERATOR` (`syno_ยุทธนา`) โดยไม่ได้รับการยืนยันจากหน่วยงาน
2. **การลบใบลา (`DELETE /api/leave`):** ต้องคงเงื่อนไข `isDeletableLeaveStatus` (`rejected` หรือ `cancelled` เท่านั้น) เพื่อไม่ให้กระทบยอดสถิติวันลาที่อนุมัติแล้ว
3. **Word `.docx` ใบลา 1 แผ่น A4:** ห้ามใส่ `<w:docGrid w:linePitch="360"/>` กลับเข้าไป และระวังอย่าเพิ่ม `after`/`trHeight` จนความสูงรวมเกิน `15,704 dxa` (พื้นที่ใช้งานจริงของ A4 ขอบ 1 ซม.)
4. **เวลาการประชุม 24 ชม.:** ห้ามใช้ `<input type="time">` หรือ `toLocaleTimeString` โดยไม่กำหนดรูปแบบ 24 ชม. — ให้ใช้ `Time24Select` และ `formatTime24h` / `formatMeetingTimeRange24h` เสมอ
5. **แชทกลุ่มราชการ:** ห้ามนำข้อมูล mock/seed หรือ `localStorage` fallback กลับมาใช้ — ต้องอ่านจาก Supabase `chat_channels` และ `messages` โดยตรงเท่านั้น
6. **การทดสอบอัตโนมัติ (Playwright):** เมื่อเขียน E2E test ที่มีการสร้าง/แก้ไขข้อมูล ให้ mock write route (`POST`/`PATCH`/`DELETE`) เสมอเพื่อไม่ให้ข้อมูลทดสอบไปปนในฐานข้อมูล Supabase จริง

---

## 5. คำสั่งตรวจสอบก่อน Commit / Deploy (Verification Commands)

> หมายเหตุ: บน Windows PowerShell 5.1 ให้เชื่อมคำสั่งด้วย `; if ($?) { ... }` แทน `&&`

```powershell
# 1. รัน Unit Tests ระบบใบลา (19 เคส)
node --test tests/leave-rules.test.mjs

# 2. ตรวจ TypeScript ทั้งโปรเจ็ค
npx tsc --noEmit

# 3. ทดสอบ Production Build
npm run build

# 4. รัน Playwright E2E ระบบการประชุม (8 เคส)
npx playwright test tests/meetings-workflow.spec.ts
```
