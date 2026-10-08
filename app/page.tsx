"use client";

import React, { useState, useEffect } from "react";
import { Role, ModuleId, Member, AuditLog, SystemModule, PersonnelType } from "@/lib/types";
import {
  ROLE_CONFIG,
  MODULE_NAMES,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_MEMBERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SYSTEM_MODULES,
  GOVERNMENT_DIVISIONS,
  GOVERNMENT_PERSONNEL_TYPES,
  PERSONNEL_TYPE_CONFIG,
} from "@/lib/rbac";
import { LoginPage } from "@/components/auth/LoginPage";
import { LogoutConfirmModal } from "@/components/auth/LogoutConfirmModal";
import {
  isSupabaseConfigured,
  fetchMembers,
  saveMember,
  deleteMember,
  subscribeToMembers,
} from "@/lib/supabase";

interface NavItem {
  id: ModuleId;
  label: string;
  icon: string;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "หน้าแรก", icon: "📊" },
  { id: "chat", label: "แชททีม", icon: "💬", badge: 3 },
  { id: "task", label: "งานและโปรเจกต์", icon: "📋", badge: 5 },
  { id: "meetings", label: "การประชุม", icon: "📹", badge: 2 },
  { id: "carbooking", label: "รถยนต์สำนักงาน", icon: "🚗" },
  { id: "reports", label: "รายงานและสถิติ", icon: "📈" },
  { id: "admin", label: "ระบบจัดการ & RBAC", icon: "⚙️" },
  { id: "user", label: "ข้อมูลส่วนตัว", icon: "👤" },
];

interface TaskItem {
  id: number;
  title: string;
  dept: string;
  due: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  assignee: string;
}

interface MeetingItem {
  id: number;
  title: string;
  dateStr: string;
  timeStr: string;
  location: string;
  type: "online" | "onsite";
  attendees: string[];
}

export default function OmniOfficeApp() {
  // ─── AUTH & SESSION STATE ───
  const [currentUser, setCurrentUser] = useState<Member | null>(INITIAL_MEMBERS[0]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loginTime, setLoginTime] = useState<string>("09:00 น.");

  const [currentPage, setCurrentPage] = useState<ModuleId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ─── RBAC STATE ───
  const [currentUserRole, setCurrentUserRole] = useState<Role>("admin");
  const [rolePermissions, setRolePermissions] = useState<Record<Role, Record<ModuleId, boolean>>>(
    INITIAL_ROLE_PERMISSIONS
  );
  const [systemModules, setSystemModules] = useState<Record<ModuleId, SystemModule>>(INITIAL_SYSTEM_MODULES);
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [adminTab, setAdminTab] = useState<"members" | "matrix" | "audit">("members");
  const [memberSearch, setMemberSearch] = useState("");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Admin Member Management Modals State
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [adminEditingMember, setAdminEditingMember] = useState<Member | null>(null);
  const [adminEditForm, setAdminEditForm] = useState({
    prefix: "นาย",
    firstName: "",
    lastName: "",
    nickname: "",
    personnelType: "ข้าราชการ" as PersonnelType,
    position: "",
    division: GOVERNMENT_DIVISIONS[0] as string,
    email: "",
    phone: "",
    lineId: "",
    role: "member" as Role,
    status: "active" as "active" | "inactive",
  });
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Admin System Module Management State
  const [editingModuleId, setEditingModuleId] = useState<ModuleId | null>(null);
  const [editModuleForm, setEditModuleForm] = useState({
    name: "",
    icon: "",
    desc: "",
    enabled: true,
    maintenanceNotice: "",
  });

  const [editProfileForm, setEditProfileForm] = useState({
    prefix: "นางสาว",
    firstName: "",
    lastName: "",
    nickname: "",
    personnelType: "ข้าราชการ" as PersonnelType,
    position: "",
    division: GOVERNMENT_DIVISIONS[0] as string,
    email: "",
    phone: "",
    lineId: "",
  });

  const [newMemberForm, setNewMemberForm] = useState({
    prefix: "นาย",
    firstName: "",
    lastName: "",
    nickname: "",
    personnelType: "ข้าราชการ" as PersonnelType,
    position: "",
    division: GOVERNMENT_DIVISIONS[1] as string,
    email: "",
    phone: "",
    lineId: "",
    role: "member" as Role,
  });

  const isLiveConnected = isSupabaseConfigured();

  // Load session from localStorage on client mount
  useEffect(() => {
    setIsHydrated(true);
    try {
      const savedSession = localStorage.getItem("omnioffice_auth_session");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.user) {
          setCurrentUser(parsed.user);
          setCurrentUserRole(parsed.user.role);
          if (parsed.loginTime) setLoginTime(parsed.loginTime);
        }
      }
    } catch (e) {
      console.error("Failed to load saved session:", e);
    }
  }, []);

  // Fetch live members from Supabase & subscribe to realtime changes
  useEffect(() => {
    if (isLiveConnected) {
      fetchMembers().then((liveMembers) => {
        if (liveMembers && liveMembers.length > 0) {
          setMembers(liveMembers);
        }
      });

      const unsubscribe = subscribeToMembers((updatedMembers) => {
        setMembers(updatedMembers);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [isLiveConnected]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper: check access for current role
  const canAccess = (moduleId: ModuleId, role: Role = currentUserRole): boolean => {
    return !!rolePermissions[role]?.[moduleId];
  };

  // Add audit log
  const addAuditLog = (
    actor: string,
    action: string,
    target: string,
    status: "success" | "denied"
  ) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
      timestamp: "เมื่อสักครู่",
      actor,
      action,
      target,
      status,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // ─── AUTH ACTIONS ───
  const handleLogin = (member: Member, rememberMe: boolean = true) => {
    setCurrentUser(member);
    setCurrentUserRole(member.role);
    const timeStr =
      new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
    setLoginTime(timeStr);

    if (rememberMe && typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "omnioffice_auth_session",
          JSON.stringify({
            user: member,
            loginTime: timeStr,
            token: `token_${Date.now()}`,
            rememberMe: true,
          })
        );
      } catch (e) {
        console.error("Failed to persist session:", e);
      }
    }

    addAuditLog(
      `${member.name} (${ROLE_CONFIG[member.role].label})`,
      "เข้าสู่ระบบสำเร็จ (Login Success)",
      "Authentication",
      "success"
    );
    showToast(`👋 ยินดีต้อนรับกลับ คุณ${member.name}`);
  };

  const handleInitiateLogout = () => {
    setShowUserDropdown(false);
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    if (currentUser) {
      addAuditLog(
        `${currentUser.name} (${ROLE_CONFIG[currentUserRole].label})`,
        "ออกจากระบบ (Logout)",
        "Authentication",
        "success"
      );
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("omnioffice_auth_session");
      } catch (e) {}
    }
    setCurrentUser(null);
    setCurrentPage("dashboard");
    setShowLogoutModal(false);
    setShowUserDropdown(false);
    showToast("👋 ออกจากระบบเรียบร้อยแล้ว");
  };

  // Switch role simulation
  const handleSwitchRole = (newRole: Role) => {
    setCurrentUserRole(newRole);
    const matchingMember = members.find((m) => m.role === newRole);
    if (matchingMember) {
      setCurrentUser(matchingMember);
    }
    const roleInfo = ROLE_CONFIG[newRole];
    showToast(`🔄 สลับบทบาทเป็น: ${roleInfo.label}`);

    addAuditLog(
      matchingMember ? matchingMember.name : (currentUser ? currentUser.name : "ผู้ใช้งาน"),
      `สลับโหมดจำลองสิทธิ์เป็น ${roleInfo.label}`,
      "RBAC Simulation",
      "success"
    );
  };

  // Change member role
  const handleChangeMemberRole = (memberId: string, newRole: Role) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
    const targetMember = members.find((m) => m.id === memberId);
    if (targetMember) {
      addAuditLog(
        currentUser ? currentUser.name : "Admin",
        `เปลี่ยนบทบาท ${targetMember.name} เป็น ${ROLE_CONFIG[newRole].label}`,
        "User Role Management",
        "success"
      );
    }
    showToast(`✅ อัปเดตสิทธิ์ของสมาชิกเรียบร้อยแล้ว`);
  };

  // Toggle permission in matrix
  const handleTogglePermission = (role: Role, moduleId: ModuleId) => {
    if (role === "admin" && (moduleId === "admin" || moduleId === "dashboard")) {
      showToast("⚠️ ไม่สามารถปิดสิทธิ์ Admin Panel สำหรับ Admin ได้");
      return;
    }

    setRolePermissions((prev) => {
      const currentVal = prev[role][moduleId];
      const updated = {
        ...prev,
        [role]: {
          ...prev[role],
          [moduleId]: !currentVal,
        },
      };
      return updated;
    });

    addAuditLog(
      currentUser ? currentUser.name : "Admin",
      `ปรับเปลี่ยนสิทธิ์โมดูล ${systemModules[moduleId]?.name || MODULE_NAMES[moduleId].name} สำหรับบทบาท ${ROLE_CONFIG[role].label}`,
      "RBAC Permission Matrix",
      "success"
    );
    showToast("💾 บันทึกการเปลี่ยนแปลงสิทธิ์โมดูลเรียบร้อย");
  };

  // ─── ADMIN SYSTEM MODULE CONTROL (เปิด/ปิด & แก้ไขโมดูล) ───
  const handleToggleModuleStatus = (modId: ModuleId) => {
    if (modId === "admin") {
      showToast("⚠️ ไม่สามารถปิดระบบ Admin Panel ได้ เพื่อความปลอดภัยสูงสุดของระบบ");
      return;
    }
    const current = systemModules[modId];
    const nextStatus = !current.enabled;
    setSystemModules((prev) => ({
      ...prev,
      [modId]: {
        ...prev[modId],
        enabled: nextStatus,
      },
    }));

    addAuditLog(
      currentUser ? currentUser.name : "Admin",
      `${nextStatus ? "เปิดใช้งานระบบปกติ" : "ปิดปรับปรุงระบบชั่วคราว"} โมดูล: ${current.name}`,
      "System Module Control",
      "success"
    );
    showToast(
      nextStatus
        ? `🟢 เปิดใช้งานโมดูล ${current.name} เรียบร้อยแล้ว`
        : `⛔ ปิดปรับปรุงโมดูล ${current.name} เรียบร้อยแล้ว (เฉพาะ Admin เท่านั้นที่เข้าถึงได้)`
    );
  };

  const handleOpenEditModule = (modId: ModuleId) => {
    const mod = systemModules[modId];
    setEditingModuleId(modId);
    setEditModuleForm({
      name: mod.name,
      icon: mod.icon,
      desc: mod.desc,
      enabled: mod.enabled,
      maintenanceNotice:
        mod.maintenanceNotice || "ขณะนี้โมดูลนี้อยู่ระหว่างการปรับปรุงระบบ ขออภัยในความไม่สะดวก",
    });
  };

  const handleSaveModuleInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModuleId) return;

    setSystemModules((prev) => ({
      ...prev,
      [editingModuleId]: {
        ...prev[editingModuleId],
        name: editModuleForm.name.trim(),
        icon: editModuleForm.icon.trim() || "📁",
        desc: editModuleForm.desc.trim(),
        enabled: editModuleForm.enabled,
        maintenanceNotice: editModuleForm.maintenanceNotice.trim(),
      },
    }));

    addAuditLog(
      currentUser ? currentUser.name : "Admin",
      `แก้ไขรายละเอียดและการตั้งค่าโมดูล ${editModuleForm.name}`,
      "Module Configuration",
      "success"
    );
    showToast(`✅ บันทึกข้อมูลและสถานะโมดูล ${editModuleForm.name} เรียบร้อย`);
    setEditingModuleId(null);
  };

  // ─── ADMIN MEMBER MANAGEMENT (ดู, แก้ไข, ลบ สมาชิก) ───
  const handleOpenAdminEdit = (member: Member) => {
    setAdminEditingMember(member);
    setAdminEditForm({
      prefix: member.prefix || "นาย",
      firstName: member.firstName || member.name.split(" ")[0] || "",
      lastName: member.lastName || member.name.split(" ").slice(1).join(" ") || "",
      nickname: member.nickname || "",
      personnelType: member.personnelType || "ข้าราชการ",
      position: member.position || "",
      division: member.division || (GOVERNMENT_DIVISIONS[0] as string),
      email: member.email || "",
      phone: member.phone || "",
      lineId: member.lineId || "",
      role: member.role,
      status: member.status || "active",
    });
  };

  const handleAdminSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEditingMember) return;

    const fullName = `${adminEditForm.prefix}${adminEditForm.firstName} ${adminEditForm.lastName}`.trim();
    const updatedMember: Member = {
      ...adminEditingMember,
      prefix: adminEditForm.prefix,
      firstName: adminEditForm.firstName.trim(),
      lastName: adminEditForm.lastName.trim(),
      nickname: adminEditForm.nickname.trim() || undefined,
      name: fullName,
      personnelType: adminEditForm.personnelType,
      position: adminEditForm.position.trim(),
      division: adminEditForm.division,
      department: adminEditForm.division,
      email: adminEditForm.email.trim(),
      phone: adminEditForm.phone.trim(),
      lineId: adminEditForm.lineId.trim(),
      role: adminEditForm.role,
      status: adminEditForm.status,
    };

    setMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
    saveMember(updatedMember).catch(console.error);

    // Synchronize session if the edited member is the logged-in user
    if (currentUser && currentUser.id === updatedMember.id) {
      setCurrentUser(updatedMember);
      setCurrentUserRole(updatedMember.role);
      if (typeof window !== "undefined") {
        try {
          const savedSession = localStorage.getItem("omnioffice_auth_session");
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            localStorage.setItem(
              "omnioffice_auth_session",
              JSON.stringify({ ...parsed, user: updatedMember })
            );
          }
        } catch (err) {}
      }
    }

    addAuditLog(
      currentUser ? currentUser.name : "Admin",
      `แก้ไขข้อมูลและสิทธิ์ของบุคลากร ${updatedMember.name} (${ROLE_CONFIG[updatedMember.role].label})`,
      "Member Management",
      "success"
    );
    showToast(`✅ บันทึกข้อมูลบุคลากร ${updatedMember.name} เรียบร้อยแล้ว`);
    setAdminEditingMember(null);
    if (viewingMember && viewingMember.id === updatedMember.id) {
      setViewingMember(updatedMember);
    }
  };

  const handleConfirmDeleteMember = () => {
    if (!memberToDelete) return;

    if (currentUser && memberToDelete.id === currentUser.id) {
      showToast("⚠️ ไม่สามารถลบบัญชีผู้ดูแลระบบที่กำลังเข้าสู่ระบบอยู่ได้");
      setMemberToDelete(null);
      return;
    }

    if (memberToDelete.id === "usr_1") {
      showToast("⚠️ ไม่สามารถลบบัญชีผู้บริหารหลักของระบบได้ (Protected Root Account)");
      setMemberToDelete(null);
      return;
    }

    setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
    deleteMember(memberToDelete.id).catch(console.error);

    addAuditLog(
      currentUser ? currentUser.name : "Admin",
      `ลบบุคลากร ${memberToDelete.name} (${ROLE_CONFIG[memberToDelete.role].label}) ออกจากระบบ`,
      "Member Deletion",
      "success"
    );
    showToast(`🗑️ ลบบุคลากร ${memberToDelete.name} ออกจากระบบเรียบร้อยแล้ว`);
    if (viewingMember && viewingMember.id === memberToDelete.id) {
      setViewingMember(null);
    }
    setMemberToDelete(null);
  };

  // Add new member (Government personnel)
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.firstName.trim() || !newMemberForm.lastName.trim() || !newMemberForm.email.trim()) return;

    const fullName = `${newMemberForm.prefix}${newMemberForm.firstName} ${newMemberForm.lastName}`.trim();
    const initials = newMemberForm.firstName.slice(0, 2).toUpperCase() || "MB";

    const newM: Member = {
      id: `usr_${Date.now()}`,
      prefix: newMemberForm.prefix,
      firstName: newMemberForm.firstName.trim(),
      lastName: newMemberForm.lastName.trim(),
      nickname: newMemberForm.nickname.trim() || undefined,
      name: fullName,
      personnelType: newMemberForm.personnelType,
      position: newMemberForm.position.trim() || "เจ้าหน้าที่",
      division: newMemberForm.division,
      department: newMemberForm.division,
      email: newMemberForm.email.trim(),
      phone: newMemberForm.phone.trim() || "-",
      lineId: newMemberForm.lineId.trim() || "-",
      role: newMemberForm.role,
      status: "active",
      joinedDate: "วันนี้",
      avatarText: initials,
    };

    setMembers((prev) => [newM, ...prev]);
    saveMember(newM).catch(console.error);
    addAuditLog(
      currentUser ? currentUser.name : "Admin",
      `เพิ่มบุคลากรใหม่ ${newM.name} (${ROLE_CONFIG[newM.role].label} - ${newM.personnelType || "ข้าราชการ"})`,
      "Personnel Registration",
      "success"
    );
    setShowAddMemberModal(false);
    setNewMemberForm({
      prefix: "นาย",
      firstName: "",
      lastName: "",
      nickname: "",
      personnelType: "ข้าราชการ",
      position: "",
      division: GOVERNMENT_DIVISIONS[1] as string,
      email: "",
      phone: "",
      lineId: "",
      role: "member",
    });
    showToast(`🎉 เพิ่มบุคลากร ${newM.name} (${newM.personnelType}) เรียบร้อยแล้ว`);
  };

  // Profile Edit Handlers
  const handleOpenEditProfile = () => {
    if (!currentUser) return;
    setEditProfileForm({
      prefix: currentUser.prefix || "นาย",
      firstName: currentUser.firstName || currentUser.name.split(" ")[0] || "",
      lastName: currentUser.lastName || currentUser.name.split(" ").slice(1).join(" ") || "",
      nickname: currentUser.nickname || "",
      personnelType: currentUser.personnelType || "ข้าราชการ",
      position: currentUser.position || "",
      division: currentUser.division || (GOVERNMENT_DIVISIONS[0] as string),
      email: currentUser.email || "",
      phone: currentUser.phone || "",
      lineId: currentUser.lineId || "",
    });
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const fullName = `${editProfileForm.prefix}${editProfileForm.firstName} ${editProfileForm.lastName}`.trim();
    const updatedUser: Member = {
      ...currentUser,
      prefix: editProfileForm.prefix,
      firstName: editProfileForm.firstName.trim(),
      lastName: editProfileForm.lastName.trim(),
      nickname: editProfileForm.nickname.trim() || undefined,
      name: fullName,
      personnelType: editProfileForm.personnelType,
      position: editProfileForm.position.trim(),
      division: editProfileForm.division,
      department: editProfileForm.division,
      email: editProfileForm.email.trim(),
      phone: editProfileForm.phone.trim(),
      lineId: editProfileForm.lineId.trim(),
    };

    setCurrentUser(updatedUser);
    setMembers((prev) => prev.map((m) => (m.id === updatedUser.id ? updatedUser : m)));
    saveMember(updatedUser).catch(console.error);

    if (typeof window !== "undefined") {
      try {
        const savedSession = localStorage.getItem("omnioffice_auth_session");
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          localStorage.setItem(
            "omnioffice_auth_session",
            JSON.stringify({ ...parsed, user: updatedUser })
          );
        }
      } catch (err) {}
    }

    addAuditLog(
      updatedUser.name,
      "อัปเดตข้อมูลส่วนบุคคลข้าราชการ/เจ้าหน้าที่",
      "Personnel Profile",
      "success"
    );
    setShowEditProfileModal(false);
    showToast("✅ บันทึกข้อมูลส่วนบุคคลเรียบร้อยแล้ว");
  };

  // Chat state
  const [activeChannel, setActiveChannel] = useState("ทีมออกแบบ UI/UX");
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: "คุณ พนม", text: "สวัสดีครับ วันนี้มีอะไรใหม่บ้างในโครงการ OmniOffice?", time: "10:24", isMe: false },
    { id: 2, sender: "ทีมออกแบบ", text: "สวัสดีครับ เราอัปเดตระบบ Authentication (Login/Logout) และ RBAC เรียบร้อยแล้วครับ", time: "10:25", isMe: true },
    { id: 3, sender: "คุณ พนม", text: "ยอดเยี่ยมมากครับ สมาชิกแต่ละระดับสิทธิ์สามารถเข้าถึงหน้าใดได้บ้าง?", time: "10:26", isMe: false },
    { id: 4, sender: "ทีมออกแบบ", text: "Admin จัดการสิทธิ์ได้ทั้งหมด, Manager ดูรายงานได้, Member ใช้งานทั่วไป, และ Guest เข้าถึงได้เฉพาะที่ได้รับเชิญครับ", time: "10:27", isMe: true },
  ]);
  const [newMessage, setNewMessage] = useState("");

  // Tasks state
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: 1, title: "สร้างโปรโตไทป์หน้า Login & Auth", dept: "Frontend", due: "วันนี้ 18:00", priority: "high", status: "todo", assignee: "คุณ พนม" },
    { id: 2, title: "จดบันทึกการประชุมสรุป Roadmap ครั้งที่ 4", dept: "Product", due: "พรุ่งนี้ 12:00", priority: "medium", status: "todo", assignee: "คุณ นพมาศ" },
    { id: 3, title: "ตรวจสอบเอกสารเบิกจ่าย Q4", dept: "Finance", due: "15 ต.ค.", priority: "low", status: "todo", assignee: "ทีมการเงิน" },
    { id: 4, title: "พัฒนา API ระบบรถยนต์สำนักงาน", dept: "Backend", due: "วันนี้ 16:30", priority: "high", status: "in_progress", assignee: "คุณ วรกร" },
    { id: 5, title: "เชื่อมต่อ Realtime WebSocket", dept: "Core Dev", due: "ใน 2 วัน", priority: "medium", status: "in_progress", assignee: "คุณ ธนพล" },
    { id: 6, title: "ตั้งค่าฐานข้อมูล Supabase Schema", dept: "DevOps", due: "เสร็จสิ้น", priority: "low", status: "done", assignee: "คุณ วิภา" },
    { id: 7, title: "กำหนด Design System สีและฟอนต์", dept: "UI/UX", due: "เสร็จสิ้น", priority: "low", status: "done", assignee: "ทีมออกแบบ" },
  ]);

  // Meetings state
  const [meetings] = useState<MeetingItem[]>([
    {
      id: 1,
      title: "ประชุมวางแผนผลิตภัณฑ์ & UI/UX Sprint Review",
      dateStr: "วันนี้ (8 ต.ค.)",
      timeStr: "11:00 - 12:00 น.",
      location: "Google Meet · Room A",
      type: "online",
      attendees: ["วรกร", "พนม", "ธนพล", "นพมาศ"],
    },
    {
      id: 2,
      title: "การอบรมระบบจัดการและการเชื่อมโยงข้อมูล CRM",
      dateStr: "พรุ่งนี้ (9 ต.ค.)",
      timeStr: "14:00 - 15:30 น.",
      location: "ห้องประชุมใหญ่ ชั้น 4",
      type: "onsite",
      attendees: ["วรกร", "ทีมการตลาด", "นพมาศ"],
    },
    {
      id: 3,
      title: "สรุปงบประมาณยานพาหนะและรายงานประจำไตรมาส",
      dateStr: "จันทร์ที่ 12 ต.ค.",
      timeStr: "09:30 - 10:30 น.",
      location: "Zoom · Room B",
      type: "online",
      attendees: ["ทีมการเงิน", "ผู้บริหาร"],
    },
  ]);

  // Booking state
  const [selectedCar, setSelectedCar] = useState("Volvo XC60");
  const [bookingDestination, setBookingDestination] = useState("เดินทางไปศูนย์ประชุมสิริกิติ์ เพื่อพบลูกค้าโครงการใหม่");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: currentUser ? `คุณ (${currentUser.name})` : "คุณ (ผู้ใช้งาน)",
        text: newMessage.trim(),
        time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        isMe: true,
      },
    ]);
    setNewMessage("");
  };

  const handleBookCar = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`✅ บันทึกคำขอจองรถ ${selectedCar} สำเร็จ! เจ้าหน้าที่จะยืนยันผ่านแชท`);
  };

  const toggleTaskStatus = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextStatus = t.status === "done" ? "todo" : t.status === "todo" ? "in_progress" : "done";
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
    showToast("🔄 อัปเดตสถานะงานเรียบร้อย");
  };

  // ─── IF NOT LOGGED IN: SHOW LOGIN PAGE ───
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} availableMembers={members} />;
  }

  // Render navigation links with RBAC badge/lock and System status
  const renderNavLinks = (isMobile: boolean = false) => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
        <span>โมดูลการทำงาน</span>
        <span className="text-[10px] lowercase text-indigo-400 font-mono">rbac active</span>
      </div>
      {NAV_ITEMS.map((item) => {
        const isActive = currentPage === item.id;
        const permitted = canAccess(item.id);
        const sysModule = systemModules[item.id];
        const isModuleOpen = sysModule?.enabled !== false;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setCurrentPage(item.id);
              if (isMobile) setSidebarOpen(false);
              if (!permitted) {
                addAuditLog(
                  `${currentUser.name} (${ROLE_CONFIG[currentUserRole].label})`,
                  `พยายามเข้าถึงโมดูล ${sysModule?.name || MODULE_NAMES[item.id].name} (ถูกปฏิเสธสิทธิ์ RBAC)`,
                  "Access Control",
                  "denied"
                );
              } else if (!isModuleOpen && currentUserRole !== "admin") {
                addAuditLog(
                  `${currentUser.name} (${ROLE_CONFIG[currentUserRole].label})`,
                  `พยายามเข้าถึงโมดูล ${sysModule?.name || item.label} (โมดูลปิดปรับปรุงชั่วคราว)`,
                  "Maintenance Control",
                  "denied"
                );
              }
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
              isActive
                ? "bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white shadow-md shadow-indigo-500/25 font-semibold"
                : !permitted
                ? "text-slate-500 hover:bg-slate-800/40 opacity-70"
                : !isModuleOpen
                ? "text-amber-300/80 hover:bg-slate-800/60"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center space-x-3 truncate">
              <span className={`text-lg shrink-0 transition-transform ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
                {sysModule?.icon || item.icon}
              </span>
              <span className="truncate">{sysModule?.name ? sysModule.name.split(" (")[0] : item.label}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!isModuleOpen ? (
                <span
                  className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  title="โมดูลนี้ปิดปรับปรุงชั่วคราวโดยผู้ดูแลระบบ"
                >
                  ปิดปรับปรุง
                </span>
              ) : null}

              {!permitted ? (
                <span className="text-xs text-amber-400" title="ไม่มีสิทธิ์เข้าถึงตามบทบาทปัจจุบัน">
                  🔒
                </span>
              ) : item.badge && !isActive && isModuleOpen ? (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {item.badge}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </nav>
  );

  const renderUserProfile = () => (
    <div className="p-3.5 border-t border-slate-800 bg-[#0B0F19] space-y-2">
      <div
        className="flex items-center space-x-3 p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-colors cursor-pointer"
        onClick={() => setCurrentPage("user")}
      >
        <div className="relative shrink-0">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-10 h-10 rounded-xl object-cover shadow-sm border border-slate-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {currentUser.avatarText}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0B0F19] rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate font-heading">
            {currentUser.name}
          </div>
          <div className="text-xs text-indigo-400 truncate flex items-center gap-1">
            <span>{ROLE_CONFIG[currentUserRole].icon} {ROLE_CONFIG[currentUserRole].label.split(" ")[0]}</span>
          </div>
        </div>
      </div>

      {/* Quick Logout Button in Sidebar */}
      <button
        type="button"
        onClick={handleInitiateLogout}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer"
      >
        <span>🚪</span>
        <span>ออกจากระบบ (Logout)</span>
      </button>
    </div>
  );

  // 403 Forbidden Screen component
  const renderAccessDenied = (moduleId: ModuleId) => (
    <div className="max-w-2xl mx-auto py-12 px-6 text-center animate-fade-in">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-4xl shadow-sm mb-6">
        🔒
      </div>
      <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider">
        403 Access Denied · จำกัดสิทธิ์การเข้าถึง
      </span>
      <h2 className="text-2xl font-bold font-heading text-slate-900 mt-4">
        คุณไม่มีสิทธิ์เข้าถึงโมดูล {systemModules[moduleId]?.name || MODULE_NAMES[moduleId]?.name || moduleId}
      </h2>
      <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto leading-relaxed">
        บทบาทปัจจุบันของคุณคือ <span className="font-bold text-indigo-600">{ROLE_CONFIG[currentUserRole].label}</span> ซึ่งไม่ได้รับอนุญาตให้เข้าใช้งานโมดูลนี้ตามนโยบายความปลอดภัย (RBAC)
      </p>

      <div className="mt-6 p-4 rounded-2xl bg-white border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto shadow-xs">
        <div className="font-bold text-slate-800">💡 บทบาทที่มีสิทธิ์เข้าถึงโมดูลนี้:</div>
        <div className="flex flex-wrap gap-2">
          {(["admin", "manager", "member", "guest"] as Role[]).map((r) => {
            const allowed = rolePermissions[r]?.[moduleId];
            return (
              <span
                key={r}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                  allowed
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-400 line-through"
                }`}
              >
                {allowed ? "✓" : "✕"} {ROLE_CONFIG[r].label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setCurrentPage("dashboard")}
          className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors cursor-pointer"
        >
          ← กลับหน้าแรก
        </button>
        {currentUserRole !== "admin" && (
          <button
            type="button"
            onClick={() => handleSwitchRole("admin")}
            className="px-5 py-2.5 bg-[#4F46E5] text-white rounded-xl text-sm font-bold hover:bg-[#4338CA] transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            👑 สลับเป็น Admin เพื่อทดสอบ
          </button>
        )}
      </div>
    </div>
  );

  // System Maintenance Screen component
  const renderMaintenanceScreen = (moduleId: ModuleId) => {
    const mod = systemModules[moduleId];
    return (
      <div className="max-w-2xl mx-auto py-14 px-6 text-center animate-fade-in">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-4xl shadow-sm mb-6">
          🚧
        </div>
        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">
          โมดูลปิดปรับปรุงชั่วคราว · System Maintenance
        </span>
        <h2 className="text-2xl font-bold font-heading text-slate-900 mt-4">
          โมดูล {mod?.name || moduleId} อยู่ระหว่างการปิดปรับปรุง
        </h2>
        <p className="text-slate-600 text-sm mt-3 max-w-md mx-auto leading-relaxed">
          {mod?.maintenanceNotice ||
            "ขณะนี้ผู้ดูแลระบบได้ปิดการใช้งานโมดูลนี้ชั่วคราวเพื่อดำเนินการอัปเดตระบบหรือความปลอดภัย ขออภัยในความไม่สะดวก"}
        </p>

        <div className="mt-6 p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-2 max-w-md mx-auto shadow-xs text-left">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">สถานะระบบ:</span>
            <span className="font-bold text-red-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              ปิดระบบชั่วคราว (Disabled by Admin)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">โมดูล:</span>
            <span className="font-semibold text-slate-800">{mod?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">ข้อความประกาศ:</span>
            <span className="text-slate-700 italic">{mod?.maintenanceNotice || "-"}</span>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentPage("dashboard")}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors cursor-pointer"
          >
            ← กลับหน้าแรก (Dashboard)
          </button>
          {currentUserRole === "admin" && (
            <button
              type="button"
              onClick={() => handleToggleModuleStatus(moduleId)}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>🟢</span>
              <span>เปิดใช้งานโมดูลนี้ทันที (Admin Override)</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isDarkMode ? "bg-gray-950 text-gray-100" : "bg-[#F8FAFC] text-slate-800"}`}>
      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900/95 text-white text-sm font-medium shadow-2xl border border-slate-700/60 backdrop-blur-md animate-fade-in">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ─── ADD MEMBER (GOVERNMENT PERSONNEL) MODAL ─── */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold font-heading text-slate-900">+ เพิ่มบุคลากร/เจ้าหน้าที่ใหม่</h3>
                <p className="text-xs text-slate-500 mt-0.5">ระบุข้อมูลส่วนตัวบุคลากรภาครัฐและกำหนดสิทธิ์ RBAC</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5 mt-4">
              {/* คำนำหน้า, ชื่อ, นามสกุล, ชื่อเล่น */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">คำนำหน้า</label>
                  <select
                    value={newMemberForm.prefix}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, prefix: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="ดร.">ดร.</option>
                    <option value="ว่าที่ ร.ต.">ว่าที่ ร.ต.</option>
                    <option value="อาจารย์">อาจารย์</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น เสกพล"
                    value={newMemberForm.firstName}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">นามสกุล</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ดิษฐโชติ"
                    value={newMemberForm.lastName}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อเล่น (Nickname)</label>
                  <input
                    type="text"
                    placeholder="เช่น เสก"
                    value={newMemberForm.nickname}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, nickname: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              {/* ประเภทบุคลากร, ตำแหน่ง & กลุ่ม/ฝ่าย */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ประเภทบุคลากร</label>
                  <select
                    value={newMemberForm.personnelType}
                    onChange={(e) =>
                      setNewMemberForm({ ...newMemberForm, personnelType: e.target.value as PersonnelType })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                  >
                    {GOVERNMENT_PERSONNEL_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {PERSONNEL_TYPE_CONFIG[pt]?.icon} {pt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ตำแหน่ง (Position)</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น นักวิชาการคอมพิวเตอร์ปฏิบัติการ"
                    value={newMemberForm.position}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">กลุ่ม/ฝ่าย (Division / Section)</label>
                  <select
                    value={newMemberForm.division}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, division: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    {GOVERNMENT_DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* อีเมลราชการ, หมายเลขโทรศัพท์, Line ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">อีเมลราชการ</label>
                  <input
                    type="email"
                    required
                    placeholder="user@agency.go.th"
                    value={newMemberForm.email}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเลขโทรศัพท์</label>
                  <input
                    type="tel"
                    placeholder="02-612-6000 ต่อ 1234"
                    value={newMemberForm.phone}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Line ID</label>
                  <input
                    type="text"
                    placeholder="line_id"
                    value={newMemberForm.lineId}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, lineId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              {/* สิทธิ์ (Role) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">บทบาทสิทธิ์ในระบบ (Role)</label>
                <select
                  value={newMemberForm.role}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value as Role })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                >
                  <option value="member">👤 พนักงาน/เจ้าหน้าที่ (Member) - เข้าถึงงาน แชท ประชุม จองรถ</option>
                  <option value="manager">👔 ผู้อำนวยการกลุ่ม/ผู้จัดการ (Manager) - สิทธิ์พนักงาน + ดูรายงาน</option>
                  <option value="admin">👑 ผู้ดูแลระบบ (Admin) - สิทธิ์สูงสุด จัดการสมาชิกและกำหนดสิทธิ์</option>
                  <option value="guest">🎟️ ผู้เยี่ยมชม/ที่ปรึกษา (Guest) - เฉพาะแชทและประชุมที่เชิญ</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#4F46E5] text-white rounded-xl text-xs font-bold hover:bg-[#4338CA] shadow-md shadow-indigo-600/25 cursor-pointer"
                >
                  บันทึกข้อมูลบุคลากร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT PROFILE (GOVERNMENT PERSONNEL) MODAL ─── */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold font-heading text-slate-900">✏️ แก้ไขข้อมูลส่วนบุคคล</h3>
                <p className="text-xs text-slate-500 mt-0.5">ปรับปรุงข้อมูลการติดต่อและข้อมูลหน่วยงานราชการ</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 mt-4">
              {/* คำนำหน้า, ชื่อ, นามสกุล, ชื่อเล่น */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">คำนำหน้า</label>
                  <select
                    value={editProfileForm.prefix}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, prefix: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="ดร.">ดร.</option>
                    <option value="ว่าที่ ร.ต.">ว่าที่ ร.ต.</option>
                    <option value="อาจารย์">อาจารย์</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ</label>
                  <input
                    type="text"
                    required
                    value={editProfileForm.firstName}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">นามสกุล</label>
                  <input
                    type="text"
                    required
                    value={editProfileForm.lastName}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อเล่น (Nickname)</label>
                  <input
                    type="text"
                    placeholder="เช่น เสก, บอย"
                    value={editProfileForm.nickname}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, nickname: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              {/* ประเภทบุคลากร, ตำแหน่ง & กลุ่ม/ฝ่าย */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ประเภทบุคลากร</label>
                  <select
                    value={editProfileForm.personnelType}
                    onChange={(e) =>
                      setEditProfileForm({ ...editProfileForm, personnelType: e.target.value as PersonnelType })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                  >
                    {GOVERNMENT_PERSONNEL_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {PERSONNEL_TYPE_CONFIG[pt]?.icon} {pt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ตำแหน่ง (Position)</label>
                  <input
                    type="text"
                    required
                    value={editProfileForm.position}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">กลุ่ม/ฝ่าย (Division / Section)</label>
                  <select
                    value={editProfileForm.division}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, division: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    {GOVERNMENT_DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* อีเมลราชการ, หมายเลขโทรศัพท์, Line ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">อีเมลราชการ</label>
                  <input
                    type="email"
                    required
                    value={editProfileForm.email}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเลขโทรศัพท์</label>
                  <input
                    type="tel"
                    placeholder="02-612-6000 ต่อ 1234"
                    value={editProfileForm.phone}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Line ID</label>
                  <input
                    type="text"
                    placeholder="line_id"
                    value={editProfileForm.lineId}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, lineId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#4F46E5] text-white rounded-xl text-xs font-bold hover:bg-[#4338CA] shadow-md shadow-indigo-600/25 cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="hidden md:flex w-64 shrink-0 bg-[#0F172A] text-slate-300 flex-col h-screen border-r border-slate-800/80 select-none shadow-xl z-20">
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#818CF8] flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/30">
              Σ
            </div>
            <div>
              <span className="text-lg font-bold text-white font-heading tracking-tight block leading-tight">
                OmniOffice
              </span>
              <span className="text-[10px] text-indigo-400 font-medium tracking-wide">
                RBAC WORKSPACE
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        {renderNavLinks(false)}

        {/* User Footer with Quick Logout */}
        {renderUserProfile()}
      </aside>

      {/* ─── MOBILE DRAWER ─── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 bg-[#0F172A] text-slate-300 flex flex-col h-full z-10 shadow-2xl">
            <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white font-bold">
                  Σ
                </div>
                <span className="text-lg font-bold text-white font-heading">OmniOffice</span>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-white p-2"
              >
                ✕
              </button>
            </div>
            {renderNavLinks(true)}
            {renderUserProfile()}
          </aside>
        </div>
      )}

      {/* ─── MAIN CONTENT VIEWPORT ─── */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 px-6 md:px-8 border-b border-slate-200/80 bg-white/90 backdrop-blur-md flex items-center justify-between shrink-0 shadow-xs z-10">
          <div className="flex items-center space-x-4 flex-1 max-w-2xl">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Toggle Navigation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="ค้นหาข้อมูล, เอกสาร, งาน, หรือเพื่อนร่วมงาน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 transition-all text-slate-800 placeholder-slate-400"
              />
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {/* Supabase Live Status Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isLiveConnected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
              title={
                isLiveConnected
                  ? "🟢 เชื่อมต่อฐานข้อมูล Supabase Live ผ่าน Vercel Marketplace Integration เรียบร้อยแล้ว (Realtime Sync Active)"
                  : "🟡 โหมดจำลอง In-Memory (เมื่อเชื่อมต่อ Vercel Marketplace Supabase ระบบจะสลับเป็น Live อัตโนมัติ)"
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLiveConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span className="font-heading tracking-wide">
                {isLiveConnected ? "Supabase Live" : "In-Memory"}
              </span>
            </div>

            {/* Interactive Role Simulator Pill */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 px-2 hidden lg:inline">
                สิทธิ์ทดสอบ:
              </span>
              {(["admin", "manager", "member", "guest"] as Role[]).map((r) => {
                const active = currentUserRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleSwitchRole(r)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? "bg-[#4F46E5] text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-200/80"
                    }`}
                  >
                    {ROLE_CONFIG[r].icon} {r.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => showToast("🔔 คุณมี 3 การแจ้งเตือนใหม่ที่ยังไม่ได้อ่าน")}
              className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
              title="การแจ้งเตือน"
            >
              🔔
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#F59E0B] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                3
              </span>
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

            {/* User Profile Dropdown & Quick Logout */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                title="เมนูโปรไฟล์และเซสชัน"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-indigo-200 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-[#4F46E5] font-bold text-xs flex items-center justify-center border border-indigo-200 group-hover:scale-105 transition-transform">
                    {currentUser.avatarText}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <span className="block text-xs font-bold text-slate-800 leading-tight">
                    {currentUser.name.split(" ")[0]}
                  </span>
                  <span className="block text-[10px] text-indigo-600 font-semibold">
                    {ROLE_CONFIG[currentUserRole].label.split(" ")[0]}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-600">▾</span>
              </button>

              {/* Popover Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_CONFIG[currentUserRole].badgeColor}`}
                      >
                        {ROLE_CONFIG[currentUserRole].icon} {ROLE_CONFIG[currentUserRole].label}
                      </span>
                      <span className="text-[10px] text-slate-400">เข้าสู่ระบบ: {loginTime}</span>
                    </div>
                  </div>

                  <div className="py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPage("user");
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span>👤</span>
                      <span>ข้อมูลส่วนตัวและความปลอดภัย</span>
                    </button>

                    {canAccess("admin") && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPage("admin");
                          setShowUserDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span>⚙️</span>
                        <span>ระบบจัดการ & สิทธิ์ RBAC</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={handleInitiateLogout}
                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2.5 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <span>🚪</span>
                      <span>ออกจากระบบ (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleInitiateLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              title="ออกจากระบบ (Logout)"
            >
              🚪
            </button>
          </div>
        </header>

        {/* Main Content Area with RBAC Guard & System Maintenance Check */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F8FAFC]">
          {!canAccess(currentPage) ? (
            renderAccessDenied(currentPage)
          ) : !systemModules[currentPage]?.enabled && currentUserRole !== "admin" ? (
            renderMaintenanceScreen(currentPage)
          ) : (
            <>
              {/* Admin Banner when viewing a module that is disabled system-wide */}
              {!systemModules[currentPage]?.enabled && currentUserRole === "admin" && (
                <div className="max-w-7xl mx-auto mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 text-amber-900">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <div className="text-xs font-bold font-heading">
                        แจ้งเตือนผู้ดูแลระบบ (Admin Maintenance Mode)
                      </div>
                      <div className="text-xs text-amber-800">
                        โมดูล <strong>{systemModules[currentPage]?.name}</strong> อยู่ในสถานะ <strong>ปิดปรับปรุงระบบชั่วคราว</strong> (ผู้ใช้ทั่วไปจะไม่สามารถเข้าถึงได้) คุณกำลังดูเนื้อหาผ่านสิทธิ์ Admin
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleModuleStatus(currentPage)}
                    className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0 shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🟢</span>
                    <span>เปิดใช้งานโมดูลทันที</span>
                  </button>
                </div>
              )}
              {/* ================= DASHBOARD ================= */}
              {currentPage === "dashboard" && (
                <div className="max-w-7xl mx-auto space-y-6">
                  {/* Welcome Hero Banner */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#4F46E5] via-[#4338CA] to-[#0D9488] p-7 md:p-9 text-white shadow-xl shadow-indigo-600/10">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-indigo-100 mb-3 border border-white/20">
                          <span>✨ ระบบสิทธิ์ RBAC เปิดใช้งาน</span>
                          <span>· สิทธิ์ของคุณ: {ROLE_CONFIG[currentUserRole].label}</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold font-heading text-white">
                          สวัสดีตอนเช้า, คุณ{currentUser.name} 👋
                        </h1>
                        <p className="text-indigo-100 text-sm mt-1.5 max-w-xl leading-relaxed">
                          วันนี้คุณมี <span className="font-bold underline text-white">2 งานเร่งด่วน</span> ที่ต้องส่งมอบ และการประชุมสรุปแผนงานผลิตภัณฑ์ในเวลา 11:00 น.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {canAccess("task") && (
                          <button
                            type="button"
                            onClick={() => setCurrentPage("task")}
                            className="px-4 py-2.5 rounded-xl bg-white text-[#4F46E5] text-xs md:text-sm font-bold shadow-md hover:bg-indigo-50 transition-colors"
                          >
                            + เพิ่มงานใหม่
                          </button>
                        )}
                        {canAccess("admin") && (
                          <button
                            type="button"
                            onClick={() => setCurrentPage("admin")}
                            className="px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-xs md:text-sm font-bold border border-white/30 hover:bg-white/30 transition-colors"
                          >
                            ⚙️ จัดการสิทธิ์ RBAC
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4 Overview Stat Widgets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shrink-0 border border-indigo-100">
                        📋
                      </div>
                      <div>
                        <div className="text-2xl font-bold font-heading text-slate-900">{tasks.length} งาน</div>
                        <div className="text-xs text-slate-500 font-medium">งานทั้งหมดในระบบ</div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-2xl shrink-0 border border-teal-100">
                        📹
                      </div>
                      <div>
                        <div className="text-2xl font-bold font-heading text-slate-900">{meetings.length} นัดหมาย</div>
                        <div className="text-xs text-slate-500 font-medium">การประชุมวันนี้</div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shrink-0 border border-amber-100">
                        🚗
                      </div>
                      <div>
                        <div className="text-2xl font-bold font-heading text-slate-900">3 คัน</div>
                        <div className="text-xs text-slate-500 font-medium">รถยนต์พร้อมใช้งาน</div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shrink-0 border border-emerald-100">
                        👥
                      </div>
                      <div>
                        <div className="text-2xl font-bold font-heading text-slate-900">{members.length} คน</div>
                        <div className="text-xs text-slate-500 font-medium">สมาชิกในองค์กร</div>
                      </div>
                    </div>
                  </div>

                  {/* Main 2-Column Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Cols: Urgent Tasks & Meetings */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Urgent Tasks */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h2 className="text-lg font-bold font-heading text-slate-900">งานเร่งด่วนที่ต้องทำ (Priority Tasks)</h2>
                            <p className="text-xs text-slate-500">คลิกที่ช่องเพื่อสลับสถานะของงานได้ทันที</p>
                          </div>
                          {canAccess("task") && (
                            <button
                              type="button"
                              onClick={() => setCurrentPage("task")}
                              className="text-[#4F46E5] text-sm font-semibold hover:underline"
                            >
                              ดูทั้งหมดใน Kanban →
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {tasks.slice(0, 4).map((task) => (
                            <div
                              key={task.id}
                              onClick={() => toggleTaskStatus(task.id)}
                              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/80 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center space-x-3.5">
                                <span className="text-xl">
                                  {task.status === "done" ? "✅" : task.status === "in_progress" ? "🔄" : "📝"}
                                </span>
                                <div>
                                  <div className={`font-semibold text-sm ${task.status === "done" ? "line-through text-slate-400" : "text-slate-800"}`}>
                                    {task.title}
                                  </div>
                                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span className="font-medium text-indigo-600">{task.dept}</span>
                                    <span>·</span>
                                    <span>{task.due}</span>
                                    <span>·</span>
                                    <span>{task.assignee}</span>
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  task.priority === "high"
                                    ? "bg-red-100 text-red-700"
                                    : task.priority === "medium"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {task.priority === "high" ? "🔥 สูง" : task.priority === "medium" ? "🟡 กลาง" : "🟢 ต่ำ"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Today's Meetings */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-bold font-heading text-slate-900">กำหนดการประชุมวันนี้ (Today's Meetings)</h2>
                          {canAccess("meetings") && (
                            <button
                              type="button"
                              onClick={() => setCurrentPage("meetings")}
                              className="text-[#4F46E5] text-sm font-semibold hover:underline"
                            >
                              เปิดปฏิทิน →
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {meetings.slice(0, 2).map((m) => (
                            <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/70 gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                                  <span>📅 {m.timeStr}</span>
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200">{m.location}</span>
                                </div>
                                <h3 className="font-bold text-sm text-slate-900">{m.title}</h3>
                                <div className="text-xs text-slate-500">ผู้เข้าร่วม: {m.attendees.join(", ")}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => showToast(`🎥 กำลังเชื่อมต่อไปยังห้องประชุม: ${m.title}`)}
                                className="px-4 py-2 bg-[#0D9488] text-white rounded-xl text-xs font-bold hover:bg-[#0b7a6f] transition-colors shrink-0 shadow-sm"
                              >
                                📹 เข้าร่วมทันที
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right 1 Col: Team Presence & RBAC Summary */}
                    <div className="space-y-6">
                      {/* Current RBAC Status Card */}
                      <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                            🛡️ บทบาทและสิทธิ์ของคุณ
                          </span>
                          <span className="text-xl">{ROLE_CONFIG[currentUserRole].icon}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 font-heading">
                          {ROLE_CONFIG[currentUserRole].label}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {ROLE_CONFIG[currentUserRole].description}
                        </p>
                        <div className="mt-4 pt-3 border-t border-indigo-100/80 flex items-center justify-between text-xs">
                          <span className="text-slate-500">โมดูลที่เข้าถึงได้:</span>
                          <span className="font-bold text-indigo-700">
                            {Object.values(rolePermissions[currentUserRole]).filter(Boolean).length} / {Object.keys(MODULE_NAMES).length} โมดูล
                          </span>
                        </div>
                      </div>

                      {/* Team Presence */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                        <h2 className="text-lg font-bold font-heading text-slate-900 mb-3">สถานะเพื่อนร่วมงาน (Team Presence)</h2>
                        <div className="space-y-3">
                          {members.slice(0, 4).map((m) => (
                            <div key={m.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center">
                                  {m.avatarText}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">{m.name}</div>
                                  <div className="text-[11px] text-slate-400">{m.department}</div>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${ROLE_CONFIG[m.role].badgeColor}`}>
                                {ROLE_CONFIG[m.role].label.split(" ")[0]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= CHAT ================= */}
              {currentPage === "chat" && (
                <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
                  {/* Channel list */}
                  <div className="w-full md:w-72 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden shrink-0">
                    <div className="p-4 border-b border-slate-100">
                      <h2 className="font-bold font-heading text-base text-slate-900">ห้องแชททั้งหมด</h2>
                      <div className="mt-2 relative">
                        <input
                          type="text"
                          placeholder="ค้นหาห้องหรือเพื่อน..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                        />
                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">🔍</span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {[
                        { name: "ทีมออกแบบ UI/UX", lastTime: "10:31", unread: 3, icon: "👥" },
                        { name: "ทีมพัฒนาซอฟต์แวร์", lastTime: "09:10", unread: 0, icon: "💻" },
                        { name: "ฝ่ายการตลาด & ประชาสัมพันธ์", lastTime: "เมื่อวาน", unread: 0, icon: "📢" },
                        { name: "ห้องประกาศกลาง (Announcements)", lastTime: "2 วันก่อน", unread: 0, icon: "🏢" },
                      ].map((ch) => (
                        <button
                          key={ch.name}
                          type="button"
                          onClick={() => setActiveChannel(ch.name)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                            activeChannel === ch.name
                              ? "bg-indigo-50 border border-indigo-100 text-indigo-900 font-semibold"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center space-x-3 truncate">
                            <span className="text-lg">{ch.icon}</span>
                            <div className="truncate">
                              <div className="text-sm truncate">{ch.name}</div>
                              <div className="text-[11px] text-slate-400">ใช้งานล่าสุด {ch.lastTime}</div>
                            </div>
                          </div>
                          {ch.unread > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4F46E5] text-white">
                              {ch.unread}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat Viewport */}
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">👥</span>
                        <div>
                          <h2 className="font-bold font-heading text-sm text-slate-900">{activeChannel}</h2>
                          <div className="text-xs text-emerald-600 font-semibold">● 6 คนกำลังออนไลน์</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => showToast("📹 กำลังเริ่มการสนทนาทางวิดีโอแบบกลุ่ม...")}
                          className="px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold hover:bg-teal-100 transition-colors"
                        >
                          📹 โทรกลุ่ม
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}
                        >
                          <span className="text-[11px] text-slate-400 mb-1 px-1">
                            {msg.sender} · {msg.time}
                          </span>
                          <div
                            className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                              msg.isMe
                                ? "bg-[#4F46E5] text-white rounded-br-xs"
                                : "bg-slate-100 text-slate-800 rounded-bl-xs"
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 flex gap-2 shrink-0 bg-white">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="พิมพ์ข้อความตอบกลับในห้องแชท..."
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 transition-all text-slate-800"
                      />
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-colors"
                      >
                        ส่งข้อความ
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ================= TASK (KANBAN) ================= */}
              {currentPage === "task" && (
                <div className="max-w-6xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold font-heading text-slate-900">กระดานติดตามงาน (Kanban Board)</h1>
                      <p className="text-slate-500 text-sm mt-0.5">จัดการสถานะและภารกิจของทีมแบบเรียลไทม์</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const title = prompt("กรอกชื่องานใหม่:");
                        if (title) {
                          setTasks((prev) => [
                            ...prev,
                            {
                              id: Date.now(),
                              title,
                              dept: "General",
                              due: "วันนี้",
                              priority: "medium",
                              status: "todo",
                              assignee: currentUser.name,
                            },
                          ]);
                          showToast("✅ เพิ่มงานใหม่เรียบร้อยแล้ว");
                        }
                      }}
                      className="px-4 py-2 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-colors"
                    >
                      + เพิ่มงานใหม่
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Todo */}
                    <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200 flex flex-col">
                      <div className="flex items-center justify-between font-bold font-heading text-sm text-slate-800 mb-3 px-1">
                        <span className="flex items-center gap-2">📝 ยังไม่ได้ทำ (Todo)</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-xs text-slate-700">
                          {tasks.filter((t) => t.status === "todo").length}
                        </span>
                      </div>
                      <div className="space-y-3 flex-1">
                        {tasks.filter((t) => t.status === "todo").map((task) => (
                          <div
                            key={task.id}
                            onClick={() => toggleTaskStatus(task.id)}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow cursor-pointer"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-sm text-slate-800">{task.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${task.priority === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                                {task.priority === "high" ? "🔥 สูง" : "🟡 กลาง"}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex justify-between mt-3">
                              <span>👤 {task.assignee}</span>
                              <span>📅 {task.due}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* In Progress */}
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex flex-col">
                      <div className="flex items-center justify-between font-bold font-heading text-sm text-indigo-900 mb-3 px-1">
                        <span className="flex items-center gap-2">🔄 กำลังดำเนินการ (In Progress)</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-xs text-indigo-700 font-bold">
                          {tasks.filter((t) => t.status === "in_progress").length}
                        </span>
                      </div>
                      <div className="space-y-3 flex-1">
                        {tasks.filter((t) => t.status === "in_progress").map((task) => (
                          <div
                            key={task.id}
                            onClick={() => toggleTaskStatus(task.id)}
                            className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs hover:shadow-md transition-shadow cursor-pointer"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-sm text-slate-800">{task.title}</span>
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">🔥 สูง</span>
                            </div>
                            <div className="text-xs text-slate-500 flex justify-between mt-3">
                              <span>👤 {task.assignee}</span>
                              <span>📅 {task.due}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Done */}
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col">
                      <div className="flex items-center justify-between font-bold font-heading text-sm text-emerald-900 mb-3 px-1">
                        <span className="flex items-center gap-2">✅ เสร็จสิ้นแล้ว (Done)</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-xs text-emerald-700 font-bold">
                          {tasks.filter((t) => t.status === "done").length}
                        </span>
                      </div>
                      <div className="space-y-3 flex-1">
                        {tasks.filter((t) => t.status === "done").map((task) => (
                          <div
                            key={task.id}
                            onClick={() => toggleTaskStatus(task.id)}
                            className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs hover:shadow-md transition-shadow cursor-pointer"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-sm line-through text-slate-400">{task.title}</span>
                              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">🟢 ต่ำ</span>
                            </div>
                            <div className="text-xs text-slate-500 flex justify-between mt-3">
                              <span>👤 {task.assignee}</span>
                              <span>✅ เรียบร้อย</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= MEETINGS ================= */}
              {currentPage === "meetings" && (
                <div className="max-w-6xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold font-heading text-slate-900">การประชุมและนัดหมาย (Meetings)</h1>
                      <p className="text-slate-500 text-sm mt-0.5">จัดการตารางประชุมและห้องออนไลน์ขององค์กร</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast("📅 เปิดหน้าต่างสร้างการประชุมเรียบร้อย")}
                      className="px-4 py-2 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-colors"
                    >
                      + สร้างการประชุมใหม่
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {meetings.map((m) => (
                      <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                        <div>
                          <div className="flex items-center justify-between text-xs text-[#4F46E5] font-bold mb-2">
                            <span>{m.dateStr} · {m.timeStr}</span>
                            <span>{m.type === "online" ? "🌐 Online" : "🏢 Onsite"}</span>
                          </div>
                          <h3 className="text-base font-bold font-heading text-slate-900 mb-2">{m.title}</h3>
                          <p className="text-xs text-slate-500 leading-relaxed mb-3">
                            สถานที่: <span className="font-semibold text-slate-700">{m.location}</span>
                          </p>
                          <div className="text-xs text-slate-400">
                            ผู้เข้าร่วม: {m.attendees.join(", ")}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => showToast(`📹 กำลังเข้าห้องประชุม: ${m.title}`)}
                            className="flex-1 py-2 bg-[#0D9488] text-white rounded-xl text-xs font-bold hover:bg-[#0b7a6f] transition-colors"
                          >
                            📹 เข้าห้องประชุม
                          </button>
                          <button
                            type="button"
                            onClick={() => showToast(`📋 ดูรายละเอียดการประชุม ${m.title}`)}
                            className="px-3.5 py-2 bg-indigo-50 text-[#4F46E5] border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
                          >
                            รายละเอียด
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ================= CAR BOOKING ================= */}
              {currentPage === "carbooking" && (
                <div className="max-w-6xl mx-auto space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold font-heading text-slate-900">
                      ระบบจองรถยนต์สำนักงาน (Car Booking)
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                      บริการจองยานพาหนะส่วนกลางเพื่อปฏิบัติภารกิจนอกสถานที่
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { name: "Volvo XC60", icon: "🚗", desc: "4 ที่นั่ง · Auto · แอร์แยกโซน", rate: "1,200 บาท / ชั่วโมง", status: "พร้อมใช้งาน" },
                          { name: "Toyota Hilux 4WD", icon: "🚙", desc: "5 ที่นั่ง · ขับเคลื่อน 4 ล้อ · บรรทุกสัมภาระ", rate: "1,500 บาท / ชั่วโมง", status: "พร้อมใช้งาน" },
                          { name: "Honda CR-V e:HEV", icon: "🚙", desc: "5 ที่นั่ง · ไฮบริดประหยัดพลังงาน", rate: "1,000 บาท / ชั่วโมง", status: "พร้อมใช้งาน" },
                          { name: "Mitsubishi L200", icon: "🛻", desc: "2 ที่นั่ง · เกียร์ธรรมดา · กระบะบรรทุก", rate: "800 บาท / วัน", status: "งานขนส่ง" },
                        ].map((car) => (
                          <div
                            key={car.name}
                            onClick={() => setSelectedCar(car.name)}
                            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                              selectedCar === car.name
                                ? "border-[#4F46E5] bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-md"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-3xl">{car.icon}</span>
                              <span className="text-xs px-2.5 py-1 bg-indigo-100 text-[#4F46E5] rounded-full font-bold">
                                {car.status}
                              </span>
                            </div>
                            <h3 className="font-bold font-heading text-base text-slate-900">{car.name}</h3>
                            <div className="text-xs text-slate-500 mt-1">{car.desc}</div>
                            <div className="mt-3 text-sm font-bold text-[#0D9488]">{car.rate}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                      <form onSubmit={handleBookCar} className="space-y-4">
                        <h2 className="text-lg font-bold font-heading text-slate-900">แบบฟอร์มคำขอจอง</h2>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">รถที่เลือก</label>
                          <input
                            type="text"
                            readOnly
                            value={selectedCar}
                            className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">วันที่และเวลาที่ต้องการใช้</label>
                          <input
                            type="datetime-local"
                            defaultValue="2026-10-09T10:00"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อผู้ขอใช้งาน</label>
                          <input
                            type="text"
                            readOnly
                            value={`คุณ ${currentUser.name}`}
                            className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-800 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">วัตถุประสงค์การเดินทาง</label>
                          <textarea
                            rows={3}
                            value={bookingDestination}
                            onChange={(e) => setBookingDestination(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 bg-[#0D9488] text-white rounded-xl text-sm font-bold shadow-md shadow-teal-700/20 hover:bg-[#0b7a6f] transition-colors"
                        >
                          ✓ ยืนยันการจองรถ
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= REPORTS ================= */}
              {currentPage === "reports" && (
                <div className="max-w-6xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold font-heading text-slate-900">รายงานและสถิติ (Reports & Analytics)</h1>
                      <p className="text-slate-500 text-sm mt-0.5">ข้อมูลสรุปประสิทธิภาพและการใช้งานทรัพยากรรายเดือน</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast("📥 กำลังดาวน์โหลดรายงาน PDF สรุปประจำเดือน...")}
                      className="px-4 py-2 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-colors"
                    >
                      📥 ส่งออกรายงาน PDF
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                      <div className="text-xs text-slate-500 font-medium">อัตราความสำเร็จของงาน (Task Rate)</div>
                      <div className="text-3xl font-bold font-heading text-emerald-600 mt-1">87.5%</div>
                      <div className="text-xs text-slate-500 mt-1">↑ เพิ่มขึ้น 4.2% จากสัปดาห์ก่อน</div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                      <div className="text-xs text-slate-500 font-medium">ชั่วโมงการประชุมสะสม</div>
                      <div className="text-3xl font-bold font-heading text-[#4F46E5] mt-1">14.5 ชม.</div>
                      <div className="text-xs text-slate-500 mt-1">เฉลี่ย 1.8 ชม. / วัน</div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                      <div className="text-xs text-slate-500 font-medium">การใช้งานรถยนต์สำนักงาน</div>
                      <div className="text-3xl font-bold font-heading text-amber-600 mt-1">6 ครั้ง</div>
                      <div className="text-xs text-slate-500 mt-1">ประหยัดค่าเดินทาง 3,400 บาท</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                      <h2 className="text-base font-bold font-heading text-slate-900 mb-4">สัดส่วนภารกิจตามสถานะ</h2>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-emerald-700">เสร็จสิ้นแล้ว (Done)</span>
                            <span>55%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: "55%" }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-indigo-700">กำลังดำเนินการ (In Progress)</span>
                            <span>30%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: "30%" }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-amber-700">รอเริ่มงาน (Todo)</span>
                            <span>15%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: "15%" }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                      <h2 className="text-base font-bold font-heading text-slate-900 mb-4">รายงานที่ดาวน์โหลดล่าสุด</h2>
                      <div className="space-y-3">
                        {[
                          { title: "รายงานการใช้รถยนต์ประจำเดือน ก.ย.", size: "1.4 MB", date: "1 ต.ค." },
                          { title: "สรุปชั่วโมงประชุมและผู้เข้าร่วม Q3", size: "850 KB", date: "30 ก.ย." },
                          { title: "รายงานภาพรวมภารกิจ Kanban ประจำสัปดาห์", size: "620 KB", date: "5 ต.ค." },
                        ].map((rep) => (
                          <div key={rep.title} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div>
                              <div className="text-xs font-semibold text-slate-800">{rep.title}</div>
                              <div className="text-[10px] text-slate-400">{rep.date} · {rep.size}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => showToast(`📥 เริ่มดาวน์โหลด: ${rep.title}`)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100"
                            >
                              ดาวน์โหลด
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= ADMIN & RBAC CONTROL CENTER ================= */}
              {currentPage === "admin" && (
                <div className="max-w-6xl mx-auto space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-1">
                        <span>🛡️ RBAC Control Center</span>
                        <span>· Role-Based Access Control</span>
                      </div>
                      <h1 className="text-2xl font-bold font-heading text-slate-900">
                        ระบบจัดการสมาชิก & กำหนดสิทธิ์โมดูล
                      </h1>
                      <p className="text-slate-500 text-sm mt-0.5">
                        ควบคุมการเข้าถึง 8 โมดูลหลัก กำหนดบทบาทรายบุคคล และตรวจสอบประวัติ Audit Log
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddMemberModal(true)}
                      className="px-4 py-2.5 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-colors shrink-0"
                    >
                      + เชิญสมาชิกใหม่
                    </button>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                      <div className="text-xs text-slate-500 font-medium">สมาชิกทั้งหมด</div>
                      <div className="text-2xl font-bold font-heading text-slate-900 mt-1">{members.length} คน</div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                      <div className="text-xs text-slate-500 font-medium">ผู้ดูแล (Admins)</div>
                      <div className="text-2xl font-bold font-heading text-indigo-600 mt-1">
                        {members.filter((m) => m.role === "admin").length} คน
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                      <div className="text-xs text-slate-500 font-medium">ผู้จัดการ (Managers)</div>
                      <div className="text-2xl font-bold font-heading text-teal-600 mt-1">
                        {members.filter((m) => m.role === "manager").length} คน
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                      <div className="text-xs text-slate-500 font-medium">โมดูลในระบบ</div>
                      <div className="text-2xl font-bold font-heading text-slate-900 mt-1">8 โมดูล</div>
                    </div>
                  </div>

                  {/* Navigation Tabs for Admin */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="flex border-b border-slate-200 px-6 pt-3 gap-2 bg-slate-50/50">
                      {[
                        { id: "members", label: "👥 รายชื่อสมาชิก & จัดการสิทธิ์", count: members.length },
                        { id: "matrix", label: "🔒 ตารางกำหนดสิทธิ์รายโมดูล (RBAC Matrix)" },
                        { id: "audit", label: "📜 ประวัติการเข้าถึง (Audit Logs)", count: auditLogs.length },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAdminTab(tab.id as any)}
                          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                            adminTab === tab.id
                              ? "border-[#4F46E5] text-[#4F46E5] bg-white rounded-t-xl"
                              : "border-transparent text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <span>{tab.label}</span>
                          {tab.count !== undefined && (
                            <span className="px-2 py-0.2 rounded-full text-xs bg-slate-200/70 text-slate-700">
                              {tab.count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="p-6">
                      {/* TAB 1: MEMBERS MANAGEMENT */}
                      {adminTab === "members" && (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                              <input
                                type="text"
                                placeholder="ค้นหาตามชื่อ ตำแหน่ง หรือกลุ่ม/ฝ่าย..."
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#4F46E5]"
                              />
                              <span className="absolute left-3 top-3 text-slate-400 text-xs">🔍</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setShowAddMemberModal(true)}
                                className="px-3.5 py-2 bg-[#4F46E5] text-white rounded-xl text-xs font-bold hover:bg-[#4338CA] shadow-sm flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>+</span>
                                <span>เพิ่มบุคลากรใหม่</span>
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider bg-slate-50/60">
                                  <th className="py-3 px-4">บุคลากร / เจ้าหน้าที่</th>
                                  <th className="py-3 px-4">ตำแหน่ง & กลุ่ม/ฝ่าย</th>
                                  <th className="py-3 px-4">ช่องทางติดต่อ</th>
                                  <th className="py-3 px-4">สิทธิ์ (Role)</th>
                                  <th className="py-3 px-4">สถานะ</th>
                                  <th className="py-3 px-4 text-center">การดำเนินการ (Actions)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {members
                                  .filter(
                                    (m) =>
                                      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                                      (m.nickname && m.nickname.toLowerCase().includes(memberSearch.toLowerCase())) ||
                                      (m.position && m.position.toLowerCase().includes(memberSearch.toLowerCase())) ||
                                      (m.division && m.division.toLowerCase().includes(memberSearch.toLowerCase())) ||
                                      m.email.toLowerCase().includes(memberSearch.toLowerCase())
                                  )
                                  .map((m) => (
                                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                                      <td className="py-3.5 px-4">
                                        <div className="flex items-center space-x-3">
                                          {m.avatarUrl ? (
                                            <img
                                              src={m.avatarUrl}
                                              alt={m.name}
                                              className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                                              onClick={() => setViewingMember(m)}
                                            />
                                          ) : (
                                            <div
                                              onClick={() => setViewingMember(m)}
                                              className="w-9 h-9 rounded-xl bg-indigo-100 text-[#4F46E5] font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200 cursor-pointer hover:scale-105 transition-transform"
                                            >
                                              {m.avatarText}
                                            </div>
                                          )}
                                          <div>
                                            <div
                                              onClick={() => setViewingMember(m)}
                                              className="font-bold text-slate-900 text-xs flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors"
                                            >
                                              <span>{m.name}</span>
                                              {m.nickname && (
                                                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded-md">
                                                  ({m.nickname})
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[11px] text-slate-400 font-mono">{m.email}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs font-semibold text-slate-800">{m.position}</span>
                                          {m.personnelType && (
                                            <span
                                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                                PERSONNEL_TYPE_CONFIG[m.personnelType]?.badgeColor ||
                                                "bg-slate-100 text-slate-600 border-slate-200"
                                              }`}
                                            >
                                              {PERSONNEL_TYPE_CONFIG[m.personnelType]?.icon} {m.personnelType}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-indigo-600 font-medium">{m.division}</div>
                                      </td>
                                      <td className="py-3.5 px-4 text-xs">
                                        <div className="text-slate-700 flex items-center gap-1">
                                          <span>📞</span>
                                          <span>{m.phone || "-"}</span>
                                        </div>
                                        <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                                          <span className="text-emerald-600 font-bold">Line:</span>
                                          <span className="font-mono text-[11px]">{m.lineId || "-"}</span>
                                        </div>
                                      </td>
                                      <td className="py-3.5 px-4">
                                        <select
                                          value={m.role}
                                          onChange={(e) => handleChangeMemberRole(m.id, e.target.value as Role)}
                                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${ROLE_CONFIG[m.role].badgeColor}`}
                                        >
                                          <option value="admin">👑 Admin</option>
                                          <option value="manager">👔 Manager</option>
                                          <option value="member">👤 Member</option>
                                          <option value="guest">🎟️ Guest</option>
                                        </select>
                                      </td>
                                      <td className="py-3.5 px-4">
                                        <span
                                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                            m.status === "active"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : "bg-slate-100 text-slate-500 border-slate-200"
                                          }`}
                                        >
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                              m.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                                            }`}
                                          />
                                          {m.status === "active" ? "Active" : "Inactive"}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => setViewingMember(m)}
                                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                            title="ดูรายละเอียดบุคลากรและสิทธิ์การเข้าถึง"
                                          >
                                            <span>👁️</span>
                                            <span className="hidden sm:inline">ดู</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenAdminEdit(m)}
                                            className="px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                            title="แก้ไขข้อมูลส่วนบุคคลและสิทธิ์"
                                          >
                                            <span>✏️</span>
                                            <span className="hidden sm:inline">แก้ไข</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setMemberToDelete(m)}
                                            disabled={m.id === "usr_1" || (currentUser ? m.id === currentUser.id : false)}
                                            className="px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                                            title={
                                              m.id === "usr_1"
                                                ? "บัญชีผู้บริหารหลักไม่สามารถลบได้"
                                                : currentUser && m.id === currentUser.id
                                                ? "ไม่สามารถลบบัญชีที่กำลังล็อกอินอยู่ได้"
                                                : "ลบบุคลากรออกจากระบบ"
                                            }
                                          >
                                            <span>🗑️</span>
                                            <span className="hidden sm:inline">ลบ</span>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: RBAC MATRIX & SYSTEM MODULE CONTROLS */}
                      {adminTab === "matrix" && (
                        <div className="space-y-6">
                          {/* Banner & Overview */}
                          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <span className="text-2xl shrink-0">🛡️</span>
                              <div className="text-xs leading-relaxed text-indigo-900">
                                <span className="font-bold block text-sm mb-0.5">
                                  ศูนย์ควบคุมสิทธิ์ & สถานะโมดูล (Module Lifecycle & RBAC Matrix)
                                </span>
                                ผู้ดูแลระบบสามารถ <strong>เปิด/ปิด โมดูลระบบ</strong> (เช่น ปิดปรับปรุงชั่วคราว), <strong>แก้ไขรายละเอียดโมดูล</strong>, และ <strong>ติ๊กเปิด/ปิด สิทธิ์รายบทบาท</strong> ได้แบบเรียลไทม์
                              </div>
                            </div>
                            <span className="px-3 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-bold shrink-0 hidden sm:inline-block shadow-2xs">
                              ⚡ อัปเดตทันที (Live RBAC)
                            </span>
                          </div>

                          {/* SYSTEM-WIDE MODULE STATUS CARDS */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-bold font-heading text-slate-900 flex items-center gap-2">
                                <span>🎛️ การเปิด/ปิด และจัดการโมดูลระดับระบบ (System Module Controls)</span>
                                <span className="text-[11px] font-normal text-slate-500">
                                  (เปิดใช้งาน {Object.values(systemModules).filter((m) => m.enabled).length}/8 โมดูล)
                                </span>
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {(Object.keys(systemModules) as ModuleId[]).map((modId) => {
                                const mod = systemModules[modId];
                                const isLocked = modId === "admin";
                                return (
                                  <div
                                    key={modId}
                                    className={`p-4 rounded-2xl border transition-all ${
                                      mod.enabled
                                        ? "bg-white border-slate-200/90 shadow-xs hover:border-indigo-300"
                                        : "bg-amber-50/40 border-amber-200/80 shadow-xs"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="flex items-center space-x-2.5">
                                        <span className="text-2xl">{mod.icon}</span>
                                        <div>
                                          <div className="font-bold text-xs text-slate-900 leading-tight truncate max-w-[120px]">
                                            {mod.name.split(" (")[0]}
                                          </div>
                                          <div className="text-[10px] text-slate-400 font-mono">{mod.id}</div>
                                        </div>
                                      </div>

                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                                          mod.enabled
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-red-50 text-red-700 border-red-200"
                                        }`}
                                      >
                                        {mod.enabled ? "● เปิดใช้" : "⛔ ปิดปรับปรุง"}
                                      </span>
                                    </div>

                                    <p className="text-[11px] text-slate-500 line-clamp-2 h-8 mb-3 leading-relaxed">
                                      {mod.desc}
                                    </p>

                                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleModuleStatus(modId)}
                                        disabled={isLocked}
                                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                          mod.enabled
                                            ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                        }`}
                                        title={isLocked ? "ไม่สามารถปิดโมดูล Admin Panel ได้" : "คลิกเพื่อสลับสถานะเปิด/ปิด"}
                                      >
                                        <span>{mod.enabled ? "⛔ ปิดโมดูล" : "🟢 เปิดโมดูล"}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditModule(modId)}
                                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                        title="แก้ไขชื่อและรายละเอียดโมดูล"
                                      >
                                        <span>✏️</span>
                                        <span>แก้ไข</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* GRANULAR RBAC MATRIX TABLE */}
                          <div className="space-y-3 pt-2">
                            <h3 className="text-sm font-bold font-heading text-slate-900 flex items-center gap-2">
                              <span>🔒 ตารางกำหนดสิทธิ์รายบทบาท (Granular Role Permissions)</span>
                            </h3>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                  <tr className="border-b-2 border-slate-200 text-xs uppercase bg-slate-50">
                                    <th className="py-3.5 px-4 font-bold text-slate-700">โมดูลการทำงาน</th>
                                    <th className="py-3.5 px-4 font-bold text-slate-700 text-center">สถานะระบบ</th>
                                    {(["admin", "manager", "member", "guest"] as Role[]).map((r) => (
                                      <th key={r} className="py-3.5 px-4 text-center font-bold">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <span>{ROLE_CONFIG[r].icon}</span>
                                          <span>{ROLE_CONFIG[r].label.split(" ")[0]}</span>
                                        </div>
                                      </th>
                                    ))}
                                    <th className="py-3.5 px-4 font-bold text-slate-700 text-center">ตั้งค่าโมดูล</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(Object.keys(systemModules) as ModuleId[]).map((modId) => {
                                    const mod = systemModules[modId];
                                    return (
                                      <tr key={modId} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3.5 px-4">
                                          <div className="flex items-center space-x-3">
                                            <span className="text-xl">{mod.icon}</span>
                                            <div>
                                              <div className="font-bold text-slate-900">{mod.name}</div>
                                              <div className="text-[11px] text-slate-500">{mod.desc}</div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleModuleStatus(modId)}
                                            disabled={modId === "admin"}
                                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                              mod.enabled
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                            }`}
                                          >
                                            {mod.enabled ? "🟢 เปิดใช้งาน" : "⛔ ปิดปรับปรุง"}
                                          </button>
                                        </td>
                                        {(["admin", "manager", "member", "guest"] as Role[]).map((r) => {
                                          const allowed = rolePermissions[r]?.[modId];
                                          const isLockedAdmin = r === "admin" && (modId === "admin" || modId === "dashboard");
                                          return (
                                            <td key={r} className="py-3.5 px-4 text-center">
                                              <label className="inline-flex items-center justify-center cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors">
                                                <input
                                                  type="checkbox"
                                                  checked={allowed}
                                                  disabled={isLockedAdmin}
                                                  onChange={() => handleTogglePermission(r, modId)}
                                                  className="w-5 h-5 accent-[#4F46E5] rounded cursor-pointer disabled:opacity-50"
                                                />
                                              </label>
                                            </td>
                                          );
                                        })}
                                        <td className="py-3.5 px-4 text-center">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditModule(modId)}
                                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                                            title="แก้ไขข้อมูลโมดูล"
                                          >
                                            ✏️ แก้ไข
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 3: AUDIT LOGS */}
                      {adminTab === "audit" && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold font-heading text-sm text-slate-900">บันทึกกิจกรรมความปลอดภัยและสิทธิ์ล่าสุด</h3>
                            <button
                              type="button"
                              onClick={() => {
                                setAuditLogs(INITIAL_AUDIT_LOGS);
                                showToast("🔄 รีเซ็ต Audit Log เรียบร้อย");
                              }}
                              className="text-xs text-[#4F46E5] font-semibold hover:underline"
                            >
                              รีเฟรชบันทึก
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {auditLogs.map((log) => (
                              <div
                                key={log.id}
                                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                                  log.status === "denied"
                                    ? "bg-red-50/60 border-red-200/80"
                                    : "bg-slate-50 border-slate-200/70"
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                        log.status === "denied"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-emerald-100 text-emerald-800"
                                      }`}
                                    >
                                      {log.status === "denied" ? "✕ DENIED (403)" : "✓ SUCCESS"}
                                    </span>
                                    <span className="font-bold text-slate-800">{log.actor}</span>
                                    <span className="text-slate-400">· {log.timestamp}</span>
                                  </div>
                                  <div className="text-slate-700 font-medium">{log.action}</div>
                                </div>
                                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 font-mono text-[11px] shrink-0 self-start sm:self-auto">
                                  {log.target}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ================= USER PROFILE ================= */}
              {currentPage === "user" && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
                    {/* Personnel Header Profile */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-5">
                        {currentUser.avatarUrl ? (
                          <img
                            src={currentUser.avatarUrl}
                            alt={currentUser.name}
                            className="w-16 h-16 rounded-2xl object-cover border border-indigo-200 shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-[#4F46E5] text-2xl font-black flex items-center justify-center border border-indigo-200 shrink-0">
                            {currentUser.avatarText}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold font-heading text-slate-900">{currentUser.name}</h2>
                            {currentUser.nickname && (
                              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                ({currentUser.nickname})
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                (currentUser.personnelType &&
                                  PERSONNEL_TYPE_CONFIG[currentUser.personnelType]?.badgeColor) ||
                                "bg-indigo-50 text-indigo-700 border-indigo-200"
                              }`}
                            >
                              {(currentUser.personnelType &&
                                PERSONNEL_TYPE_CONFIG[currentUser.personnelType]?.icon) ||
                                "🏛️"}{" "}
                              {currentUser.personnelType || "ข้าราชการ"}
                            </span>
                          </div>
                          <p className="text-xs text-indigo-600 font-semibold mt-0.5">{currentUser.position}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{currentUser.division}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenEditProfile}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                      >
                        <span>✏️</span>
                        <span>แก้ไขข้อมูลส่วนตัว</span>
                      </button>
                    </div>

                    {/* Government Personnel Info Grid */}
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold font-heading text-slate-800">
                          🏛️ ข้อมูลส่วนบุคคลข้าราชการและเจ้าหน้าที่รัฐ
                        </h3>
                        <span className="text-[11px] text-slate-400">OmniOffice Government Profile v1.0</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[11px] text-slate-400">คำนำหน้า</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{currentUser.prefix || "นาย"}</div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[11px] text-slate-400">ชื่อ</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">
                            {currentUser.firstName || currentUser.name.split(" ")[0]}
                          </div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[11px] text-slate-400">นามสกุล</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">
                            {currentUser.lastName || currentUser.name.split(" ").slice(1).join(" ") || "-"}
                          </div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[11px] text-slate-400">ชื่อเล่น (Nickname)</div>
                          <div className="text-sm font-bold text-indigo-700 mt-0.5">
                            {currentUser.nickname ? `คุณ${currentUser.nickname}` : "-"}
                          </div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[11px] text-slate-400">ประเภทบุคลากร</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                            <span>
                              {(currentUser.personnelType &&
                                PERSONNEL_TYPE_CONFIG[currentUser.personnelType]?.icon) ||
                                "🏛️"}
                            </span>
                            <span className="truncate">{currentUser.personnelType || "ข้าราชการ"}</span>
                          </div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[11px] text-slate-400">บทบาทสิทธิ์ (RBAC)</div>
                          <div className="text-sm font-bold text-indigo-600 mt-0.5 flex items-center gap-1">
                            <span>{ROLE_CONFIG[currentUserRole].icon}</span>
                            <span>{ROLE_CONFIG[currentUserRole].label.split(" ")[0]}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[11px] text-slate-400">ตำแหน่งงานราชการ</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{currentUser.position}</div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[11px] text-slate-400">กลุ่ม/ฝ่าย (Division / Section)</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{currentUser.division}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[11px] text-slate-400">อีเมลราชการ</div>
                          <div className="text-xs font-bold text-indigo-600 mt-0.5 font-mono truncate">
                            {currentUser.email}
                          </div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[11px] text-slate-400">หมายเลขโทรศัพท์</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                            <span>📞</span>
                            <span>{currentUser.phone || "02-612-6000"}</span>
                          </div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[11px] text-slate-400">Line ID</div>
                          <div className="text-sm font-bold text-emerald-700 mt-0.5 flex items-center gap-1 font-mono">
                            <span>💬</span>
                            <span>{currentUser.lineId || "-"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold font-heading text-slate-800 mb-2">การตั้งค่าส่วนบุคคล</h3>
                      <div className="space-y-2.5">
                        <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100/60 transition-colors">
                          <span className="text-sm font-medium text-slate-800">🔔 การแจ้งเตือนผ่านเบราว์เซอร์</span>
                          <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#4F46E5]" />
                        </label>
                        <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100/60 transition-colors">
                          <span className="text-sm font-medium text-slate-800">🌙 โหมดกลางคืน (Dark Theme)</span>
                          <input
                            type="checkbox"
                            checked={isDarkMode}
                            onChange={(e) => setIsDarkMode(e.target.checked)}
                            className="w-4 h-4 accent-[#4F46E5]"
                          />
                        </label>
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-sm font-medium text-slate-800">🌐 ภาษาที่แสดงผล</span>
                          <span className="text-sm font-bold text-slate-800">🇹🇭 ภาษาไทย (TH)</span>
                        </div>
                      </div>
                    </div>

                    {/* Active Sessions & Security */}
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold font-heading text-slate-800">
                          🛡️ อุปกรณ์และเซสชันที่ใช้งานอยู่ (Active Sessions)
                        </h3>
                        <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          ● เชื่อมต่อปลอดภัย SSL
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">💻</span>
                            <div>
                              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <span>Windows 11 · Google Chrome</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                                  อุปกรณ์ปัจจุบัน
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                IP: 192.168.1.104 · เข้าสู่ระบบเมื่อ: {loginTime}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            ออนไลน์
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between opacity-80">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">📱</span>
                            <div>
                              <div className="text-xs font-bold text-slate-800">
                                iOS 18 · Safari Mobile (iPhone 15 Pro)
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                IP: 171.100.82.15 · ใช้งานล่าสุด: เมื่อวานนี้ 18:45 น.
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => showToast("🔒 บังคับออกจากระบบอุปกรณ์อื่นสำเร็จแล้ว")}
                            className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                          >
                            ยกเลิกเซสชัน
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => showToast("🔑 ส่งลิงก์เปลี่ยนรหัสผ่านไปยังอีเมลของคุณแล้ว")}
                        className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                      >
                        เปลี่ยนรหัสผ่าน
                      </button>
                      <button
                        type="button"
                        onClick={handleInitiateLogout}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🚪</span>
                        <span>ออกจากระบบ</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        user={currentUser}
        role={currentUserRole}
      />

      {/* ─── MODAL 1: VIEW MEMBER DOSSIER MODAL (ดูรายละเอียดสมาชิก) ─── */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <div>
                  <h3 className="text-lg font-bold font-heading text-slate-900">แฟ้มข้อมูลบุคลากรภาครัฐ</h3>
                  <p className="text-xs text-slate-500">ข้อมูลส่วนบุคคลและสิทธิ์การเข้าใช้งานระบบ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center gap-4 py-5 border-b border-slate-100 text-center sm:text-left">
              {viewingMember.avatarUrl ? (
                <img
                  src={viewingMember.avatarUrl}
                  alt={viewingMember.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-200 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-indigo-100 text-[#4F46E5] font-bold text-2xl flex items-center justify-center border-2 border-indigo-200 shrink-0">
                  {viewingMember.avatarText}
                </div>
              )}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h4 className="text-lg font-bold font-heading text-slate-900">{viewingMember.name}</h4>
                  {viewingMember.nickname && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
                      ({viewingMember.nickname})
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      (viewingMember.personnelType &&
                        PERSONNEL_TYPE_CONFIG[viewingMember.personnelType]?.badgeColor) ||
                      "bg-indigo-50 text-indigo-700 border-indigo-200"
                    }`}
                  >
                    {(viewingMember.personnelType &&
                      PERSONNEL_TYPE_CONFIG[viewingMember.personnelType]?.icon) ||
                      "🏛️"}{" "}
                    {viewingMember.personnelType || "ข้าราชการ"}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${ROLE_CONFIG[viewingMember.role].badgeColor}`}
                  >
                    {ROLE_CONFIG[viewingMember.role].label}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700">{viewingMember.position}</div>
                <div className="text-xs text-indigo-600 font-medium">{viewingMember.division}</div>
              </div>
            </div>

            {/* Personnel Dossier Grid */}
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">คำนำหน้า</span>
                  <span className="font-bold text-slate-800">{viewingMember.prefix || "-"}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">ชื่อ - นามสกุล</span>
                  <span className="font-bold text-slate-800">
                    {viewingMember.firstName} {viewingMember.lastName}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">ชื่อเล่น (Nickname)</span>
                  <span className="font-bold text-indigo-700">{viewingMember.nickname || "-"}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">ประเภทบุคลากร</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <span>
                      {(viewingMember.personnelType &&
                        PERSONNEL_TYPE_CONFIG[viewingMember.personnelType]?.icon) ||
                        "🏛️"}
                    </span>
                    <span className="truncate">{viewingMember.personnelType || "ข้าราชการ"}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">อีเมลทางการ</span>
                  <span className="font-mono text-slate-800 font-bold truncate block">
                    {viewingMember.email}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">เบอร์โทรศัพท์</span>
                  <span className="font-bold text-slate-800">{viewingMember.phone || "-"}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Line ID</span>
                  <span className="font-mono text-emerald-700 font-bold">{viewingMember.lineId || "-"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">สถานะการทำงาน</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {viewingMember.status === "active" ? "ปฏิบัติงานปกติ (Active)" : "พักการใช้งาน (Inactive)"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">วันที่เริ่มงาน / บรรจุ</span>
                  <span className="font-bold text-slate-800">{viewingMember.joinedDate || "1 ม.ค. 2024"}</span>
                </div>
              </div>

              {/* Accessible Modules by Role */}
              <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs">
                <span className="text-slate-600 font-bold block mb-2">
                  โมดูลที่เข้าถึงได้ตามสิทธิ์ ({ROLE_CONFIG[viewingMember.role].label}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(systemModules) as ModuleId[]).map((modId) => {
                    const hasAccess = rolePermissions[viewingMember.role]?.[modId];
                    const mod = systemModules[modId];
                    return (
                      <span
                        key={modId}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 ${
                          hasAccess
                            ? "bg-white text-indigo-900 border border-indigo-200 shadow-2xs"
                            : "bg-slate-100 text-slate-400 line-through opacity-60"
                        }`}
                      >
                        <span>{mod.icon}</span>
                        <span>{mod.name.split(" (")[0]}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const m = viewingMember;
                    setViewingMember(null);
                    handleOpenAdminEdit(m);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#4F46E5] text-white text-xs font-bold hover:bg-[#4338CA] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>✏️</span>
                  <span>แก้ไขข้อมูล</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const m = viewingMember;
                    setViewingMember(null);
                    setMemberToDelete(m);
                  }}
                  disabled={viewingMember.id === "usr_1" || (currentUser ? viewingMember.id === currentUser.id : false)}
                  className="px-3.5 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>🗑️</span>
                  <span>ลบ</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ADMIN EDIT MEMBER MODAL (แก้ไขข้อมูลสมาชิก) ─── */}
      {adminEditingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold font-heading text-slate-900">
                  ✏️ แก้ไขข้อมูลบุคลากร & กำหนดสิทธิ์
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ปรับปรุงข้อมูลส่วนบุคคล ตำแหน่ง กลุ่ม/ฝ่าย และบทบาทในระบบ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdminEditingMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminSaveMember} className="space-y-3.5 mt-4">
              {/* Row 1: คำนำหน้า, ชื่อ, นามสกุล, ชื่อเล่น */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">คำนำหน้า</label>
                  <select
                    value={adminEditForm.prefix}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, prefix: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="ดร.">ดร.</option>
                    <option value="ว่าที่ ร.ต.">ว่าที่ ร.ต.</option>
                    <option value="อาจารย์">อาจารย์</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ</label>
                  <input
                    type="text"
                    required
                    value={adminEditForm.firstName}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">นามสกุล</label>
                  <input
                    type="text"
                    required
                    value={adminEditForm.lastName}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อเล่น (Nickname)</label>
                  <input
                    type="text"
                    placeholder="เช่น เสก, บอย"
                    value={adminEditForm.nickname}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, nickname: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              {/* Row 2: ประเภทบุคลากร, ตำแหน่ง & กลุ่ม/ฝ่าย */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ประเภทบุคลากร</label>
                  <select
                    value={adminEditForm.personnelType}
                    onChange={(e) =>
                      setAdminEditForm({ ...adminEditForm, personnelType: e.target.value as PersonnelType })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                  >
                    {GOVERNMENT_PERSONNEL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {PERSONNEL_TYPE_CONFIG[type].icon} {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ตำแหน่ง (Position)</label>
                  <input
                    type="text"
                    required
                    value={adminEditForm.position}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">กลุ่ม/ฝ่าย (Division / Section)</label>
                  <select
                    value={adminEditForm.division}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, division: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    {GOVERNMENT_DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: อีเมล, โทรศัพท์, Line ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">อีเมลราชการ</label>
                  <input
                    type="email"
                    required
                    value={adminEditForm.email}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={adminEditForm.phone}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Line ID</label>
                  <input
                    type="text"
                    value={adminEditForm.lineId}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, lineId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              {/* Row 4: บทบาทสิทธิ์ (Role) & สถานะ (Status) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">บทบาทสิทธิ์ (Role)</label>
                  <select
                    value={adminEditForm.role}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, role: e.target.value as Role })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold"
                  >
                    <option value="admin">👑 ผู้ดูแลระบบ (Admin)</option>
                    <option value="manager">👔 ผู้จัดการ / ผอ.กลุ่ม (Manager)</option>
                    <option value="member">👤 พนักงาน / เจ้าหน้าที่ (Member)</option>
                    <option value="guest">🎟️ ผู้เยี่ยมชม / ภาคีภายนอก (Guest)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">สถานะผู้ใช้งาน (Status)</label>
                  <select
                    value={adminEditForm.status}
                    onChange={(e) =>
                      setAdminEditForm({ ...adminEditForm, status: e.target.value as "active" | "inactive" })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                  >
                    <option value="active">🟢 กำลังปฏิบัติงาน (Active)</option>
                    <option value="inactive">⚪ พักการใช้งานชั่วคราว (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setAdminEditingMember(null)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#4F46E5] text-white rounded-xl text-xs font-bold hover:bg-[#4338CA] shadow-md shadow-indigo-600/25 cursor-pointer"
                >
                  ✓ บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: DELETE MEMBER CONFIRMATION MODAL (ลบสมาชิก) ─── */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-red-100">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl mb-4">
              🗑️
            </div>
            <h3 className="text-lg font-bold font-heading text-slate-900 text-center">
              ยืนยันการลบบุคลากรออกจากระบบ
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              การดำเนินการนี้จะเพิกถอนสิทธิ์การเข้าถึงทั้งหมดและลบข้อมูลบุคลากร
            </p>

            <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">บุคลากร:</span>
                <span className="font-bold text-slate-900">{memberToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ตำแหน่ง:</span>
                <span className="text-slate-700">{memberToDelete.position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">กลุ่ม/ฝ่าย:</span>
                <span className="text-slate-700">{memberToDelete.division}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">บทบาทสิทธิ์:</span>
                <span className="font-bold text-indigo-700">{ROLE_CONFIG[memberToDelete.role].label}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMember}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 shadow-md shadow-red-600/25 cursor-pointer"
              >
                ลบบุคลากร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: EDIT MODULE SETTINGS MODAL (แก้ไขข้อมูลโมดูล) ─── */}
      {editingModuleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{editModuleForm.icon}</span>
                <div>
                  <h3 className="text-lg font-bold font-heading text-slate-900">
                    แก้ไขข้อมูล & การตั้งค่าโมดูล
                  </h3>
                  <p className="text-xs text-slate-500">
                    รหัสโมดูล: <code className="font-mono text-indigo-600">{editingModuleId}</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingModuleId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModuleInfo} className="space-y-4 mt-4">
              <div className="grid grid-cols-4 gap-2.5">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ไอคอน (Emoji)</label>
                  <input
                    type="text"
                    required
                    value={editModuleForm.icon}
                    onChange={(e) => setEditModuleForm({ ...editModuleForm, icon: e.target.value })}
                    className="w-full px-3 py-2 text-center text-lg bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อโมดูล (Module Name)</label>
                  <input
                    type="text"
                    required
                    value={editModuleForm.name}
                    onChange={(e) => setEditModuleForm({ ...editModuleForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">คำอธิบายโมดูล (Description)</label>
                <textarea
                  rows={2}
                  required
                  value={editModuleForm.desc}
                  onChange={(e) => setEditModuleForm({ ...editModuleForm, desc: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5] resize-none"
                />
              </div>

              {/* Status Switch */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">สถานะระดับระบบ (System Status)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditModuleForm({ ...editModuleForm, enabled: true })}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      editModuleForm.enabled
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <span>🟢</span>
                    <span>เปิดใช้งานระบบ (Active)</span>
                  </button>

                  <button
                    type="button"
                    disabled={editingModuleId === "admin"}
                    onClick={() => setEditModuleForm({ ...editModuleForm, enabled: false })}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      !editModuleForm.enabled
                        ? "bg-red-50 border-red-300 text-red-800 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <span>⛔</span>
                    <span>ปิดปรับปรุงชั่วคราว</span>
                  </button>
                </div>
              </div>

              {/* Maintenance Notice */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  ข้อความประกาศปิดปรับปรุง (Maintenance Notice)
                </label>
                <textarea
                  rows={2}
                  value={editModuleForm.maintenanceNotice}
                  onChange={(e) => setEditModuleForm({ ...editModuleForm, maintenanceNotice: e.target.value })}
                  placeholder="ข้อความที่จะแสดงให้ผู้ใช้งานเห็นเมื่อโมดูลปิดปรับปรุง..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5] resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingModuleId(null)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#4F46E5] text-white rounded-xl text-xs font-bold hover:bg-[#4338CA] shadow-md shadow-indigo-600/25 cursor-pointer"
                >
                  ✓ บันทึกข้อมูลโมดูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}