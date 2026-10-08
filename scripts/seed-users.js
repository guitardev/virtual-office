import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xkeiuyhkokmecefzzynb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrZWl1eWhrb2ttZWNlZnp6eW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MzQ3MTUsImV4cCI6MjEwNzAxMDcxNX0.7div3L9oRW0sj8yN0znYMNVvP2qcX0QRen1JdFCUnUQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const usersToSeed = [
  {
    id: "usr_2",
    prefix: "นาย",
    first_name: "เสกพล",
    last_name: "ดิษฐโชติ",
    name: "นายเสกพล ดิษฐโชติ",
    nickname: "เสก",
    personnel_type: "ข้าราชการ",
    position: "นักพัฒนาสังคมชำนาญการ (หัวหน้าฝ่ายบริหารทั่วไป)",
    division: "ฝ่ายบริหารทั่วไป",
    email: "sekpol.d@m-society.go.th",
    phone: "055-705031 ต่อ 102",
    line_id: "sek_kpp",
    avatar_url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/12/2b6d8e58-bfd5-44a7-a18d-4fb8e685452f-e1734057934925.png",
    role: "manager",
    status: "active"
  },
  {
    id: "usr_3",
    prefix: "นาย",
    first_name: "วรวุฒิ",
    last_name: "พึ่งพัก",
    name: "นายวรวุฒิ พึ่งพัก",
    nickname: "เจมส์",
    personnel_type: "ข้าราชการ",
    position: "นักพัฒนาสังคมชำนาญการพิเศษ (หัวหน้ากลุ่มการพัฒนาสังคมและสวัสดิการ)",
    division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    email: "worawut.p@m-society.go.th",
    phone: "055-705031 ต่อ 104",
    line_id: "james_kpp",
    avatar_url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/e735d8a3-9afc-4271-803e-0438ae7cb5371-1-1-e1731912123637.png",
    role: "manager",
    status: "active"
  },
  {
    id: "usr_4",
    prefix: "นาย",
    first_name: "พนมศักย์",
    last_name: "บริภัทรจิรากร",
    name: "นายพนมศักย์ บริภัทรจิรากร",
    nickname: "บอย",
    personnel_type: "ข้าราชการ",
    position: "นักพัฒนาสังคมชำนาญการ (รักษาการหัวหน้ากลุ่มนโยบายและวิชาการ)",
    division: "กลุ่มนโยบายและวิชาการ",
    email: "phanomsak.b@m-society.go.th",
    phone: "055-705031 ต่อ 103",
    line_id: "boy_kpp",
    avatar_url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/%E0%B8%9E%E0%B8%B5%E0%B9%88%E0%B8%94%E0%B8%B2%E0%B8%A7-1-1-e1734061864108.png",
    role: "manager",
    status: "active"
  },
  {
    id: "usr_5",
    prefix: "นางสาว",
    first_name: "ขวัญนภา",
    last_name: "ศิริสมบัติ",
    name: "นางสาวขวัญนภา ศิริสมบัติ",
    nickname: "ขวัญ",
    personnel_type: "พนักงานราชการ",
    position: "เจ้าหน้าที่ระบบงานคอมพิวเตอร์",
    division: "กลุ่มนโยบายและวิชาการ",
    email: "kwannapa.s@m-society.go.th",
    phone: "055-705031 ต่อ 106",
    line_id: "kwan_kpp",
    avatar_url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/a864cd1c-9230-490f-b838-5f62aa24bfca-e1732079225217.png",
    role: "member",
    status: "active"
  },
  {
    id: "usr_6",
    prefix: "นางสาว",
    first_name: "สุมาลี",
    last_name: "แสงแก้ว",
    name: "นางสาวสุมาลี แสงแก้ว",
    nickname: "ส้ม",
    personnel_type: "พนักงานกองทุน",
    position: "นักสังคมสงเคราะห์ (เจ้าหน้าที่กองทุนส่งเสริมและพัฒนาคุณภาพชีวิตคนพิการ)",
    division: "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
    email: "sumalee.s@m-society.go.th",
    phone: "055-705031 ต่อ 107",
    line_id: "som_kpp",
    avatar_url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/e69828cb-560e-4c87-a197-91e98179257a-e1732768762731.png",
    role: "member",
    status: "active"
  },
  {
    id: "usr_7",
    prefix: "นางสาว",
    first_name: "พิชชาภา",
    last_name: "ห้าวหาญ",
    name: "นางสาวพิชชาภา ห้าวหาญ",
    nickname: "ญาญ่า",
    personnel_type: "ข้าราชการ",
    position: "นักสังคมสงเคราะห์ปฏิบัติการ",
    division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    email: "pitchapa.h@m-society.go.th",
    phone: "055-705031 ต่อ 108",
    line_id: "yaya_kpp",
    avatar_url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/12/88a864d8-a374-4867-87c8-4daa2671153e-e1734057993409.png",
    role: "member",
    status: "active"
  },
  {
    id: "usr_8",
    prefix: "นางสาว",
    first_name: "อารีวรรณ",
    last_name: "ประเสริฐอุดมศักดิ์",
    name: "นางสาวอารีวรรณ ประเสริฐอุดมศักดิ์",
    nickname: "ดาว",
    personnel_type: "ข้าราชการ",
    position: "เจ้าพนักงานการเงินและบัญชีชำนาญงาน (การเงินและบัญชี)",
    division: "ฝ่ายบริหารทั่วไป",
    email: "areewan.p@m-society.go.th",
    phone: "055-705031 ต่อ 109",
    line_id: "dao_kpp",
    avatar_url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/%E0%B8%9E%E0%B8%99%E0%B8%A1%E0%B8%A8%E0%B8%B1%E0%B8%81%E0%B8%A2%E0%B9%8C-%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%A0%E0%B8%B1%E0%B8%97%E0%B8%A3%E0%B8%88%E0%B8%B4%E0%B8%A3%E0%B8%B2%E0%B8%81%E0%B8%A3-1-e1734061426233.png",
    role: "member",
    status: "active"
  },
  {
    id: "usr_9",
    prefix: "นาย",
    first_name: "สมหมาย",
    last_name: "มั่นคง",
    name: "นายสมหมาย มั่นคง",
    nickname: "หมาย",
    personnel_type: "ลูกจ้างประจำ",
    position: "พนักงานขับรถยนต์ ชำนาญงาน (งานยานพาหนะ)",
    division: "ฝ่ายบริหารทั่วไป",
    email: "sommai.m@m-society.go.th",
    phone: "055-705031 ต่อ 110",
    line_id: "sommai_van",
    avatar_url: null,
    role: "member",
    status: "active"
  },
  {
    id: "usr_10",
    prefix: "นาย",
    first_name: "ธีรพัฒน์",
    last_name: "บุญยืน",
    name: "นายธีรพัฒน์ บุญยืน",
    nickname: "อาร์ม",
    personnel_type: "พนักงานจ้างเหมาบริการ",
    position: "เจ้าหน้าที่สนับสนุนงานสารบรรณและเทคโนโลยีดิจิทัล",
    division: "ฝ่ายบริหารทั่วไป",
    email: "theerapat.b@m-society.go.th",
    phone: "055-705031 ต่อ 111",
    line_id: "arm_kpp",
    avatar_url: null,
    role: "member",
    status: "active"
  },
  {
    id: "usr_11",
    prefix: "ดร.",
    first_name: "ศรัณย์",
    last_name: "สิทธิโชค",
    name: "ดร. ศรัณย์ สิทธิโชค",
    nickname: "รัน",
    personnel_type: "ที่ปรึกษา/ผู้ทรงคุณวุฒิ",
    position: "ผู้ทรงคุณวุฒิด้านสวัสดิการสังคม (คณะอนุกรรมการฟื้นฟูสมรรถภาพคนพิการ)",
    division: "คณะทำงานที่ปรึกษาและภาคีเครือข่ายภายนอก",
    email: "saran.s@socialadvisor.org",
    phone: "089-854-1234",
    line_id: "dr_saran",
    avatar_url: null,
    role: "guest",
    status: "active"
  }
];

async function seed() {
  console.log("Starting to seed users usr_2 through usr_11 to Supabase...");
  const { data, error } = await supabase
    .from('users')
    .upsert(usersToSeed, { onConflict: 'id' })
    .select();

  if (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  } else {
    console.log("Successfully seeded users! Count:", data ? data.length : 0);
    process.exit(0);
  }
}

seed();
