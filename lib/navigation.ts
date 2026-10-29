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
    title: "ภาพรวมสำนักงาน",
    icon: "🏛️",
    items: [
      { id: "dashboard", label: "หน้าแรก", icon: "📊" },
      { id: "reports", label: "รายงานและสถิติ", icon: "📈" },
    ],
  },
  {
    id: "collaboration",
    title: "การประสานงาน & สื่อสาร",
    icon: "💬",
    items: [
      { id: "chat", label: "แชททีม", icon: "💬" },
      { id: "task", label: "งานและโปรเจกต์", icon: "📋" },
      { id: "meetings", label: "การประชุม", icon: "📹" },
    ],
  },
  {
    id: "operations",
    title: "สารบรรณ & บริการองค์กร",
    icon: "📑",
    items: [
      { id: "circular", label: "เวียนหนังสือราชการ", icon: "📜" },
      { id: "carbooking", label: "รถยนต์สำนักงาน", icon: "🚗" },
      { id: "files", label: "คลังเอกสาร NAS", icon: "📁" },
      { id: "gallery", label: "คลังภาพและสื่อ", icon: "📸" },
    ],
  },
  {
    id: "settings",
    title: "ระบบและการตั้งค่า",
    icon: "⚙️",
    items: [
      { id: "admin", label: "ระบบจัดการ & RBAC", icon: "⚙️" },
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
  files: "/files",
  gallery: "/gallery",
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
  "/files": "files",
  "/gallery": "gallery",
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

