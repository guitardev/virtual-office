# Synology NAS Security & Endpoint Masking Invariants

เมื่อเขียนหรือแก้ไขโค้ดที่เกี่ยวข้องกับระบบ Synology NAS (ทั้งฝั่ง Client UI และ Server Proxy Routes) ต้องปฏิบัติตามกฎความปลอดภัยอย่างเคร่งครัด:

1. **ห้ามเปิดเผย NAS URL หรือหมายเลข IP บน Client-facing UI:**
   - ห้ามแสดง `nas.smso.site` หรือ `192.168.162.21:5000` ในหน้าต่าง UI, ข้อความแจ้งเตือน (Toasts), ป้ายกำกับ (Badges), Tooltips หรือข้อความ Error
   - ให้แสดงผลเป็นระดับความปลอดภัยแทน เช่น `🛡️ โหมดจัดเก็บความปลอดภัยสูง (Protected)` หรือ `🟢 ออนไลน์ (Online)`

2. **Sanitize ข้อมูลจาก Health API:**
   - การตอบสนองของ `/api/nas/health` ต้องแปลงฟิลด์ `host` และ `port` ให้เป็นป้ายความปลอดภัย (`Cloudflare Zero Trust (Secured)` หรือ `Office LAN (Secured)`) เสมอ

3. **กรอง Error Messages:**
   - ดักกรอง URL และ IP ออกจาก Error Message ด้วย Regex `replace(/https?:\/\/[^\s]+/g, "เซิร์ฟเวอร์ NAS")` ก่อนส่งไปแสดงผลบนหน้าจอ
