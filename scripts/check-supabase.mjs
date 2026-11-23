import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tables = [
  { name: 'users', label: 'ทำเนียบบุคลากร (Users)' },
  { name: 'vehicles', label: 'รถยนต์ราชการส่วนกลาง (Vehicles)' },
  { name: 'car_bookings', label: 'คำขอจองรถราชการ (Car Bookings)' },
  { name: 'access_requests', label: 'คำขอสิทธิ์เข้าใช้งาน (Access Requests)' },
  { name: 'chat_channels', label: 'ห้องแชทตามกลุ่มงาน (Chat Channels)' },
  { name: 'messages', label: 'ข้อความแชทและเอกสาร (Messages)' },
  { name: 'audit_logs', label: 'ประวัติกิจกรรมระบบ (Audit Logs)' }
];

async function check() {
  console.log("=================================================");
  console.log("🔍 ตรวจสอบสถานะตารางและข้อมูลบน Live Supabase Cloud");
  console.log(`🌐 Project URL: ${SUPABASE_URL}`);
  console.log("=================================================");
  
  let allHealthy = true;

  for (const t of tables) {
    try {
      const { data, error, count } = await supabase
        .from(t.name)
        .select('*', { count: 'exact' });
        
      if (error) {
        allHealthy = false;
        if (error.code === 'PGRST205') {
          console.log(`❌ [${t.name}] ${t.label}: ยังไม่มีตารางในฐานข้อมูล (ต้องรัน schema.sql ใน SQL Editor)`);
        } else {
          console.log(`⚠️ [${t.name}] ${t.label}: Error [${error.code}] ${error.message}`);
        }
      } else {
        const rowCount = count ?? (data ? data.length : 0);
        console.log(`✅ [${t.name}] ${t.label}: มีตารางแล้ว — พบ ${rowCount} รายการ`);
      }
    } catch (err) {
      allHealthy = false;
      console.log(`⚠️ [${t.name}] Exception: ${err.message}`);
    }
  }

  console.log("=================================================");
  if (!allHealthy) {
    console.log("📌 คำแนะนำ: กรุณานำเนื้อหาใน supabase/schema.sql ไปรันใน Supabase SQL Editor");
    console.log("   URL: https://supabase.com/dashboard/project/xkeiuyhkokmecefzzynb/sql");
  } else {
    console.log("🎉 ข้อมูลและตารางบน Supabase สมบูรณ์ครบถ้วน 100%");
  }
  console.log("=================================================");
}

check();
