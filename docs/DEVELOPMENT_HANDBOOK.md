# 📘 คู่มือการพัฒนาและสถาปัตยกรรมระบบ Smart MSO (Developer Handbook)
**ระบบสำนักงานเสมือนจริง (Virtual Office)**  
**สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (พมจ.กำแพงเพชร)**  
*ฉบับปรับปรุงล่าสุด: พฤศจิกายน 2569 (เวอร์ชัน 2.5 - Comprehensive)*

---

## 📑 สารบัญ (Table of Contents)
1. [ภาพรวมและปรัชญาการพัฒนาระบบ (System Overview & Philosophy)](#1-ภาพรวมและปรัชญาการพัฒนาระบบ-system-overview--philosophy)
2. [เทคโนโลยีและสถาปัตยกรรมหลัก (Tech Stack & Architecture)](#2-เทคโนโลยีและสถาปัตยกรรมหลัก-tech-stack--architecture)
3. [โครงสร้างไดเรกทอรีและไฟล์สำคัญ (Project Directory Structure)](#3-โครงสร้างไดเรกทอรีและไฟล์สำคัญ-project-directory-structure)
4. [ทำเนียบบุคลากรและการจัดการสิทธิ์ (Personnel & RBAC Engine)](#4-ทำเนียบบุคลากรและการจัดการสิทธิ์-personnel--rbac-engine)
5. [คู่มือการทำงานของทั้ง 13 โมดูลหลัก (Comprehensive Module Guides)](#5-คู่มือการทำงานของทั้ง-13-โมดูลหลัก-comprehensive-module-guides)
6. [มาตรฐานระเบียบงานสารบรรณภาครัฐ (Civil-Service Standards Compliance)](#6-มาตรฐานระเบียบงานสารบรรณภาครัฐ-civil-service-standards-compliance)
7. [การเชื่อมโยง Synology NAS และ Cloudflare Tunnel](#7-การเชื่อมโยง-synology-nas-และ-cloudflare-tunnel)
8. [แนวทางการทดสอบอัตโนมัติ (Automated Testing with Playwright)](#8-แนวทางการทดสอบอัตโนมัติ-automated-testing-with-playwright)
9. [คู่มือการติดตั้ง พัฒนา และขึ้นระบบ (Setup, Build & Deployment Guide)](#9-คู่มือการติดตั้ง-พัฒนา-และขึ้นระบบ-setup-build--deployment-guide)

---

## 1. ภาพรวมและปรัชญาการพัฒนาระบบ (System Overview & Philosophy)

**Smart MSO** คือระบบสำนักงานเสมือนจริง (Virtual Office) ที่ออกแบบมาเพื่อตอบสนองการปฏิบัติงานของสำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร โดยยึดหลักการสำคัญ 4 ประการ:
1. **Civil-Service Native:** ออกแบบตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และที่แก้ไขเพิ่มเติม, ระเบียบการใช้รถยนต์ราชการ, ตราครุฑมาตรฐาน และปีพุทธศักราช (พ.ศ.)
2. **Hybrid Cloud & Sovereign Storage:** ใช้คลาวด์สด (Supabase) สำหรับข้อมูล Realtime และระบบแจ้งเตือน แต่จัดเก็บไฟล์ราชการ เอกสารสแกน และภาพถ่ายกิจกรรมบน **Synology NAS ในเครือข่ายภายในของสำนักงาน (On-Premise)** เพื่อความมั่นคงปลอดภัยตามกฎหมายคุ้มครองข้อมูล
3. **Single Source of Truth:** ข้อมูลบุคคล โครงสร้างกลุ่มงาน และภารกิจ ยึดตามทำเนียบข้าราชการและเจ้าหน้าที่จริงของ พมจ.กำแพงเพชร โดยตัดข้อมูลจำลอง (Mock Data) ออกทั้งหมด
4. **Resilience & Zero Failure:** ระบบทำงานได้ทั้งโหมดออนไลน์เต็มรูปแบบ (Supabase + NAS Live) และโหมดสำรองในเครื่อง (LocalStorage Fallback) โดยมีระบบทดสอบอัตโนมัติ (Playwright E2E) ครอบคลุมทุกการทำงานสำคัญ

---

## 2. เทคโนโลยีและสถาปัตยกรรมหลัก (Tech Stack & Architecture)

```mermaid
graph TD
    Client["Client Web Browser (Next.js 16 App Router + React 19)"]
    
    subgraph Cloud Layer
        SupabaseAuth["Supabase GoTrue Auth / LINE SSO"]
        SupabaseDB["Supabase Cloud Database (PostgreSQL + Realtime)"]
    end
    
    subgraph Edge Layer
        CFTunnel["Cloudflare Tunnel (https://cloud.smso.site)"]
        NextServer["Next.js Server API Routes (/api/*)"]
    end
    
    subgraph On-Premise Office Layer (Kamphaeng Phet)
        SynologyNAS["Synology NAS (DSM 7+ WebAPI @ 192.168.162.26)"]
        FileStation["File Station (/smartmso_documents, /chat_attachments)"]
        SynoPhotos["Synology Photos (/smartmso_photos)"]
    end
    
    Client -->|HTTPS / WSS| SupabaseAuth
    Client -->|WebSocket Realtime| SupabaseDB
    Client -->|HTTPS Client/Server Proxy| NextServer
    NextServer -->|Proxy / Tunnel| CFTunnel
    CFTunnel -->|LAN Network| SynologyNAS
    SynologyNAS --> FileStation
    SynologyNAS --> SynoPhotos
```

- **Frontend Core:**
  - `Next.js 16.4.2` (App Router + Turbopack Compiler)
  - `React 19.0.0`
  - `TypeScript 5`
  - `Tailwind CSS v4`
- **Backend & Cloud Database:**
  - `Supabase PostgreSQL` (`xkeiuyhkokmecefzzynb.supabase.co`)
  - `Supabase Realtime Channel` (`postgres_changes`, `presence`, `broadcast`)
  - `Supabase GoTrue Auth` + `LINE Login OAuth 2.0 / OpenID Connect`
- **On-Premise Private Storage:**
  - `Synology DSM 7.2 WebAPI` (SYNO.FileStation.*, SYNO.Foto.*)
  - พอร์ตภายใน: `192.168.162.26:5000` / พอร์ตภายนอกผ่าน Cloudflare Tunnel: `https://cloud.smso.site`
- **Testing & Tooling:**
  - `Playwright Test` (Chromium E2E Automation)
  - `@docx` (เครื่องมือสร้างเอกสาร Word .docx ราชการแบบ A4 หน้าเดียว)

---

## 3. โครงสร้างไดเรกทอรีและไฟล์สำคัญ (Project Directory Structure)

```
virtual-office/
├── app/                              # Next.js App Router Routes
│   ├── (app)/                        # Authenticated Shell Group Layout
│   │   ├── admin/                    # /admin - ระบบบริหารจัดการและกำหนดสิทธิ์ RBAC
│   │   ├── carbooking/               # /carbooking - ระบบจองยานพาหนะราชการ
│   │   ├── chat/                     # /chat - ระบบสนทนากลุ่มราชการ
│   │   ├── circular/                 # /circular - ระบบเวียนหนังสือราชการอิเล็กทรอนิกส์
│   │   ├── dashboard/                # /dashboard - สรุปภาพรวมสำนักงาน
│   │   ├── data-hub/                 # /data-hub - ศูนย์ข้อมูลสถิติ 11 อำเภอ & ทำเนียบ
│   │   ├── files/                    # /files - คลังเอกสารราชการ Synology NAS DMS
│   │   ├── gallery/                  # /gallery - คลังภาพถ่ายกิจกรรม Synology Photos
│   │   ├── meetings/                 # /meetings - การประชุม ผังเวลา และจองห้องประชุม
│   │   ├── reports/                  # /reports - รายงานและตัวชี้วัดสำนักงาน
│   │   ├── tasks/                    # /tasks - กระดานติดตาม 8 กลุ่มภารกิจ & LINE
│   │   ├── tools/                    # เครื่องมืออัจฉริยะ (bgremove, qrcode)
│   │   └── user/                     # /user - ข้อมูลส่วนบุคคลและการตั้งค่า
│   ├── api/                          # Serverless Route Handlers
│   │   ├── auth/                     # LINE OAuth callback, exchange & session
│   │   ├── carbooking/download-docx/ # สร้างและดาวน์โหลดไฟล์ Word .docx ขอใช้รถ
│   │   └── nas/                      # Synology NAS WebAPI Proxies (auth, files, photos)
│   └── layout.tsx                    # Root Layout & Font Initialization
├── components/                       # React UI Components
│   ├── admin/                        # AdminPage, PersonnelModal, Dossier
│   ├── carbooking/                   # CarBookingPage, ReturnVehicleModal
│   ├── chat/                         # ChatPage, CreateGroupModal, GroupMembersDrawer
│   ├── circular/                     # CircularPage, CircularViewerModal, GarudaEmblem
│   ├── datahub/                      # DataHubPage, SocialStatisticsReportModal
│   ├── dms/                          # NasFileManager, NasUploadProgressModal
│   ├── gallery/                      # NasPhotoGallery
│   ├── layout/                       # AppShell, Sidebar, Header, NotificationCenter
│   ├── meetings/                     # MeetingsPage, RoomBookingView, MeetingCalendarView
│   └── tasks/                        # TasksPage, LineShareModal, CreateTaskModal
├── context/                          # State Management Contexts
│   └── AppContext.tsx                # AppContext รวมศูนย์ Auth, RBAC, Sessions, Realtime
├── docs/                             # Technical Documentation
│   ├── DEVELOPMENT_HANDBOOK.md       # คู่มือฉบับนี้
│   ├── work-log-master.md            # บันทึกงานรวมทุกเซสชัน
│   └── cloudflare-master-plan.md     # แผนแม่บทระบบเครือข่ายและความปลอดภัย
├── lib/                              # Logic Modules & Services
│   ├── chat-data.ts                  # ข้อมูลและโครงสร้างห้องแชททางการ
│   ├── notifications.ts              # ระบบรวมศูนย์แจ้งเตือน Unified Notifications
│   ├── office-personnel.ts           # ทำเนียบบุคลากรจริง พมจ.กำแพงเพชร (Single Source)
│   ├── rbac.ts                       # กฎเกณฑ์สิทธิ์ RBAC และสิทธิ์โมดูล
│   ├── social-statistics.ts          # สถิติสังคม 11 อำเภอ และ 5 มิติ TPMAP
│   ├── supabase.ts                   # Supabase Client, Auth & Database APIs
│   ├── synology.ts                   # Synology DSM WebAPI Client & Direct Upload
│   ├── task-missions.ts              # 8 กลุ่มภารกิจหลัก พมจ.กำแพงเพชร & Deadline Intelligence
│   ├── thai-numerals.ts              # การแปลงเลขไทยและวันที่ พ.ศ.
│   └── types.ts                      # TypeScript Interfaces กลางของทั้งระบบ
└── tests/                            # Playwright E2E Test Suite
    ├── circular-multi-attachment.spec.ts
    ├── datahub-social-stats.spec.ts
    ├── division-chat.spec.ts
    ├── fixtures.ts
    ├── nas-dms-gallery.spec.ts
    └── tasks-mission-line.spec.ts
```

---

## 4. ทำเนียบบุคลากรและการจัดการสิทธิ์ (Personnel & RBAC Engine)

### 4.1 แหล่งข้อมูลบุคคล Single Source of Truth ([`lib/office-personnel.ts`](file:///c:/Users/GuitarDev/virtual-office/lib/office-personnel.ts))
ระบบใช้ข้อมูลบุคลากรจริงของ พมจ.กำแพงเพชร เชื่อมต่อกับ Supabase ตาราง `users`:
- **ผู้บริหารสูงสุด (`usr_1`):** นางสาวมะลิวัน สิทธิโยธี (พมจ.กำแพงเพชร) — ต่อ 101
- **ฝ่ายบริหารทั่วไป:**
  - `usr_2`: นายเสกพล ดิษฐโชติ (หน.ฝ่ายบริหารทั่วไป) — ต่อ 102
  - `usr_8`: นางสาวอารีวรรณ ประเสริฐอุดมศักดิ์ (การเงินและบัญชี) — ต่อ 109
  - `usr_9`: นายสมหมาย มั่นคง (พนักงานขับรถยนต์ ชำนาญงาน) — ต่อ 110
  - `usr_10`: นายธีรพัฒน์ บุญยืน (งานสารบรรณและเทคโนโลยีดิจิทัล) — ต่อ 111
- **กลุ่มนโยบายและวิชาการ:**
  - `usr_4`: นายพนมศักย์ บริภัทรจิรากร (รก.หน.กลุ่มนโยบายและวิชาการ) — ต่อ 103
  - `usr_5`: นางสาวขวัญนภา ศิริสมบัติ (เจ้าหน้าที่ระบบงานคอมพิวเตอร์) — ต่อ 106
- **กลุ่มการพัฒนาสังคมและสวัสดิการ:**
  - `usr_3`: นายวรวุฒิ พึ่งพัก (หน.กลุ่มการพัฒนาสังคมและสวัสดิการ ชำนาญการพิเศษ) — ต่อ 104
  - `usr_7`: นางสาวพิชชาภา ห้าวหาญ (นักสังคมสงเคราะห์ปฏิบัติการ) — ต่อ 108
- **ศูนย์บริการคนพิการจังหวัดกำแพงเพชร:**
  - `usr_6`: นางสาวสุมาลี แสงแก้ว (นักสังคมสงเคราะห์ กองทุนคนพิการ) — ต่อ 107
- **คณะทำงานที่ปรึกษาและภาคีเครือข่าย:**
  - `usr_11`: ดร. ศรัณย์ สิทธิโชค (ผู้ทรงคุณวุฒิด้านสวัสดิการสังคม)

### 4.2 ระบบระดับบทบาท (4-Tier RBAC)
1. **👑 Admin (ผู้ดูแลระบบระดับจังหวัด):** สิทธิ์สูงสุด เข้าถึงและจัดการได้ทุกโมดูล จัดการสมาชิก และปิด/เปิดระบบ
2. **👔 Manager (หัวหน้ากลุ่ม/ฝ่าย):** บริหารงานภายในกลุ่ม อนุมัติการใช้ทรัพยากร จองห้องประชุม และดูแลภารกิจ
3. **👤 Member (เจ้าหน้าที่ปฏิบัติงาน):** เข้าถึงงานส่วนตัว จองรถราชการ แชทกลุ่มงาน และลงนามรับทราบหนังสือเวียน
4. **🎟️ Guest (ผู้ร่วมงานภายนอก/ภาคี):** เข้าร่วมการประชุมที่ได้รับเชิญ และอ่านประกาศสาธารณะ

---

## 5. คู่มือการทำงานของทั้ง 13 โมดูลหลัก (Comprehensive Module Guides)

### 1. แดชบอร์ดภาพรวม (`/` & `/dashboard`)
- แสดงตัวชี้วัดด่วน: ครัวเรือนเปราะบาง TPMAP, คนพิการมีบัตร, เด็กแรกเกิด, เคส ศรส. 1300
- รายการหนังสือเวียนด่วนที่ต้องลงนาม
- สรุปสถานะการใช้รถยนต์และห้องประชุมวันนี้

### 2. รายงานสำนักงาน (`/reports`)
- สถิติการให้บริการ การเบิกจ่ายงบประมาณสงเคราะห์
- บันทึกการใช้ยานพาหนะและอัตราการใช้น้ำมัน

### 3. ระบบเวียนหนังสือราชการอิเล็กทรอนิกส์ (`/circular`)
- สร้างและเวียนหนังสือราชการพร้อมตราครุฑมาตรฐาน
- **Multi-Attachment Upload & Independent Preview:** รองรับไฟล์แนบหลายไฟล์ (PDF, ภาพสแกน) พร้อมปุ่มสลับดูเอกสารแต่ละไฟล์อย่างอิสระ ไม่สะดุด
- ระบบลงนามดิจิทัลและพิมพ์ใบสรุปผลการเวียน (Circulation Slip) พร้อม QR Code ตรวจสอบ

### 4. กระดานภารกิจงาน 8 กลุ่มงาน พมจ. (`/tasks`)
- ติดตามภารกิจด้วยกระดาน Kanban และตาราง List View
- ตัวกรองตาม 8 กลุ่มภารกิจหลัก พมจ.กำแพงเพชร
- **Deadline Intelligence:** วิเคราะห์กำหนดส่งงาน แปลงวันที่ พ.ศ. และขึ้นป้ายเตือนอัตโนมัติ
- **LINE Integration:** ส่งต่อภารกิจเข้ากลุ่ม LINE พร้อมข้อความตามระเบียบงานสารบรรณ

### 5. การประชุมและจองห้องประชุม (`/meetings`)
- ปฏิทินการประชุมรายเดือน พ.ศ. (Interactive Month View)
- ตรวจสอบห้องว่าง 6 ห้องประจำสำนักงาน และกด **"จองห้องประชุมนี้"** ใน 1 คลิก
- เชื่อมต่อตาราง `meeting_rooms` บน Supabase และแจ้งเตือนห้องประชุมด่วน

### 6. แชทและสนทนากลุ่มราชการ (`/chat`)
- ห้องแชทประจำฝ่ายและกลุ่มงานตามทำเนียบจริงของ พมจ.กำแพงเพชร
- แนบเอกสารราชการ, แม่แบบบันทึกข้อความ/ร่างคำสั่ง
- ซิงก์ไฟล์ขึ้น Synology NAS (`/chat_attachments`)
- สถานะออนไลน์และกำลังพิมพ์แบบเรียลไทม์

### 7. จองยานพาหนะราชการ (`/carbooking`)
- การจองรถราชการ จัดสรรพนักงานขับรถ และการอนุมัติแทน พมจ.
- เกจวัดระดับน้ำมันแอนะล็อกเสมือนจริง และเลขไมล์
- สร้างไฟล์ Word แบบขออนุญาตใช้รถ (.docx) หน้าเดียวจบตามแบบ คข-69_009
- แจ้งเตือนคืนรถอัตโนมัติเมื่อเลยเวลาเดินทางกลับ

### 8. ศูนย์ข้อมูลและสถิติสังคม พม. (`/data-hub`)
- สถิติจริง 11 อำเภอในกำแพงเพชร และการวิเคราะห์ 5 มิติความยากจน TPMAP
- ส่งออกข้อมูลเป็นไฟล์ Excel (CSV ภาษาไทยสมบูรณ์)
- พิมพ์รายงานทางการเสนอ กบจ. พร้อมตราครุฑและบล็อกลงนามของท่าน พมจ.
- แท็บ **ทำเนียบข้าราชการและเจ้าหน้าที่** ค้นหาชื่อเล่น เบอร์ต่อ และอีเมลในคลิกเดียว

### 9. คลังเอกสาร Synology NAS DMS (`/files`)
- จัดการไฟล์ราชการบนฮาร์ดไดรฟ์ของสำนักงานโดยตรง
- ตัวกรองประเภทไฟล์ (PDF, Excel, สื่อ, ZIP) และตัวกรองปีงบประมาณ พ.ศ.
- Modal อัปโหลดไฟล์ชุดใหญ่พร้อมแถบ Progress Bar รวม

### 10. คลังภาพและสื่อ Synology Photos (`/gallery`)
- อัลบั้มภาพถ่ายกิจกรรมโครงการราชการ
- มุมมองไทม์ไลน์ และ Lightbox ดูภาพขยายพร้อมข้อมูล EXIF
- ทางลัดปีงบประมาณ พ.ศ. และ 8 กลุ่มภารกิจ

### 11. เครื่องมือลบพื้นหลังภาพถ่าย (`/tools/bgremove`)
- เครื่องมือแต่งภาพติดบัตรข้าราชการ
- พู่กัน Canvas ลบและกู้คืนรายละเอียด
- เปลี่ยนสีพื้นหลังเป็นสีกรมท่า สีฟ้า หรือสีขาวตามระเบียบ

### 12. เครื่องมือสร้าง QR Code (`/tools/qrcode`)
- สร้าง QR Code ถาวรสำหรับติดบนเอกสารราชการ หนังสือเวียน และประชาสัมพันธ์

### 13. ศูนย์ควบคุมระบบและสิทธิ์ผู้ใช้ (`/admin` & `/user`)
- ดูแฟ้มประวัติข้าราชการฉบับสมบูรณ์ (Dossier)
- เมทริกซ์กำหนดสิทธิ์ RBAC แบบสด
- ระบบอนุมัติคำขอสิทธิ์เข้าใช้งานใหม่ (Access Requests Workflow)
- สวิตช์เปิด/ปิดปรับปรุงระบบรายโมดูล (Maintenance Mode) พร้อม Admin Bypass

---

## 6. มาตรฐานระเบียบงานสารบรรณภาครัฐ (Civil-Service Standards Compliance)

1. **ตราครุฑราชการ ([`GarudaEmblem.tsx`](file:///c:/Users/GuitarDev/virtual-office/components/circular/GarudaEmblem.tsx)):**
   - รหัส SVG มาตรฐานความคมชัดสูง
   - ตราครุฑขนาดมาตรฐาน **๓.๐ เซนติเมตร** สำหรับหนังสือภายนอกและคำสั่ง
   - ตราครุฑขนาด **๒.๐ เซนติเมตร** สำหรับหนังสือภายใน บันทึกข้อความ และรายงาน กบจ.
2. **ระบบปีพุทธศักราชและเลขไทย ([`lib/thai-numerals.ts`](file:///c:/Users/GuitarDev/virtual-office/lib/thai-numerals.ts)):**
   - ฟังก์ชันแปลงเลขอารบิกเป็นเลขไทย `toThaiNumerals("123")` ➔ `๑๒๓`
   - การฟอร์แมตวันที่ตามธรรมเนียมราชการ: `วันพุธที่ ๕ พฤศจิกายน ๒๕๖๙`
   - การแปลงวันที่ พ.ศ. กลับเป็น ISO สำหรับประมวลผลฐานข้อมูล
3. **การลงนามและการปฏิบัติราชการแทน:**
   - แบบฟอร์มอนุมัติมีช่องระบุชัดเจนระหว่าง "อนุมัติโดย พมจ." หรือ "ปฏิบัติราชการแทน พมจ."

---

## 7. การเชื่อมโยง Synology NAS และ Cloudflare Tunnel

- **Local Network Address:** `http://192.168.162.26:5000`
- **Public Secured Domain:** `https://cloud.smso.site`
- **โฟลเดอร์หลักบน NAS:**
  - `/smartmso_documents`: จัดเก็บไฟล์เอกสารและระเบียบราชการ (DMS)
  - `/chat_attachments`: จัดเก็บไฟล์และภาพแนบจากระบบแชท
  - `/smartmso_photos`: โฟลเดอร์ต้นทางสำหรับ Synology Photos
- **Direct Client Upload:** ระบบอัปโหลดไฟล์ขนาดใหญ่ (เช่น วิดีโอ 80+ MB) จากบราวเซอร์ตรงไปยัง NAS โดยไม่ผ่านขีดจำกัด Serverless 4.5 MB ของ Cloud Providers

---

## 8. แนวทางการทดสอบอัตโนมัติ (Automated Testing with Playwright)

รันชุดทดสอบอัตโนมัติเพื่อตรวจสอบคุณภาพของระบบ:

```bash
# รันชุดทดสอบหลักทั้งหมด (24 การทดสอบ)
npx playwright test tests/division-chat.spec.ts tests/datahub-social-stats.spec.ts tests/circular-multi-attachment.spec.ts tests/tasks-mission-line.spec.ts tests/nas-dms-gallery.spec.ts

# รันเฉพาะชุดทดสอบระบบแชทกลุ่มราชการ (9 การทดสอบ)
npx playwright test tests/division-chat.spec.ts

# รันเฉพาะชุดทดสอบศูนย์ข้อมูลสถิติสังคม Data Hub (5 การทดสอบ)
npx playwright test tests/datahub-social-stats.spec.ts

# เปิดรายงานผลการทดสอบ HTML Report
npx playwright show-report
```

---

## 9. คู่มือการติดตั้ง พัฒนา และขึ้นระบบ (Setup, Build & Deployment Guide)

### 9.1 ข้อกำหนดของระบบ (Prerequisites)
- Node.js version 18.18+ หรือ Node.js 20+
- บัญชี Supabase พร้อม URL และ Anon Key
- บัญชี LINE Developers (สำหรับ LINE Login)

### 9.2 การติดตั้งและรันในโหมดพัฒนา
```bash
# 1. Clone repository
git clone https://github.com/GuitarDev/virtual-office.git
cd virtual-office

# 2. ติดตั้ง Dependencies
npm install

# 3. กำหนดค่าสภาพแวดล้อมใน .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xkeiuyhkokmecefzzynb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
LINE_CLIENT_ID=<your-line-channel-id>
LINE_CLIENT_SECRET=<your-line-channel-secret>

# 4. ตรวจสอบโค้ด TypeScript
npx tsc --noEmit

# 5. รันเซิร์ฟเวอร์พัฒนา
npm run dev
```

### 9.3 การ Build และขึ้นสู่ Production
```bash
# ทดสอบ Build เป็น Production Bundle
npm run build

# รัน Production Server
npm start
```
ระบบผ่านการทดสอบและรองรับการ Deploy บน Vercel, Node.js Container หรือเซิร์ฟเวอร์ On-Premise ของหน่วยงานได้อย่างสมบูรณ์ 100%

