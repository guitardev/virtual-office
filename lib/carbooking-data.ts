import { Vehicle, CarBookingRequest } from "./types";

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: "veh_1",
    name: "รถประจำตำแหน่ง พมจ. (กน 7872 กำแพงเพชร)",
    licensePlate: "กน 7872 กำแพงเพชร",
    category: "รถยนต์นั่งส่วนบุคคล",
    capacity: 5,
    driverName: "พนักงานขับรถประจำตำแหน่ง พมจ.",
    fuelType: "เบนซิน ไฮบริด (E20)",
    status: "available",
    image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
    mileage: 42350,
    fuelLevel: "เต็มถัง (100%)",
    lastMaintenanceDate: "5 ต.ค. 2569",
    insuranceExpiry: "31 ธ.ค. 2570",
    assignedDivision: "สำนักงาน พมจ. (ประจำตำแหน่งผู้บริหาร)",
    features: ["รถประจำตำแหน่ง พมจ.", "5 ที่นั่ง", "ภารกิจผู้บริหารระดับสูง", "GPS ติดตามรถ"],
  },
  {
    id: "veh_2",
    name: "รถยนต์ส่วนกลาง (กน 8121 กำแพงเพชร)",
    licensePlate: "กน 8121 กำแพงเพชร",
    category: "รถยนต์นั่งส่วนบุคคล",
    capacity: 5,
    driverName: "พนักงานขับรถเวรส่วนกลาง",
    fuelType: "แก๊สโซฮอล์ 91/95",
    status: "available",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80",
    mileage: 68120,
    fuelLevel: "3/4 ถัง (75%)",
    lastMaintenanceDate: "12 ก.ย. 2569",
    insuranceExpiry: "31 มี.ค. 2570",
    assignedDivision: "ฝ่ายบริหารทั่วไป (ส่วนกลาง)",
    features: ["5 ที่นั่ง", "ระบบแอร์เย็นฉ่ำ", "GPS ติดตามรถ", "รองรับงานตรวจราชการทั่วไป"],
  },
  {
    id: "veh_3",
    name: "รถยนต์ส่วนกลาง (กฉ 5196 กำแพงเพชร)",
    licensePlate: "กฉ 5196 กำแพงเพชร",
    category: "รถยนต์นั่งส่วนบุคคล",
    capacity: 5,
    driverName: "พนักงานขับรถเวรส่วนกลาง",
    fuelType: "ดีเซล B7",
    status: "available",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
    mileage: 81400,
    fuelLevel: "เต็มถัง (100%)",
    lastMaintenanceDate: "20 ส.ค. 2569",
    insuranceExpiry: "30 เม.ย. 2570",
    assignedDivision: "ฝ่ายบริหารทั่วไป (ส่วนกลาง)",
    features: ["5 ที่นั่ง", "ภารกิจลงพื้นที่ชุมชน", "ระบบนำทาง GPS", "ยางสภาพดีเยี่ยม"],
  },
  {
    id: "veh_4",
    name: "รถยนต์ส่วนกลาง พก. (กฉ 9733 กำแพงเพชร)",
    licensePlate: "กฉ 9733 กำแพงเพชร",
    category: "รถยนต์นั่งส่วนบุคคล",
    capacity: 5,
    driverName: "เจ้าหน้าที่ศูนย์บริการคนพิการ",
    fuelType: "ดีเซล B7",
    status: "available",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
    mileage: 53200,
    fuelLevel: "เต็มถัง (100%)",
    lastMaintenanceDate: "1 ต.ค. 2569",
    insuranceExpiry: "31 พ.ค. 2570",
    assignedDivision: "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร (พก.)",
    features: ["รถประจำศูนย์บริการคนพิการ (พก.)", "พื้นที่กว้างขวาง", "รองรับรถเข็นวีลแชร์", "ลงพื้นที่เยี่ยมผู้พิการ"],
  },
  {
    id: "veh_5",
    name: "รถกระบะตรวจการณ์ (กค 6520 กำแพงเพชร)",
    licensePlate: "กค 6520 กำแพงเพชร",
    category: "รถกระบะตรวจการณ์",
    capacity: 5,
    driverName: "นายสมหมาย มั่นคง",
    fuelType: "ดีเซล B7",
    status: "available",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
    mileage: 95400,
    fuelLevel: "3/4 ถัง (75%)",
    lastMaintenanceDate: "18 ส.ค. 2569",
    insuranceExpiry: "30 มิ.ย. 2570",
    assignedDivision: "ฝ่ายบริหารทั่วไป (ตรวจการณ์)",
    features: ["5 ที่นั่ง", "ยกสูง ลุยพื้นที่ทุรกันดาร", "กระบะบรรทุกสิ่งของ/อุปกรณ์", "ขับเคลื่อนสมบุกสมบัน"],
  },
  {
    id: "veh_6",
    name: "รถกระบะบรรทุก/ตรวจการณ์ (กง 3659 กำแพงเพชร)",
    licensePlate: "กง 3659 กำแพงเพชร",
    category: "รถกระบะบรรทุก",
    capacity: 5,
    driverName: "พนักงานขับรถเวรส่วนกลาง",
    fuelType: "ดีเซล B7",
    status: "available",
    image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=800&q=80",
    mileage: 112800,
    fuelLevel: "1/2 ถัง (50%)",
    lastMaintenanceDate: "15 ก.ค. 2569",
    insuranceExpiry: "31 ก.ค. 2570",
    assignedDivision: "ฝ่ายบริหารทั่วไป (งานส่งของ/พัสดุ)",
    features: ["บรรทุกสิ่งของช่วยเหลือผู้ประสบภัย", "ขนย้ายอุปกรณ์กายอุปกรณ์", "ลุยงานภาคสนาม"],
  },
  {
    id: "veh_7",
    name: "รถตู้ส่วนกลาง (นข 1422 กำแพงเพชร)",
    licensePlate: "นข 1422 กำแพงเพชร",
    category: "รถตู้ส่วนกลาง",
    capacity: 12,
    driverName: "นายสมชาย มั่นคง",
    fuelType: "ดีเซล B7",
    status: "available",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
    mileage: 135400,
    fuelLevel: "เต็มถัง (100%)",
    lastMaintenanceDate: "25 ก.ย. 2569",
    insuranceExpiry: "31 ส.ค. 2570",
    assignedDivision: "ฝ่ายบริหารทั่วไป (ส่วนกลาง)",
    features: ["12 ที่นั่ง", "แอร์ไมโครบัสแยกหน้า-หลัง", "เข็มขัดนิรภัยครบทุกที่นั่ง", "เดินทางประชุม/สัมมนาเป็นหมู่คณะ"],
  },
  {
    id: "veh_8",
    name: "รถตู้ส่วนกลาง (นข 3598 กำแพงเพชร)",
    licensePlate: "นข 3598 กำแพงเพชร",
    category: "รถตู้ส่วนกลาง",
    capacity: 12,
    driverName: "นายบุญส่ง ชื่นใจ",
    fuelType: "ดีเซล B7",
    status: "available",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
    mileage: 148900,
    fuelLevel: "3/4 ถัง (75%)",
    lastMaintenanceDate: "10 ส.ค. 2569",
    insuranceExpiry: "30 ก.ย. 2570",
    assignedDivision: "ฝ่ายบริหารทั่วไป (ส่วนกลาง)",
    features: ["12 ที่นั่ง", "เบาะปรับเอนสบาย", "แอร์เย็นทั่วถึง", "GPS ติดตามความเร็ว"],
  },
  {
    id: "veh_9",
    name: "รถกระบะตรวจการณ์ (กข 6972 กำแพงเพชร)",
    licensePlate: "กข 6972 กำแพงเพชร",
    category: "รถกระบะตรวจการณ์",
    capacity: 5,
    driverName: "พนักงานขับรถเวรส่วนกลาง",
    fuelType: "ดีเซล B7",
    status: "available",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
    mileage: 104200,
    fuelLevel: "1/2 ถัง (50%)",
    lastMaintenanceDate: "2 ก.ย. 2569",
    insuranceExpiry: "31 ต.ค. 2570",
    assignedDivision: "ฝ่ายบริหารทั่วไป (ตรวจการณ์)",
    features: ["5 ที่นั่ง", "ยกสูง ขับเคลื่อน 4 ล้อ", "ลุยตรวจราชการ 11 อำเภอ", "กระบะกว้าง"],
  },
  {
    id: "veh_10",
    name: "รถจักรยานยนต์ส่วนกลาง (กษย 929 กำแพงเพชร)",
    licensePlate: "กษย 929 กำแพงเพชร",
    category: "รถจักรยานยนต์",
    capacity: 2,
    driverName: "เจ้าหน้าที่ธุรการ/ส่งสารบรรณ",
    fuelType: "แก๊สโซฮอล์ 91/95",
    status: "available",
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80",
    mileage: 18600,
    fuelLevel: "เต็มถัง (100%)",
    lastMaintenanceDate: "1 ต.ค. 2569",
    insuranceExpiry: "30 พ.ย. 2570",
    assignedDivision: "ฝ่ายบริหารทั่วไป (งานสารบรรณ/ส่งเอกสาร)",
    features: ["2 ที่นั่ง", "กล่องใส่เอกสารท้ายรถ", "งานรับ-ส่งหนังสือราชการด่วน", "ประหยัดน้ำมัน คล่องตัวในเมือง"],
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
  {
    title: "รถจักรยานยนต์ส่วนกลาง (Motorcycle)",
    url: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80",
  },
];

export const GOVERNMENT_DRIVERS = [
  { id: "drv_1", name: "นายสมชาย มั่นคง", phone: "081-234-5601", status: "พร้อมปฏิบัติหน้าที่", license: "ท.2 (ขับขี่สาธารณะ)" },
  { id: "drv_2", name: "นายบุญส่ง ชื่นใจ", phone: "082-345-6702", status: "พร้อมปฏิบัติหน้าที่", license: "ท.2 (ขับขี่สาธารณะ)" },
  { id: "drv_3", name: "นายอนุชา พลแสน", phone: "083-456-7803", status: "พร้อมปฏิบัติหน้าที่", license: "ท.2 (ขับขี่สาธารณะ)" },
  { id: "drv_4", name: "นายประเสริฐ ยิ้มแย้ม", phone: "084-567-8904", status: "ติดภารกิจนอกพื้นที่", license: "ท.2 (ขับขี่สาธารณะ)" },
];

export const INITIAL_BOOKING_REQUESTS: CarBookingRequest[] = [];

const CAR_STORAGE_KEY = "smartmso_car_bookings_v2";
const LEGACY_CAR_STORAGE_KEY = "omnioffice_car_bookings_v2";
const VEHICLES_STORAGE_KEY = "smartmso_vehicles_v2";
const LEGACY_VEHICLES_STORAGE_KEY = "omnioffice_vehicles_v2";

export function loadStoredBookings(): CarBookingRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      localStorage.getItem(CAR_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_CAR_STORAGE_KEY);
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
    const raw =
      localStorage.getItem(VEHICLES_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_VEHICLES_STORAGE_KEY);
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
