---
name: smart-mso-stack
description: Comprehensive architecture, engineering guidelines, and best practices for developing government virtual office systems using Next.js App Router, Supabase Realtime PostgreSQL, Synology NAS on-premise storage, Cloudflare Tunnel, and civil-service RBAC.
---

# Smart MSO Full-Stack Architecture & Development Guide

คู่มือมาตรฐานสถาปัตยกรรมและแนวทางปฏิบัติระดับเชี่ยวชาญ (Best Practices) สำหรับการพัฒนาและต่อยอดระบบสำนักงานเสมือนจริงสำหรับหน่วยงานภาครัฐ (Government Virtual Office) ตามสถาปัตยกรรม **Smart MSO Stack**

---

## 1. ภาพรวมสถาปัตยกรรมระบบ (System Architecture Overview)

Smart MSO ใช้สถาปัตยกรรม **Hybrid Edge-Cloud Topology** ที่ผสานระหว่างความเร็วของการประมวลผลบนคลาวด์กับความปลอดภัยระดับสูงของคลังข้อมูลราชการภายในสำนักงาน:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Client Layer (PWA / Web)                       │
│      React 19 + Next.js App Router + Tailwind CSS v4 + TypeScript      │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼ (Metadata & Realtime Sync)       ▼ (Encrypted Proxied API)
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│        Supabase Cloud (PaaS)         │  │   Next.js BFF Server Routes  │
│ - PostgreSQL with RLS                │  │   /api/nas/* & /api/auth/*   │
│ - Realtime WebSocket Subscriptions   │  └──────────────┬───────────────┘
│ - Audit Logging & Auth Sync          │                 │
└──────────────────────────────────────┘                 │ (Secure HTTPS / Cloudflare Tunnel)
                                                         ▼
                                          ┌──────────────────────────────┐
                                          │  Synology NAS (On-Premise)   │
                                          │ - DSM WebAPI (File Station)  │
                                          │ - Synology Photos (Shared)   │
                                          │ - User Directory / Auth      │
                                          └──────────────────────────────┘
```

### หลักการสำคัญ (Core Principles):
1. **Metadata on Cloud, Binaries on Premise:** ข้อมูลโครงสร้าง, สถิติ, ประวัติกิจกรรม, สถานะงาน, และการส่งข้อความ Realtime เก็บใน Supabase Cloud ส่วนไฟล์เอกสารลับราชการและรูปภาพกิจกรรมความละเอียดสูงจัดเก็บในเครื่อง Synology NAS ภายในสำนักงาน
2. **Reverse Proxy & Endpoint Masking:** ห้ามเปิดเผย IP ภายในสำนักงานหรือโดเมนตรงของ NAS ไปยัง Client ฝั่ง Frontend ต้องเรียกผ่าน API Proxy `/api/nas/*` ของ Next.js เสมอ
3. **Optimistic Local Cache + Realtime Reconciliation:** ใช้งาน Local Cache ก่อนเพื่อให้ UI ตอบสนองในทันที (Instant UI) แล้วทำ Background Sync กับ Supabase เพื่อความต่อเนื่องเมื่อทำงานในจุดที่อินเทอร์เน็ตไม่เสถียร

---

## 2. โครงสร้างบุคลากรภาครัฐและการกำหนดสิทธิ์ (Civil Service RBAC)

### 2.1 ประเภทบุคลากรตามระเบียบข้าราชการ (Personnel Types)
ระบบต้องรองรับประเภทการจ้างงาน 6 ประเภทหลักของหน่วยงานรัฐ:
- `ข้าราชการ`: สิทธิ์เต็มรูปแบบตามลำดับชั้นบังคับบัญชา
- `ลูกจ้างประจำ`: เจ้าหน้าที่ปฏิบัติการประจำส่วนราชการ
- `พนักงานราชการ`: สัญญาจ้างตามภารกิจหลัก
- `พนักงานกองทุน`: เจ้าหน้าที่เฉพาะกิจ (เช่น กองทุนส่งเสริมคนพิการ/คุ้มครองเด็ก)
- `พนักงานจ้างเหมาบริการ`: ผู้ปฏิบัติงานสนับสนุนงานสารบรรณ/ธุรการ
- `ที่ปรึกษา/ผู้ทรงคุณวุฒิ`: คณะทำงานภายนอกและภาคีเครือข่าย

### 2.2 บทบาทผู้ใช้ (4-Tier Roles)
| Role | ป้ายกำกับ | ขอบเขตอำนาจหน้าที่ |
| :--- | :--- | :--- |
| `admin` | ผู้ดูแลระบบ (พมจ./หัวหน้า สนง.) | มีสิทธิ์สูงสุด เข้าถึงได้ทุกโมดูล จัดการสมาชิก และกำหนดสิทธิ์ RBAC |
| `manager` | ผู้จัดการ/หัวหน้ากลุ่มงาน | ดูแลและมอบหมายงานทีม อนุมัติการใช้ยานพาหนะ สรุปรายงานประจำฝ่าย |
| `member` | ข้าราชการ/เจ้าหน้าที่ทั่วไป | ใช้งานกระดานงานกลุ่มงาน แชท เวียนหนังสือราชการ จองรถยนต์ส่วนกลาง |
| `guest` | ผู้เยี่ยมชม/ภาคีภายนอก | เข้าร่วมการประชุมที่ได้รับเชิญและห้องแชทสาธารณะเท่านั้น |

### 2.3 ขอบเขตการมองเห็นงานและเอกสาร (Visibility Scoping)
- `individual`: มองเห็นได้เฉพาะผู้สร้าง, ผู้รับผิดชอบตรง, และ Admin/Manager ฝ่ายตน
- `department`: มองเห็นและทำงานร่วมกันได้เฉพาะบุคลากรในกลุ่มงาน/ฝ่ายเดียวกัน
- `public`: เปิดเผยต่อบุคลากรทุกคนในสำนักงาน

---

## 3. การเชื่อมต่อ Synology NAS WebAPI ในสภาวะ Serverless

### 3.1 การข้ามขีดจำกัดขนาดไฟล์บน Serverless (Vercel 4.5MB Payload Limit)
แพลตฟอร์ม Cloud Serverless เช่น Vercel จำกัด Body Payload ไว้ที่ **4.5 MB** หากส่งไฟล์ภาพจากกล้องความละเอียดสูง (5–20 MB) จะเกิดข้อผิดพลาด `HTTP 413 FUNCTION_PAYLOAD_TOO_LARGE`:

**แนวทางปฏิบัติ:**
1. **Client-side Adaptive Downsampling:** สำหรับไฟล์รูปภาพ (`image/*`) ที่มีขนาดเกิน 3.5 MB ให้บีบอัดอัตโนมัติบน Browser ผ่าน HTML5 Canvas คุมขนาดด้านยาวสุดไม่เกิน 2560px ด้วย Quality 0.88
   ```ts
   // ปรับขนาดภาพก่อนส่งไปยัง Next.js Serverless Route
   export async function compressImageForUpload(file: File): Promise<File> {
     if (!file.type.startsWith("image/") || file.size <= 3.5 * 1024 * 1024) return file;
     return new Promise((resolve) => {
       const img = new Image();
       img.src = URL.createObjectURL(file);
       img.onload = () => {
         const canvas = document.createElement("canvas");
         const maxDim = 2560;
         let { width, height } = img;
         if (width > maxDim || height > maxDim) {
           if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
           else { width = Math.round((width * maxDim) / height); height = maxDim; }
         }
         canvas.width = width; canvas.height = height;
         const ctx = canvas.getContext("2d");
         ctx?.drawImage(img, 0, 0, width, height);
         canvas.toBlob((blob) => {
           resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file);
         }, "image/jpeg", 0.88);
       };
     });
   }
   ```
2. **Pre-flight Size Guard:** ก่อนส่งไฟล์เอกสาร/วิดีโอ ให้ตรวจสอบ `file.size <= 4.0 * 1024 * 1024` เสมอ หากเกินขนาดให้แสดงคำแนะนำแก่ผู้ใช้

### 3.2 กฎการจัดเตรียม Multipart FormData สำหรับ `SYNO.FileStation.Upload`
- ระบุ API พารามิเตอร์ใน URL Query String:
  `.../webapi/entry.cgi?api=SYNO.FileStation.Upload&version=2&method=upload&_sid=${sid}`
- ใน Form Body: **ฟิลด์ `file` ต้องวางไว้เป็นลำดับสุดท้าย (Last Field) เสมอ**
- ป้องกันสตริง `"null"`: หาก `sid` เป็น `null` หรือ `undefined` อย่าใส่เข้าไปใน FormData เพราะเบราว์เซอร์จะแปลงเป็นคำว่า `"null"` ซึ่งทำให้ NAS ตอบกลับ `Code 119: Invalid session`

### 3.3 การจัดการ Synology Photos บน DSM 7+
- **ห้ามบันทึกไฟล์ลงใน Root `/photo` ตรงๆ:** ระบบ Photos บน DSM 7+ จะตอบกลับด้วยข้อผิดพลาด `Code 407: File operation failed`
- **Auto-routing:** ให้ระบบ Route ปลายทางไปยังโฟลเดอร์ย่อย เช่น `/photo/General` หรือโฟลเดอร์หมวดหมู่เสมอ
- เรียก `ensureDirectoryExists` ผ่านคำสั่ง `SYNO.FileStation.CreateFolder` พร้อม `force_parent="true"` ก่อนอัปโหลดไฟล์เสมอ

---

## 4. กลยุทธ์การป้องกันข้อผิดพลาดเครือข่ายและการ Parse JSON อย่างปลอดภัย

### 4.1 การป้องกันแอปแครชจากหน้าเว็บ Cloudflare 502 / 521 (Safe JSON Parsing)
เมื่อ NAS ดับหรือ Cloudflare Tunnel หลุด เซิร์ฟเวอร์ภายนอกจะส่งหน้า HTML Error (เช่น `502 Bad Gateway`) กลับมา การใช้ `response.json()` ทันทีจะทำให้แอปแครชด้วย `SyntaxError: Unexpected token '<'`

**แนวทางปฏิบัติ (Safe Parser Pattern):**
```ts
export async function safeParseJsonResponse<T = any>(res: Response): Promise<{ success: boolean; data?: T; error?: string }> {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return { success: res.ok, data };
  } catch {
    const isCloudflareError = text.includes("502 Bad Gateway") || text.includes("Cloudflare");
    return {
      success: false,
      error: isCloudflareError 
        ? "ไม่สามารถเชื่อมต่อเครื่อง Synology NAS ภายในสำนักงานได้ (Cloudflare Gateway Offline)" 
        : `ข้อผิดพลาดการเชื่อมต่อ [HTTP ${res.status}]`,
    };
  }
}
```

---

## 5. การจัดการข้อมูลและระบบซิงก์แบบไม่มี Mock Reseeding ตกค้าง

### 5.1 นโยบาย Zero-Mock & Anti-Resurrection Guard
ในระบบใช้งานจริง ต้องป้องกันไม่ให้ข้อมูลจำลอง (Mock Data) หรือรหัสบุคคลทดสอบถูกสร้างวนลูปกลับมาใหม่:
1. **คัดกรอง ID พิเศษ:** ดักกรอง `usr_1`, `usr_mock`, `circ_2569_001` ออกจากตัวเลือกบุคลากรและรายการเอกสารเสมอ
2. **Explicit Delete on Remote:** หากตรวจพบข้อมูลจำลองเก่าในตาราง Supabase ให้ส่งคำสั่ง `.delete().in('id', [...])` แบบเงียบๆ เพื่อลบออกจากฐานข้อมูลอย่างถาวร
3. **Empty Initial State:** ตัวแปรตั้งต้นในโค้ด เช่น `INITIAL_MEMBERS`, `INITIAL_BOOKING_REQUESTS`, `INITIAL_CHAT_MESSAGES` ต้องกำหนดเป็น `[]` ว่างเปล่าเสมอ

---

## 6. โมดูลภารกิจหลักของหน่วยงานรัฐ (Core Domain Logic)

### 6.1 ระบบเวียนหนังสือราชการอิเล็กทรอนิกส์ (Circular Documents & E-Sign)
- **Target Recipient Resolver:** กระจายหนังสือตามสังกัดฝ่าย หรือกลุ่มประเภทบุคลากรได้แบบยืดหยุ่น
- **Realtime Read Tracking:** บันทึกเวลาที่เปิดอ่าน พร้อมระบบลงนามรับทราบดิจิทัล (Digital Acknowledgment Stamp)
- **PDF Preview Fallback:** หากเอกสารไม่มี URL ต้นฉบับ ให้เรียกไฟล์ตัวอย่างมาตรฐาน `/virtual-office/circular_docs/sample.pdf`

### 6.2 ระบบจองยานพาหนะส่วนกลางและการตรวจจับเวลาซ้อนทับ (Fleet Conflict Guard)
- สูตรคำนวณการซ้อนทับของเวลาอย่างถูกต้อง (Overlap Formula):
  ```ts
  export function isTimeRangeOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
    return startA < endB && endA > startB;
  }
  ```
- **Dynamic QR Code:** ระบบสร้าง Dynamic QR Code สำหรับแสดงต่อเจ้าหน้าที่ดูแลยานพาหนะตอนตรวจรับกุญแจรถยนต์ราชการ

---

## 7. มาตรฐานการทดสอบระบบอัตโนมัติ (Automated Testing with Playwright)

### 7.1 การทดสอบโดยไม่ต้องป้อนรหัสผ่านซ้ำ (Pre-injected Auth Session)
ในชุดทดสอบ Playwright (`tests/*.spec.ts`) ให้จำลองการยืนยันตัวตนด้วยการฉีด Session เข้า `localStorage` ก่อนโหลดหน้าเว็บ:
```ts
await context.addInitScript(() => {
  const session = JSON.stringify({
    user: { id: "usr_2", name: "นายเสกพล ดิษฐโชติ", role: "manager", division: "ฝ่ายบริหารทั่วไป" },
    loginTime: "08:30 น.",
    rememberMe: true
  });
  localStorage.setItem("smartmso_auth_session", session);
});
```

### 7.2 คำสั่งรันการทดสอบและข้อกำหนดการส่งมอบงาน
- รันชุดทดสอบทั้งหมด: `npm test`
- รันแบบเปิดหน้าจอ: `npm run test:headed`
- ผลิต Production Build ตรวจสอบความถูกต้อง: `npm run build` (ต้องผ่าน 0 Error)
- **Clean Workspace Rule:** ห้าม commit หรือปล่อยไฟล์ screenshot `.png` และโฟลเดอร์ `test-results/` ตกค้างใน Root Directory
