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

export const INITIAL_BOOKING_REQUESTS: CarBookingRequest[] = [];

const CAR_STORAGE_KEY = "omnioffice_car_bookings_v2";
const VEHICLES_STORAGE_KEY = "omnioffice_vehicles_v2";

export function loadStoredBookings(): CarBookingRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CAR_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load car bookings:", e);
    return [];
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
