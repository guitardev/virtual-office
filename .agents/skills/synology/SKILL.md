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
