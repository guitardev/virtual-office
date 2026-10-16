---
name: synology
description: Expert guide and best practices for Synology DSM WebAPI, File Station DMS, Synology Photos (DSM 7+), session sanitization, and resilient file upload handling in Next.js.
---

# Synology NAS WebAPI Integration Best Practices

คู่มือและข้อกำหนดทางเทคนิคสำหรับการพัฒนา เชื่อมต่อ และแก้ปัญหา Synology DSM WebAPI ในระบบ Smart MSO / Virtual Office

## 1. กฎการอัปโหลดไฟล์ผ่าน `SYNO.FileStation.Upload`
- **URL Query Parameters:** ต้องระบุ `api=SYNO.FileStation.Upload&version=2&method=upload&_sid=...` ใน URL Query String ของ `entry.cgi` เสมอ เพื่อให้ DSM Web Dispatcher ส่งคำขอไปยัง C++ Upload Handler ได้ทันทีโดยไม่ต้องรอ Parse Binary Body
- **Multipart Form Fields:**
  - `path`: โฟลเดอร์ปลายทาง (ขึ้นต้นด้วย `/` เสมอ เช่น `/virtual-office` หรือ `/photo/General`)
  - `create_parents`: `"true"`
  - `overwrite`: `"true"`
  - `file`: **ต้องวางไว้เป็นลำดับสุดท้าย (Last Field) ใน FormData เสมอ**

## 2. การป้องกัน Null Session Serialization
- ใน JavaScript `formData.append("sid", userSid)` หาก `userSid` เป็น `null` จะถูกแปลงเป็นสตริงตัวอักษร `"null"` โดยอัตโนมัติ
- Backend Route ต้องมีตัวคัดกรอง:
  ```ts
  const rawSid = formData.get("sid") as string | null;
  const sid = rawSid && rawSid !== "null" && rawSid !== "undefined" && rawSid.trim() !== "" ? rawSid.trim() : null;
  ```
- หากตรวจพบ Code 119 หรือไม่มี Session ให้ตอบกลับ HTTP 401 พร้อมแฟล็ก `requireAuth: true`
- ฝั่ง Frontend เมื่อตรวจพบ Code 119 หรือ `requireAuth: true` ให้เรียก `clearUserNasSid()`, รีเซ็ต state เป็น `null` และเปิด Modal ให้ผู้ใช้กรอกรหัสผ่านเพื่อเชื่อมต่อใหม่ทันที

## 3. สิทธิ์โฟลเดอร์และการกู้คืนอัตโนมัติ (Folder Permission & Recovery)
- **Synology Photos Shared Space (`/photo`):** ผู้ใช้ทั่วไปมักไม่มีสิทธิ์เขียนไฟล์ที่ Root `/photo` ตรงๆ หากเกิดสิทธิ์ขัดข้อง (Code 401/403/404/406/1804) ให้ระบบ Auto-fallback ไปอัปโหลดที่ `/photo/General`
- **Synology Photos Personal Space (`/home/Photos`):** หากผู้ใช้ยังไม่มีโฟลเดอร์ ให้เรียก `SYNO.FileStation.CreateFolder` พร้อมพารามิเตอร์ `force_parent=true` เพื่อสร้างโฟลเดอร์ก่อนอัปโหลด
- **Chat Attachments (`/chat_attachments`):** หากโฟลเดอร์ Root ไม่มีอยู่ ให้ Fallback ไปยัง `/virtual-office/chat_attachments`

## 4. การจัดการ Drag & Drop บน UI
- ใช้เทคนิค `dragCounter` (นับจำนวน Drag Enter/Leave) เพื่อป้องกันปัญหาภาพ Overlay กระพริบเมื่อเมาส์เลื่อนผ่าน Child elements
- คัดกรองประเภทไฟล์ตามหน้าที่ (รูปภาพ/วิดีโอสำหรับคลังภาพ, เอกสารราชการสำหรับ DMS)

## 5. การจัดการข้อจำกัดขนาดไฟล์บน Serverless Cloud (HTTP 413 & Image Compression)
- **ปัญหา Payload Limit บน Vercel/Serverless:** API Routes บนแพลตฟอร์มคลาวด์มีข้อจำกัด Request Payload สูงสุดที่ **4.5 MB** หากส่งไฟล์ขนาดใหญ่ (เช่น ภาพจากกล้องสมาร์ตโฟน 5-20MB หรือวิดีโอ) จะถูกคลาวด์ปฏิเสธด้วยข้อผิดพลาด `HTTP 413: Request Entity Too Large FUNCTION_PAYLOAD_TOO_LARGE`
- **แนวทางป้องกันและแก้ไข:**
  1. **Client-side Image Optimization (`compressImageForUpload`):**
     - ก่อนส่งข้อมูลขึ้น NAS หากเป็นไฟล์ภาพและมีขนาดเกิน 3.5 MB ให้ระบบบีบอัดและปรับขนาดภาพอัตโนมัติผ่าน HTML5 Canvas โดยควบคุมด้านที่ยาวที่สุดไม่เกิน 2560px (2K QHD) ด้วย JPEG Quality 0.88
     - ช่วยลดขนาดภาพถ่ายจาก 10-25 MB ลงเหลือ 1.5 - 2.8 MB ได้อย่างรวดเร็วโดยยังคงความคมชัดสูงสำหรับคลังภาพราชการ และไม่เกินขีดจำกัด 4.5 MB
  2. **Pre-flight Size Guard (`MAX_SERVERLESS_UPLOAD_SIZE = 4.0 MB`):**
     - ตรวจสอบขนาดไฟล์ก่อนส่งคำขอไปยัง `/api/nas/upload` เสมอ หากเป็นไฟล์วิดีโอหรือเอกสารที่ไม่สามารถบีบอัดได้และมีขนาดเกิน 4.0 MB ให้แจ้งเตือนแนะนำผู้ใช้อย่างสุภาพก่อนส่งคำขอ
  3. **Sanitization ใน `safeParseJsonResponse`:**
     - ดักจับรหัส HTTP 413 หรือสตริง `FUNCTION_PAYLOAD_TOO_LARGE` และแปลงเป็นข้อความแนะนำภาษาไทยที่เข้าใจง่าย พร้อมตัดสตริงระบบเซิร์ฟเวอร์ (เช่น `sin1::...`) ออกทั้งหมด

