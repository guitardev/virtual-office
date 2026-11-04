import { ModuleId } from "./types";

export interface NavItem {
  id: ModuleId;
  label: string;
  icon: string;
  badge?: number;
}

export interface NavGroup {
  id: string;
  title: string;
  icon?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    title: "ภาพรวม",
    icon: "📊",
    items: [
      { id: "dashboard", label: "หน้าแรก", icon: "📊" },
      { id: "reports", label: "รายงาน", icon: "📈" },
    ],
  },
  {
    id: "operations",
    title: "งาน & บริการ",
    icon: "💼",
    items: [
      { id: "circular", label: "หนังสือเวียน", icon: "📜" },
      { id: "task", label: "ภารกิจงาน", icon: "📋" },
      { id: "meetings", label: "การประชุม", icon: "📹" },
      { id: "chat", label: "แชททีม", icon: "💬" },
      { id: "carbooking", label: "รถราชการ", icon: "🚗" },
    ],
  },
  {
    id: "storage",
    title: "คลังข้อมูล",
    icon: "🗄️",
    items: [
      { id: "datahub", label: "ระบบรวมข้อมูล", icon: "🗃️" },
      { id: "files", label: "เอกสาร NAS", icon: "📁" },
      { id: "gallery", label: "ภาพ & สื่อ", icon: "📸" },
    ],
  },
  {
    id: "tools",
    title: "เครื่องมือ & Tools",
    icon: "🛠️",
    items: [
      { id: "qrcode", label: "QR Code", icon: "📱" },
      { id: "bgremove", label: "BG Remove", icon: "✂️" },
    ],
  },
  {
    id: "settings",
    title: "การจัดการ",
    icon: "⚙️",
    items: [
      { id: "admin", label: "จัดการระบบ", icon: "⚙️" },
      { id: "user", label: "ข้อมูลส่วนตัว", icon: "👤" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const MODULE_TO_ROUTE: Record<ModuleId, string> = {
  dashboard: "/dashboard",
  reports: "/reports",
  chat: "/chat",
  task: "/tasks",
  meetings: "/meetings",
  circular: "/circular",
  carbooking: "/carbooking",
  datahub: "/data-hub",
  files: "/files",
  gallery: "/gallery",
  qrcode: "/tools/qrcode",
  bgremove: "/tools/bgremove",
  admin: "/admin",
  user: "/user",
};

export const ROUTE_TO_MODULE: Record<string, ModuleId> = {
  "/": "dashboard",
  "/dashboard": "dashboard",
  "/reports": "reports",
  "/chat": "chat",
  "/tasks": "task",
  "/task": "task",
  "/meetings": "meetings",
  "/circular": "circular",
  "/carbooking": "carbooking",
  "/data-hub": "datahub",
  "/files": "files",
  "/gallery": "gallery",
  "/tools": "qrcode",
  "/tools/qrcode": "qrcode",
  "/tools/bgremove": "bgremove",
  "/admin": "admin",
  "/user": "user",
};

export function getModuleFromPathname(pathname: string): ModuleId {
  const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  if (ROUTE_TO_MODULE[cleanPath]) {
    return ROUTE_TO_MODULE[cleanPath];
  }
  const firstSegment = "/" + (cleanPath.split("/")[1] || "");
  return ROUTE_TO_MODULE[firstSegment] || "dashboard";
}

