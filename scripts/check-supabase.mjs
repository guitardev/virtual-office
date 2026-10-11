import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xkeiuyhkokmecefzzynb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrZWl1eWhrb2ttZWNlZnp6eW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MzQ3MTUsImV4cCI6MjEwNzAxMDcxNX0.7div3L9oRW0sj8yN0znYMNVvP2qcX0QRen1JdFCUnUQ";

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
