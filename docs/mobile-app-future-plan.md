# 📱 Smart MSO — Mobile App Future Plan

> **สถานะ:** 🔒 งานในอนาคต — เริ่มหลังจากระบบ Web สมบูรณ์ครบถ้วนแล้วเท่านั้น  
> **จัดทำ:** 21 ต.ค. 2569  
> **เงื่อนไขเริ่มต้น:** ระบบ Smart MSO Web ผ่าน Production Audit และเสถียรในการใช้งานจริงไม่น้อยกว่า 1 เดือน

---

## 🎯 วัตถุประสงค์

ขยายระบบ Smart MSO จาก Web Application ไปสู่ **Native Mobile Application**  
รองรับทั้ง **iOS** และ **Android** เพื่อเพิ่มความสะดวกในการทำงานนอกสถานที่ของบุคลากรภาครัฐ

---

## 🛠️ เทคโนโลยีที่เลือก: React Native + Expo

### เหตุผล
- ใช้ **TypeScript** เหมือนโปรเจกต์ Web ปัจจุบัน — ไม่ต้องเรียนรู้ภาษาใหม่
- ใช้ **Supabase JS Client** ร่วมกับ Web ได้ทันที
- **Expo Router** มี concept เดียวกับ Next.js App Router
- Build iOS + Android จากโค้ดชุดเดียว
- รองรับ **OTA Update** ผ่าน EAS Update (ไม่ต้อง submit store ทุกครั้ง)

---

## 🏗️ สถาปัตยกรรมเป้าหมาย (Target Architecture)

```
virtual-office/               ← Turborepo Monorepo (เปลี่ยนจาก single app)
├── apps/
│   ├── web/                  ← Next.js 16 (ย้ายจาก root)
│   └── mobile/               ← Expo React Native (ใหม่)
│       ├── app/              ← Expo Router (file-based)
│       │   ├── (auth)/
│       │   │   └── login.tsx
│       │   ├── (tabs)/
│       │   │   ├── home.tsx
│       │   │   ├── circulars.tsx
│       │   │   ├── chat.tsx
│       │   │   └── profile.tsx
│       │   └── _layout.tsx
│       ├── components/
│       └── package.json
└── packages/
    └── shared/               ← Business Logic ใช้ร่วม Web + Mobile
        ├── src/
        │   ├── supabase.ts   ← Supabase client (ย้ายจาก lib/)
        │   ├── rbac.ts       ← Role logic
        │   ├── fleet.ts      ← Vehicle booking + conflict guard
        │   └── types.ts      ← TypeScript interfaces
        └── package.json
```

---

## 📅 แผนการพัฒนาแบ่ง 4 ระยะ

### Phase 0 — เตรียมโครงสร้าง (2 เดือน)

| งาน | รายละเอียด |
|-----|-----------|
| Monorepo Migration | แปลงโปรเจกต์เป็น Turborepo แบ่ง `apps/web` + `packages/shared` |
| Shared Package | ย้าย `lib/supabase.ts`, `lib/rbac.ts`, `types/*.ts` → `packages/shared` |
| API Hardening | ตรวจสอบ CORS + Bearer Token auth สำหรับ Mobile client ใน `/api/nas/*` |
| Supabase Auth Config | เปิด PKCE flow + deep link redirect URL |
| EAS Account Setup | สมัคร Expo EAS + เชื่อม Apple Developer + Google Play Console |
| Mobile Design System | สร้าง Design Tokens: สี, Font, Spacing สำหรับ Mobile |

> ✅ เกณฑ์ผ่าน Phase 0: Web App ยังทำงานได้ปกติหลัง Migrate ไม่มี Regression

---

### Phase 1 — MVP Core (3 เดือน)

**หน้าจอที่ต้องทำ:**

```
📱 Auth
├── /login         — Supabase Auth + Email OTP
└── /onboarding    — ตั้งค่า Biometric (Face ID / Fingerprint)

📱 Home
├── /home          — สรุปงานวันนี้, กิจกรรมล่าสุด
└── /notifications — Push Notification Center

📱 หนังสือราชการ
├── /circulars         — รายการหนังสือ (filter ตาม status)
├── /circulars/[id]    — รายละเอียด + PDF Viewer + ปุ่มลงนาม
└── /circulars/create  — สร้างหนังสือ (manager+)

📱 แชทกลุ่มงาน
├── /chat          — รายการห้อง Realtime
└── /chat/[id]     — ห้องแชท (Supabase Realtime)

📱 โปรไฟล์
└── /profile       — ข้อมูลผู้ใช้, Biometric Settings, Logout
```

**ฟีเจอร์หลัก:**
- [ ] Push Notification ผ่าน Expo Push Token → Supabase Edge Function → FCM/APNs
- [ ] Biometric Login (Face ID / Touch ID) ผ่าน `expo-local-authentication`
- [ ] Offline Queue — เก็บ Action ใน SQLite (`expo-sqlite`) เมื่อไม่มีสัญญาณ
- [ ] PDF Viewer — เปิดหนังสือราชการ PDF ผ่าน `expo-file-system`
- [ ] Deep Link — คลิก Notification เปิด App ไปหน้าที่ถูกต้อง

> ✅ เกณฑ์ผ่าน Phase 1: Beta บน TestFlight (iOS) + Internal Testing (Android) ผ่านการทดสอบกับเจ้าหน้าที่ภายใน

---

### Phase 2 — Fleet & Field Features (3 เดือน)

**ฟีเจอร์:**
- [ ] จองยานพาหนะ — เลือกรถ, วันเวลา, ตรวจ Conflict real-time
- [ ] QR Scanner — สแกน QR Code ตรวจรับกุญแจรถ (`expo-camera`)
- [ ] GPS Check-in/Check-out — บันทึก Location + Timestamp (`expo-location`)
- [ ] อัปโหลดรูปราชการ — บีบอัดฝั่ง Client ≤3.5MB → ส่งผ่าน `/api/nas/upload` → Synology NAS
- [ ] นำทาง — เปิด Google Maps / Apple Maps ไปยังจุดหมายราชการ

> ✅ เกณฑ์ผ่าน Phase 2: ทดสอบ Booking + QR Scan กับยานพาหนะจริงในสำนักงาน

---

### Phase 3 — Advanced & Distribution (4 เดือน)

**ฟีเจอร์:**
- [ ] E-Signature on Mobile — วาดลายเซ็นบน Touchscreen + บันทึก PNG ลง Supabase Storage
- [ ] MDM Distribution — กระจาย App แบบ Internal Enterprise (ไม่ผ่าน Public Store)
- [ ] Home Screen Widget (iOS/Android) — แสดงงานค้างวันนี้
- [ ] Accessibility — รองรับ VoiceOver (iOS) + TalkBack (Android) ตาม WCAG 2.1 AA

> ✅ เกณฑ์ผ่าน Phase 3: Submit App Store + Google Play Store สำเร็จ

---

## 🔐 ข้อกำหนดความปลอดภัย

| ประเด็น | แนวทาง |
|---------|--------|
| Token Storage | ใช้ `expo-secure-store` (Keychain/Keystore) — ห้ามใช้ AsyncStorage เด็ดขาด |
| Certificate Pinning | Pin SSL Certificate ของ Supabase + Vercel ใน Production |
| Jailbreak/Root Detection | ตรวจจับและแจ้ง Admin หาก Device ถูก Jailbreak/Root |
| Biometric Fallback | ล้มเหลว 3 ครั้ง → Force Logout อัตโนมัติ |
| Data at Rest | ห้ามแคช PDF ลง Device โดยไม่เข้ารหัส |
| API Proxy | ยังคงเรียก `/api/nas/*` ผ่าน Next.js — ห้ามเรียก Synology NAS โดยตรง |

---

## 💰 ต้นทุนที่จำเป็น

| รายการ | ต้นทุน |
|--------|--------|
| Apple Developer Account | $99/ปี |
| Google Play Developer Account | $25 (ครั้งเดียว) |
| Expo EAS Build (Production) | $99/ปี |
| **รวมปีแรก** | **~$223 (~8,000 บาท)** |

---

## 📊 Timeline โดยรวม

```
เริ่ม: หลังระบบ Web สมบูรณ์และ Stable ≥ 1 เดือน
│
├── เดือน 1–2   → Phase 0: Monorepo + Expo Init + Accounts
├── เดือน 3–5   → Phase 1: MVP Core (Auth, หนังสือ, แชท, Push)
├── เดือน 6–8   → Phase 2: Fleet + QR + GPS + Photo Upload
└── เดือน 9–12  → Phase 3: E-Sign + MDM + Store Release
```

---

## 📋 Checklist ก่อนเริ่ม (Pre-Start Checklist)

ตรวจสอบให้ครบก่อนเริ่ม Phase 0:

- [ ] ระบบ Web Smart MSO ผ่าน Production Audit ครบทุกโมดูล
- [ ] บุคลากรใช้งาน Web App จริงต่อเนื่องไม่น้อยกว่า 1 เดือน โดยไม่มี Critical Bug
- [ ] มี Apple Developer Account พร้อม ($99/ปี)
- [ ] มี Google Play Developer Account พร้อม ($25)
- [ ] มีเครื่อง Mac สำหรับ Xcode / iOS Simulator
- [ ] ทีมพัฒนาว่างพอสำหรับงานใหม่

---

> **หมายเหตุ:** เอกสารนี้เป็นแผนอนาคต — ไม่มีผลต่อการพัฒนา Web App ปัจจุบัน  
> ทบทวนและอัปเดตแผนนี้เมื่อ Web App พร้อม
