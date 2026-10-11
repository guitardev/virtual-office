import { Vehicle, CarBookingRequest } from "./types";

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: "veh_1",
    name: "Toyota Commuter 3.0 D4D",
    licensePlate: "นข 4589 กำแพงเพชร",
    category: "รถตู้ส่วนกลาง",
    capacity: 12,
    driverName: "นายสมชาย มั่นคง",
    fuelType: "ดีเซล B7",
    status: "available",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
    mileage: 142580,
    fuelLevel: "เต็มถัง (100%)",
    lastMaintenanceDate: "15 ก.ย. 2569",
    insuranceExpiry: "31 ธ.ค. 2569",
    assignedDivision: "ฝ่ายบริหารทั่วไป (ส่วนกลาง)",
    features: ["12 ที่นั่ง", "แอร์ไมโครบัสแยกหน้า-หลัง", "เข็มขัดนิรภัยทุกที่นั่ง", "GPS ติดตามรถ"],
  },
  {
    id: "veh_2",
    name: "Toyota Hilux Revo Double Cab 4WD",
    licensePlate: "กค 7812 กำแพงเพชร",
    category: "รถกระบะตรวจการณ์",
    capacity: 5,
    driverName: "นายบุญส่ง ชื่นใจ",
    fuelType: "ดีเซล B7",
    status: "available",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
    mileage: 89340,
    fuelLevel: "3/4 ถัง (75%)",
    lastMaintenanceDate: "28 ส.ค. 2569",
    insuranceExpiry: "31 มี.ค. 2570",
    assignedDivision: "ฝ่ายบริหารทั่วไป (ตรวจการณ์)",
    features: ["5 ที่นั่ง", "ขับเคลื่อน 4 ล้อ", "ยกสูง ลุยพื้นที่ทุรกันดาร", "กระบะบรรทุกอุปกรณ์"],
  },
  {
    id: "veh_3",
    name: "Honda CR-V e:HEV RS",
    licensePlate: "กข 9210 กำแพงเพชร",
    category: "รถยนต์นั่งส่วนบุคคล",
    capacity: 5,
    driverName: "ขับขี่เอง / พนักงานขับรถเวร",
    fuelType: "เบนซิน ไฮบริด (E20)",
    status: "available",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80",
    mileage: 45210,
    fuelLevel: "เต็มถัง (100%)",
    lastMaintenanceDate: "10 ก.ย. 2569",
    insuranceExpiry: "15 พ.ค. 2570",
    assignedDivision: "ฝ่ายบริหารทั่วไป (ภารกิจด่วน)",
    features: ["5 ที่นั่ง", "ไฮบริดประหยัดพลังงาน", "ระบบ Honda SENSING", "ภารกิจด่วน"],
  },
  {
    id: "veh_4",
    name: "Toyota Majesty 2.8 Premium VIP",
    licensePlate: "นง 1122 กำแพงเพชร",
    category: "รถตู้ VIP ผู้บริหาร",
    capacity: 7,
    driverName: "นายอนุชา พลแสน",
    fuelType: "ดีเซล พรีเมียม",
    status: "available",
    image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
    mileage: 28150,
    fuelLevel: "3/4 ถัง (75%)",
    lastMaintenanceDate: "5 ต.ค. 2569",
    insuranceExpiry: "30 มิ.ย. 2570",
    assignedDivision: "สำนักงาน พมจ. (รับรองผู้บริหาร)",
    features: ["7 ที่นั่ง Captain Seats", "โต๊ะทำงานปรับระดับ", "ม่านบังแดดรอบคัน", "รับรองผู้บริหาร/ผู้ว่าฯ"],
  },
  {
    id: "veh_5",
    name: "Isuzu D-Max Spacecab 1.9 Ddi",
    licensePlate: "บท 3456 กำแพงเพชร",
    category: "รถกระบะบรรทุก",
    capacity: 2,
    driverName: "นายประเสริฐ ยิ้มแย้ม",
    fuelType: "ดีเซล B7",
    status: "in_use",
    image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=800&q=80",
    mileage: 195420,
    fuelLevel: "1/2 ถัง (50%)",
    lastMaintenanceDate: "12 ก.ค. 2569",
    insuranceExpiry: "28 ก.พ. 2570",
    assignedDivision: "ฝ่ายบริหารทั่วไป (งานส่งของ/พัสดุ)",
    features: ["2 ที่นั่ง", "คอกสแตนเลสบรรทุก", "ขนย้ายถุงยังชีพ/สิ่งของพระราชทาน", "รองรับงานหนัก"],
  },
];

export const VEHICLE_IMAGE_PRESETS = [
  {
    title: "รถตู้ส่วนกลาง (Van)",
    url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "รถกระบะตรวจการณ์ (Pickup 4WD)",
    url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "รถยนต์นั่งส่วนบุคคล (SUV / Crossover)",
    url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "รถตู้ VIP ผู้บริหาร (Luxury MPV)",
    url: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "รถกระบะบรรทุก (Cargo Truck)",
    url: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "รถเก๋งซีดานตรวจงาน (Sedan)",
    url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
  },
];


export const GOVERNMENT_DRIVERS = [
  { id: "drv_1", name: "นายสมชาย มั่นคง", phone: "081-234-5601", status: "พร้อมปฏิบัติหน้าที่", license: "ท.2 (ขับขี่สาธารณะ)" },
  { id: "drv_2", name: "นายบุญส่ง ชื่นใจ", phone: "082-345-6702", status: "พร้อมปฏิบัติหน้าที่", license: "ท.2 (ขับขี่สาธารณะ)" },
  { id: "drv_3", name: "นายอนุชา พลแสน", phone: "083-456-7803", status: "พร้อมปฏิบัติหน้าที่", license: "ท.2 (ขับขี่สาธารณะ)" },
  { id: "drv_4", name: "นายประเสริฐ ยิ้มแย้ม", phone: "084-567-8904", status: "ติดภารกิจนอกพื้นที่", license: "ท.2 (ขับขี่สาธารณะ)" },
];

export const INITIAL_BOOKING_REQUESTS: CarBookingRequest[] = [
  {
    id: "req_car_001",
    requestNo: "คข-69/008",
    vehicleId: "veh_2",
    vehicleName: "Toyota Hilux Revo Double Cab 4WD",
    licensePlate: "กค 7812 กำแพงเพชร",
    requesterId: "usr_3",
    requesterName: "นายณัฐพล รัตนพงษ์",
    requesterPosition: "นักพัฒนาสังคมปฏิบัติการ",
    requesterDivision: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    requesterPhone: "083-456-7890",
    purpose: "ลงพื้นที่ตรวจเยี่ยมและประเมินสภาพที่อยู่อาศัยของคนพิการและผู้สูงอายุยากไร้ เพื่อขอรับงบประมาณปรับปรุงสภาพแวดล้อม",
    destination: "ตำบลคลองลานพัฒนา อำเภอคลองลาน จังหวัดกำแพงเพชร",
    origin: "สำนักงาน พมจ.กำแพงเพชร (ศาลากลางจังหวัด)",
    departureTime: "2026-10-12T08:30",
    returnTime: "2026-10-12T16:30",
    passengerCount: 4,
    passengersList: "นายณัฐพล รัตนพงษ์, นายวรวุฒิ พึ่งพัก, นางสาวพิมพ์ใจ ชัยเจริญ, นางสมรักษ์ ธรรมวิมล",
    requireDriver: true,
    fuelBudgetRequested: true,
    fuelBudgetAmount: 1200,
    fuelBudgetSource: "โครงการปรับสภาพแวดล้อมที่อยู่อาศัยคนพิการ",
    status: "pending_review",
    createdAt: "10 ต.ค. 2569 14:20 น.",
    notifications: [
      {
        id: "notif_001",
        timestamp: "10 ต.ค. 2569 14:20 น.",
        type: "request_submitted",
        title: "ยื่นคำขอใช้รถราชการใหม่",
        message: "มีคำขอ คข-69/008 (ปลายทาง: อ.คลองลาน) รอหัวหน้าฝ่ายบริหารทั่วไปตรวจสอบและมอบหมายคนขับ",
        recipientRole: "หัวหน้าฝ่ายบริหารทั่วไป",
        recipientName: "นายเสกพล ดิษฐโชติ",
        channel: "line_notify",
        status: "delivered",
      },
    ],
  },
  {
    id: "req_car_002",
    requestNo: "คข-69/007",
    vehicleId: "veh_1",
    vehicleName: "Toyota Commuter 3.0 D4D",
    licensePlate: "นข 4589 กำแพงเพชร",
    requesterId: "usr_4",
    requesterName: "นางปิยะดา สุขสมบูรณ์",
    requesterPosition: "เจ้าพนักงานธุรการชำนาญงาน",
    requesterDivision: "ฝ่ายบริหารทั่วไป",
    requesterPhone: "084-567-8901",
    purpose: "นำคณะข้าราชการและเจ้าหน้าที่เข้าร่วมประชุมสัมมนาเชิงปฏิบัติการการขับเคลื่อนยุทธศาสตร์การพัฒนาคุณภาพชีวิต",
    destination: "ห้องประชุมซุ้มกอ ชั้น 4 ศาลากลางจังหวัดกำแพงเพชร",
    origin: "สำนักงาน พมจ.กำแพงเพชร",
    departureTime: "2026-10-13T09:00",
    returnTime: "2026-10-13T17:00",
    passengerCount: 8,
    passengersList: "นางปิยะดา สุขสมบูรณ์ และคณะเจ้าหน้าที่ฝ่ายบริหารทั่วไป รวม 8 คน",
    requireDriver: true,
    assignedDriver: "นายสมชาย มั่นคง",
    fuelBudgetRequested: false,
    status: "endorsed",
    createdAt: "9 ต.ค. 2569 11:15 น.",
    managerId: "usr_2",
    managerName: "นายเสกพล ดิษฐโชติ (หัวหน้าฝ่ายบริหารทั่วไป)",
    managerNotes: "ตรวจสอบความพร้อมแล้ว รถตู้ นข 4589 ว่าง และได้มอบหมายนายสมชาย มั่นคง เป็นพนักงานขับรถ เห็นควรเสนอ พมจ. เพื่อโปรดพิจารณาอนุมัติ",
    managerActionAt: "9 ต.ค. 2569 15:30 น.",
    notifications: [
      {
        id: "notif_002_a",
        timestamp: "9 ต.ค. 2569 11:15 น.",
        type: "request_submitted",
        title: "ยื่นคำขอใช้รถใหม่",
        message: "มีคำขอ คข-69/007 (ศาลากลางจังหวัด) รอหัวหน้าฝ่ายบริหารทั่วไปตรวจสอบ",
        recipientRole: "หัวหน้าฝ่ายบริหารทั่วไป",
        recipientName: "นายเสกพล ดิษฐโชติ",
        channel: "line_notify",
        status: "delivered",
      },
      {
        id: "notif_002_b",
        timestamp: "9 ต.ค. 2569 15:30 น.",
        type: "endorsed",
        title: "หัวหน้าฝ่ายเห็นชอบคำขอ",
        message: "คำขอ คข-69/007 ผ่านความเห็นชอบจากหัวหน้าฝ่ายแล้ว เสนอ พมจ. เพื่อโปรดพิจารณาอนุมัติ",
        recipientRole: "พมจ.กำแพงเพชร",
        recipientName: "นางสาวมะลิวัน สิทธิโยธี",
        channel: "line_notify",
        status: "delivered",
      },
    ],
  },
  {
    id: "req_car_003",
    requestNo: "คข-69/006",
    vehicleId: "veh_3",
    vehicleName: "Honda CR-V e:HEV RS",
    licensePlate: "กข 9210 กำแพงเพชร",
    requesterId: "usr_2",
    requesterName: "นางสาวจารุวรรณ ศรีสวัสดิ์",
    requesterPosition: "นักวิชาการสถิติ",
    requesterDivision: "กลุ่มนโยบายและวิชาการ",
    requesterPhone: "082-345-6789",
    purpose: "เดินทางไปประสานงานจัดเก็บข้อมูลสถิติด้านสังคมและจัดทำแผนพัฒนากลุ่มเปราะบางรายครัวเรือน",
    destination: "ที่ว่าการอำเภอขาณุวรลักษบุรี จังหวัดกำแพงเพชร",
    origin: "สำนักงาน พมจ.กำแพงเพชร",
    departureTime: "2026-10-14T08:00",
    returnTime: "2026-10-14T17:30",
    passengerCount: 3,
    passengersList: "นางสาวจารุวรรณ ศรีสวัสดิ์, นายพนมศักย์ บริภัทรจิรากร, นายกิตติศักดิ์ รุ่งโรจน์",
    requireDriver: false,
    assignedDriver: "ขับขี่เองโดยผู้ขอใช้รถ (มีใบอนุญาตขับรถยนต์ส่วนบุคคล)",
    fuelBudgetRequested: true,
    fuelBudgetAmount: 850,
    fuelBudgetSource: "งบดำเนินงานกลุ่มนโยบายและวิชาการ",
    status: "approved",
    createdAt: "8 ต.ค. 2569 09:40 น.",
    managerId: "usr_2",
    managerName: "นายเสกพล ดิษฐโชติ (หัวหน้าฝ่ายบริหารทั่วไป)",
    managerNotes: "เห็นชอบในความจำเป็น ผู้ขอมีใบขับขี่ถูกต้อง",
    managerActionAt: "8 ต.ค. 2569 11:00 น.",
    approverId: "usr_1",
    approverName: "นางสาวมะลิวัน สิทธิโยธี (พมจ.กำแพงเพชร)",
    approverNotes: "อนุมัติให้ใช้รถยนต์ราชการตามขอ โดยให้ปฏิบัติตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยการใช้รถราชการอย่างเคร่งครัด",
    approverActionAt: "8 ต.ค. 2569 13:15 น.",
    notifications: [
      {
        id: "notif_003_a",
        timestamp: "8 ต.ค. 2569 13:15 น.",
        type: "approved",
        title: "อนุมัติคำขอใช้รถยนต์ราชการ",
        message: "🎉 พมจ.กำแพงเพชร อนุมัติคำขอ คข-69/006 (กข 9210) เรียบร้อย ออกใบขอใช้รถได้ทันที",
        recipientRole: "ผู้ขอใช้รถ",
        recipientName: "นางสาวจารุวรรณ ศรีสวัสดิ์",
        channel: "line_notify",
        status: "delivered",
      },
      {
        id: "notif_003_b",
        timestamp: "8 ต.ค. 2569 13:15 น.",
        type: "approved",
        title: "แจ้งเจ้าหน้าที่บริหารยานพาหนะ",
        message: "เตรียมความพร้อมรถ กข 9210 สำหรับภารกิจ อ.ขาณุวรลักษบุรี วันที่ 14 ต.ค. 2569",
        recipientRole: "เจ้าหน้าที่ยานพาหนะ",
        recipientName: "งานพัสดุและยานพาหนะ",
        channel: "system_alert",
        status: "delivered",
      },
    ],
  },
  {
    id: "req_car_004",
    requestNo: "คข-69/005",
    vehicleId: "veh_1",
    vehicleName: "Toyota Commuter 3.0 D4D",
    licensePlate: "นข 4589 กำแพงเพชร",
    requesterId: "usr_3",
    requesterName: "นายวรวุฒิ พึ่งพัก",
    requesterPosition: "นักพัฒนาสังคมชำนาญการพิเศษ",
    requesterDivision: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    requesterPhone: "087-890-1234",
    purpose: "นำคณะเจ้าหน้าที่ลงพื้นที่มอบเงินสงเคราะห์ครอบครัวและถุงยังชีพแก่ผู้ประสบอัคคีภัย",
    destination: "ตำบลพรานกระต่าย อำเภอพรานกระต่าย จังหวัดกำแพงเพชร",
    origin: "สำนักงาน พมจ.กำแพงเพชร",
    departureTime: "2026-10-07T08:30",
    returnTime: "2026-10-07T16:00",
    passengerCount: 6,
    passengersList: "นายวรวุฒิ พึ่งพัก, นางสาวพิชชาภา ห้าวหาญ และทีมงาน 6 คน",
    requireDriver: true,
    assignedDriver: "นายสมชาย มั่นคง",
    fuelBudgetRequested: true,
    fuelBudgetAmount: 1500,
    fuelBudgetSource: "กองทุนช่วยเหลือผู้ประสบสาธารณภัย",
    status: "completed",
    createdAt: "6 ต.ค. 2569 10:00 น.",
    managerId: "usr_2",
    managerName: "นายเสกพล ดิษฐโชติ (หัวหน้าฝ่ายบริหารทั่วไป)",
    managerNotes: "เห็นชอบตามเสนอ ภารกิจเร่งด่วนช่วยเหลือผู้ประสบภัย",
    managerActionAt: "6 ต.ค. 2569 11:30 น.",
    approverId: "usr_1",
    approverName: "นางสาวมะลิวัน สิทธิโยธี (พมจ.กำแพงเพชร)",
    approverNotes: "อนุมัติ",
    approverActionAt: "6 ต.ค. 2569 13:00 น.",
    notifications: [
      {
        id: "notif_004_a",
        timestamp: "7 ต.ค. 2569 16:20 น.",
        type: "return_completed",
        title: "ส่งคืนรถและตรวจสภาพเรียบร้อย",
        message: "🏁 บันทึกส่งคืนรถ นข 4589 วิ่งจริง 170 กม. เกจน้ำมันเต็มถัง ตรวจรับเรียบร้อย",
        recipientRole: "เจ้าหน้าที่ยานพาหนะ",
        recipientName: "นายเสกพล ดิษฐโชติ",
        channel: "line_notify",
        status: "delivered",
      },
    ],
    returnReport: {
      returnedAt: "7 ต.ค. 2569 16:20 น.",
      returneeId: "usr_3",
      returneeName: "นายวรวุฒิ พึ่งพัก",
      inspectorId: "usr_2",
      inspectorName: "นายเสกพล ดิษฐโชติ (หัวหน้าฝ่ายบริหารทั่วไป)",
      startMileage: 142410,
      endMileage: 142580,
      totalDistance: 170,
      startFuelLevel: "เต็มถัง (100%)",
      endFuelLevel: "เต็มถัง (100%)",
      fuelRefilledLiters: 18,
      fuelRefilledCost: 650,
      fuelReceiptNo: "PTT-69-88124",
      vehicleCleanliness: "สะอาดเรียบร้อย",
      bodyCondition: "ปกติสมบูรณ์ดี",
      engineCondition: "ปกติสมบูรณ์",
      airConditioner: "แอร์เย็นปกติ",
      issuesFound: "ไม่มีข้อบกพร่อง เครื่องยนต์และการขับขี่เรียบร้อยดี",
      notes: "ส่งคืนรถพร้อมกุญแจและบัตรเติมน้ำมันเรียบร้อยแล้ว",
    },
  },
];

const CAR_STORAGE_KEY = "omnioffice_car_bookings_v2";
const VEHICLES_STORAGE_KEY = "omnioffice_vehicles_v2";

export function loadStoredBookings(): CarBookingRequest[] {
  if (typeof window === "undefined") return INITIAL_BOOKING_REQUESTS;
  try {
    const raw = localStorage.getItem(CAR_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CAR_STORAGE_KEY, JSON.stringify(INITIAL_BOOKING_REQUESTS));
      return INITIAL_BOOKING_REQUESTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_BOOKING_REQUESTS;
  } catch (e) {
    console.error("Failed to load car bookings:", e);
    return INITIAL_BOOKING_REQUESTS;
  }
}

export function saveStoredBookings(bookings: CarBookingRequest[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CAR_STORAGE_KEY, JSON.stringify(bookings));
  } catch (e) {
    console.error("Failed to save car bookings:", e);
  }
}

export function loadStoredVehicles(): Vehicle[] {
  if (typeof window === "undefined") return INITIAL_VEHICLES;
  try {
    const raw = localStorage.getItem(VEHICLES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(INITIAL_VEHICLES));
      return INITIAL_VEHICLES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_VEHICLES;
  } catch (e) {
    console.error("Failed to load vehicles:", e);
    return INITIAL_VEHICLES;
  }
}

export function saveStoredVehicles(vehicles: Vehicle[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(vehicles));
  } catch (e) {
    console.error("Failed to save vehicles:", e);
  }
}
