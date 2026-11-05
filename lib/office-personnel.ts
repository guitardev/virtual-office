/**
 * Official Personnel Directory - Kamphaeng Phet Provincial Social Development and Human Security Office
 * ทำเนียบข้าราชการและเจ้าหน้าที่ สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ข้อมูลทางการ)
 */

import { Member } from "./types";

export interface OfficialStaffMember extends Member {
  nickname?: string;
  phoneExt?: string;
  duty?: string;
}

/**
 * ผู้บริหารสูงสุด: พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
 */
export const PROVINCIAL_DIRECTOR: OfficialStaffMember = {
  id: "usr_1",
  prefix: "นางสาว",
  firstName: "มะลิวัน",
  lastName: "สิทธิโยธี",
  name: "นางสาวมะลิวัน สิทธิโยธี",
  nickname: "มะลิ",
  personnelType: "ข้าราชการ",
  position: "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
  division: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)",
  department: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
  email: "maliwan.s@m-society.go.th",
  phone: "055-705031 ต่อ 101",
  phoneExt: "101",
  lineId: "maliwan_kpp",
  role: "admin",
  status: "active",
  avatarUrl: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/%E0%B8%99%E0%B8%B2%E0%B8%87%E0%B8%AA%E0%B8%B2%E0%B8%A7%E0%B8%A1%E0%B8%B0%E0%B8%A5%E0%B8%B4%E0%B8%A7%E0%B8%B1%E0%B8%99-%E0%B8%AA%E0%B8%B4%E0%B8%97%E0%B8%98%E0%B8%B4%E0%B9%82%E0%B8%A2%E0%B8%98%E0%B8%B5.png",
  avatarText: "มล",
  joinedDate: "1 ต.ค. 2564",
  duty: "ผู้บริหารระดับสูง กำกับดูแลและบริหารราชการสำนักงาน พมจ.กำแพงเพชร ทั้งหมด",
};

/**
 * ทำเนียบข้าราชการ พนักงานราชการ และเจ้าหน้าที่ พมจ.กำแพงเพชร ทุกกลุ่มงาน
 */
export const OFFICIAL_OFFICE_PERSONNEL: OfficialStaffMember[] = [
  PROVINCIAL_DIRECTOR,
  {
    id: "usr_2",
    prefix: "นาย",
    firstName: "เสกพล",
    lastName: "ดิษฐโชติ",
    name: "นายเสกพล ดิษฐโชติ",
    nickname: "เสก",
    personnelType: "ข้าราชการ",
    position: "นักพัฒนาสังคมชำนาญการ (หัวหน้าฝ่ายบริหารทั่วไป)",
    division: "ฝ่ายบริหารทั่วไป",
    department: "ฝ่ายบริหารทั่วไป",
    email: "sekpol.d@m-society.go.th",
    phone: "055-705031 ต่อ 102",
    phoneExt: "102",
    lineId: "sek_kpp",
    role: "manager",
    status: "active",
    avatarUrl: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/12/2b6d8e58-bfd5-44a7-a18d-4fb8e685452f-e1734057934925.png",
    avatarText: "สพ",
    joinedDate: "1 ม.ค. 2565",
    duty: "หัวหน้าฝ่ายบริหารทั่วไป ดูแลงานสารบรรณ พัสดุ การเงิน ยานพาหนะ และอาคารสถานที่",
  },
  {
    id: "usr_3",
    prefix: "นาย",
    firstName: "วรวุฒิ",
    lastName: "พึ่งพัก",
    name: "นายวรวุฒิ พึ่งพัก",
    nickname: "เจมส์",
    personnelType: "ข้าราชการ",
    position: "นักพัฒนาสังคมชำนาญการพิเศษ (หัวหน้ากลุ่มการพัฒนาสังคมและสวัสดิการ)",
    division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    department: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    email: "worawut.p@m-society.go.th",
    phone: "055-705031 ต่อ 104",
    phoneExt: "104",
    lineId: "james_kpp",
    role: "manager",
    status: "active",
    avatarUrl: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/e735d8a3-9afc-4271-803e-0438ae7cb5371-1-1-e1731912123637.png",
    avatarText: "วว",
    joinedDate: "1 พ.ค. 2564",
    duty: "หัวหน้ากลุ่มการพัฒนาสังคมและสวัสดิการ ขับเคลื่อนงานสวัสดิการสังคม กลุ่มเปราะบาง และเด็ก เยาวชน สตรี ผู้สูงอายุ",
  },
  {
    id: "usr_4",
    prefix: "นาย",
    firstName: "พนมศักย์",
    lastName: "บริภัทรจิรากร",
    name: "นายพนมศักย์ บริภัทรจิรากร",
    nickname: "บอย",
    personnelType: "ข้าราชการ",
    position: "นักพัฒนาสังคมชำนาญการ (รักษาการหัวหน้ากลุ่มนโยบายและวิชาการ)",
    division: "กลุ่มนโยบายและวิชาการ",
    department: "กลุ่มนโยบายและวิชาการ",
    email: "phanomsak.b@m-society.go.th",
    phone: "055-705031 ต่อ 103",
    phoneExt: "103",
    lineId: "boy_kpp",
    role: "manager",
    status: "active",
    avatarUrl: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/%E0%B8%9E%E0%B8%B5%E0%B9%88%E0%B8%94%E0%B8%B2%E0%B8%A7-1-1-e1734061864108.png",
    avatarText: "พศ",
    joinedDate: "15 ส.ค. 2564",
    duty: "รักษาการหัวหน้ากลุ่มนโยบายและวิชาการ วางแผนยุทธศาสตร์ แผนปฏิบัติราชการ และตัวชี้วัด กพร. พมจ.",
  },
  {
    id: "usr_5",
    prefix: "นางสาว",
    firstName: "ขวัญนภา",
    lastName: "ศิริสมบัติ",
    name: "นางสาวขวัญนภา ศิริสมบัติ",
    nickname: "ขวัญ",
    personnelType: "พนักงานราชการ",
    position: "เจ้าหน้าที่ระบบงานคอมพิวเตอร์",
    division: "กลุ่มนโยบายและวิชาการ",
    department: "กลุ่มนโยบายและวิชาการ",
    email: "kwannapa.s@m-society.go.th",
    phone: "055-705031 ต่อ 106",
    phoneExt: "106",
    lineId: "kwan_kpp",
    role: "member",
    status: "active",
    avatarUrl: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/a864cd1c-9230-490f-b838-5f62aa24bfca-e1732079225217.png",
    avatarText: "ขน",
    joinedDate: "1 ต.ค. 2565",
    duty: "บริหารจัดการระบบสารสนเทศ เครือข่ายคอมพิวเตอร์ ฐานข้อมูล และศูนย์ดิจิทัล พมจ.",
  },
  {
    id: "usr_6",
    prefix: "นางสาว",
    firstName: "สุมาลี",
    lastName: "แสงแก้ว",
    name: "นางสาวสุมาลี แสงแก้ว",
    nickname: "ส้ม",
    personnelType: "พนักงานกองทุน",
    position: "นักสังคมสงเคราะห์ (เจ้าหน้าที่กองทุนส่งเสริมและพัฒนาคุณภาพชีวิตคนพิการ)",
    division: "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
    department: "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
    email: "sumalee.s@m-society.go.th",
    phone: "055-705031 ต่อ 107",
    phoneExt: "107",
    lineId: "som_kpp",
    role: "member",
    status: "active",
    avatarUrl: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/e69828cb-560e-4c87-a197-91e98179257a-e1732768762731.png",
    avatarText: "สม",
    joinedDate: "15 พ.ย. 2564",
    duty: "บริหารจัดการงานศูนย์บริการคนพิการ เงินกู้ยืมประกอบอาชีพ และกายอุปกรณ์",
  },
  {
    id: "usr_7",
    prefix: "นางสาว",
    firstName: "พิชชาภา",
    lastName: "ห้าวหาญ",
    name: "นางสาวพิชชาภา ห้าวหาญ",
    nickname: "ญาญ่า",
    personnelType: "ข้าราชการ",
    position: "นักสังคมสงเคราะห์ปฏิบัติการ",
    division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    department: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    email: "pitchapa.h@m-society.go.th",
    phone: "055-705031 ต่อ 108",
    phoneExt: "108",
    lineId: "yaya_kpp",
    role: "member",
    status: "active",
    avatarUrl: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/12/88a864d8-a374-4867-87c8-4daa2671153e-e1734057993409.png",
    avatarText: "พช",
    joinedDate: "1 ธ.ค. 2565",
    duty: "ลงพื้นที่ประเมินสังคมสงเคราะห์ ช่วยเหลือครอบครัวเปราะบาง และเด็กแรกเกิด",
  },
  {
    id: "usr_8",
    prefix: "นางสาว",
    firstName: "อารีวรรณ",
    lastName: "ประเสริฐอุดมศักดิ์",
    name: "นางสาวอารีวรรณ ประเสริฐอุดมศักดิ์",
    nickname: "ดาว",
    personnelType: "ข้าราชการ",
    position: "เจ้าพนักงานการเงินและบัญชีชำนาญงาน (การเงินและบัญชี)",
    division: "ฝ่ายบริหารทั่วไป",
    department: "ฝ่ายบริหารทั่วไป",
    email: "areewan.p@m-society.go.th",
    phone: "055-705031 ต่อ 109",
    phoneExt: "109",
    lineId: "dao_kpp",
    role: "member",
    status: "active",
    avatarUrl: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/%E0%B8%9E%E0%B8%99%E0%B8%A1%E0%B8%A8%E0%B8%B1%E0%B8%81%E0%B8%A2%E0%B9%8C-%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%A0%E0%B8%B1%E0%B8%97%E0%B8%A3%E0%B8%88%E0%B8%B4%E0%B8%A3%E0%B8%B2%E0%B8%81%E0%B8%A3-1-e1734061426233.png",
    avatarText: "อว",
    joinedDate: "1 มี.ค. 2565",
    duty: "บริหารงบประมาณ การเบิกจ่ายเงินงบประมาณแผ่นดิน และระบบ GFMIS",
  },
  {
    id: "usr_9",
    prefix: "นาย",
    firstName: "สมหมาย",
    lastName: "มั่นคง",
    name: "นายสมหมาย มั่นคง",
    nickname: "หมาย",
    personnelType: "ลูกจ้างประจำ",
    position: "พนักงานขับรถยนต์ ชำนาญงาน (งานยานพาหนะ)",
    division: "ฝ่ายบริหารทั่วไป",
    department: "ฝ่ายบริหารทั่วไป",
    email: "sommai.m@m-society.go.th",
    phone: "055-705031 ต่อ 110",
    phoneExt: "110",
    lineId: "sommai_van",
    role: "member",
    status: "active",
    avatarUrl: "",
    avatarText: "สม",
    joinedDate: "1 ม.ค. 2555",
    duty: "งานยานพาหนะส่วนกลาง ขับรถยนต์ราชการนำคณะเจ้าหน้าที่ลงพื้นที่ตรวจราชการ 11 อำเภอ",
  },
  {
    id: "usr_10",
    prefix: "นาย",
    firstName: "ธีรพัฒน์",
    lastName: "บุญยืน",
    name: "นายธีรพัฒน์ บุญยืน",
    nickname: "อาร์ม",
    personnelType: "พนักงานจ้างเหมาบริการ",
    position: "เจ้าหน้าที่สนับสนุนงานสารบรรณและเทคโนโลยีดิจิทัล",
    division: "ฝ่ายบริหารทั่วไป",
    department: "ฝ่ายบริหารทั่วไป",
    email: "theerapat.b@m-society.go.th",
    phone: "055-705031 ต่อ 111",
    phoneExt: "111",
    lineId: "arm_kpp",
    role: "member",
    status: "active",
    avatarUrl: "",
    avatarText: "ธพ",
    joinedDate: "1 ต.ค. 2566",
    duty: "สนับสนุนงานสารบรรณอิเล็กทรอนิกส์ e-Document และระบบสำนักงานเสมือนจริง",
  },
  {
    id: "usr_11",
    prefix: "ดร.",
    firstName: "ศรัณย์",
    lastName: "สิทธิโชค",
    name: "ดร. ศรัณย์ สิทธิโชค",
    nickname: "รัน",
    personnelType: "ที่ปรึกษา/ผู้ทรงคุณวุฒิ",
    position: "ผู้ทรงคุณวุฒิด้านสวัสดิการสังคม (คณะอนุกรรมการฟื้นฟูสมรรถภาพคนพิการ)",
    division: "คณะทำงานที่ปรึกษาและภาคีเครือข่ายภายนอก",
    department: "คณะทำงานที่ปรึกษาและภาคีเครือข่ายภายนอก",
    email: "saran.s@socialadvisor.org",
    phone: "089-854-1234",
    phoneExt: "สายตรง",
    lineId: "dr_saran",
    role: "guest",
    status: "active",
    avatarUrl: "",
    avatarText: "ศร",
    joinedDate: "1 ม.ค. 2566",
    duty: "ให้คำปรึกษาทางวิชาการและการจัดทำแผนยุทธศาสตร์สวัสดิการสังคมจังหวัด",
  },
];

/**
 * ดึงรายชื่อบุคลากรประจำกลุ่มงาน/ฝ่าย
 */
export function getPersonnelByDivision(divisionName: string): OfficialStaffMember[] {
  if (!divisionName) return [];
  const clean = divisionName.trim();
  return OFFICIAL_OFFICE_PERSONNEL.filter(
    (m) =>
      m.division.includes(clean) ||
      clean.includes(m.division) ||
      (m.department && (m.department.includes(clean) || clean.includes(m.department)))
  );
}

/**
 * ดึงหัวหน้ากลุ่มงาน/ฝ่ายตามรหัสกลุ่มงาน
 */
export function getDivisionHeadByGroupId(groupId: string): OfficialStaffMember | null {
  if (groupId === "admin") {
    return OFFICIAL_OFFICE_PERSONNEL.find((m) => m.id === "usr_2") || null;
  }
  if (groupId === "welfare") {
    return OFFICIAL_OFFICE_PERSONNEL.find((m) => m.id === "usr_3") || null;
  }
  if (groupId === "policy") {
    return OFFICIAL_OFFICE_PERSONNEL.find((m) => m.id === "usr_4") || null;
  }
  if (groupId === "pwd") {
    return OFFICIAL_OFFICE_PERSONNEL.find((m) => m.id === "usr_6") || null;
  }
  return null;
}

