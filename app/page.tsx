"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Role,
  ModuleId,
  Member,
  AuditLog,
  SystemModule,
  PersonnelType,
  AccessRequest,
  TaskItem,
  MeetingItem,
  CarBookingRequest,
} from "@/lib/types";
import {
  ROLE_CONFIG,
  MODULE_NAMES,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_MEMBERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SYSTEM_MODULES,
  INITIAL_ACCESS_REQUESTS,
  GOVERNMENT_DIVISIONS,
} from "@/lib/rbac";
import { loadStoredBookings } from "@/lib/carbooking-data";
import { LoginPage } from "@/components/auth/LoginPage";
import { LogoutConfirmModal } from "@/components/auth/LogoutConfirmModal";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ChatPage } from "@/components/chat/ChatPage";
import { TasksPage } from "@/components/tasks/TasksPage";
import { MeetingsPage } from "@/components/meetings/MeetingsPage";
import { CarBookingPage } from "@/components/carbooking/CarBookingPage";
import { ReportsPage } from "@/components/reports/ReportsPage";
import { UserPage } from "@/components/user/UserPage";
import { EditProfileModal } from "@/components/user/EditProfileModal";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminModals } from "@/components/admin/AdminModals";
import { NasFileManager } from "@/components/dms/NasFileManager";
import { NasPhotoGallery } from "@/components/gallery/NasPhotoGallery";
import { CircularPage } from "@/components/circular/CircularPage";
import { loadStoredCircularDocs } from "@/lib/circular-data";
import {
  isSupabaseConfigured,
  fetchMembers,
  saveMember,
  deleteMember,
  subscribeToMembers,
  updateSupabaseUserMetadata,
  fetchAccessRequests,
  saveAccessRequest,
  subscribeToAccessRequests,
  getLocalAccessRequests,
  saveLocalAccessRequests,
  getSupabaseSession,
  subscribeToAuthChanges,
  signOutUser,
  findOrMapAuthMember,
  getLocalMembers,
  fetchAuditLogs,
  saveAuditLog,
  subscribeToAuditLogs,
  fetchTasks,
  saveTask,
  subscribeToTasks,
  fetchMeetings,
  saveMeeting,
  subscribeToMeetings,
  fetchCarBookings,
  subscribeToCarBookings,
} from "@/lib/supabase";
import {
  initCurrentSession,
  listenSessionRevocation,
  revokeSession,
  getCurrentSessionId,
} from "@/lib/session";
import { clearUserNasSid } from "@/lib/synology";

interface NavItem {
  id: ModuleId;
  label: string;
  icon: string;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "หน้าแรก", icon: "📊" },
  { id: "chat", label: "แชททีม", icon: "💬" },
  { id: "task", label: "งานและโปรเจกต์", icon: "📋" },
  { id: "meetings", label: "การประชุม", icon: "📹" },
  { id: "carbooking", label: "รถยนต์สำนักงาน", icon: "🚗" },
  { id: "circular", label: "เวียนหนังสือราชการ", icon: "📜" },
  { id: "files", label: "คลังเอกสาร NAS", icon: "📁" },
  { id: "gallery", label: "คลังภาพและสื่อ", icon: "📸" },
  { id: "reports", label: "รายงานและสถิติ", icon: "📈" },
  { id: "admin", label: "ระบบจัดการ & RBAC", icon: "⚙️" },
  { id: "user", label: "ข้อมูลส่วนตัว", icon: "👤" },
];


export default function SmartMSOApp() {
  // ─── AUTH & SESSION STATE ───
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
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
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [carBookings, setCarBookings] = useState<CarBookingRequest[]>([]);
  const [adminTab, setAdminTab] = useState<"members" | "requests" | "matrix" | "audit" | "nas">("members");
  const [memberSearch, setMemberSearch] = useState("");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // ─── ACCESS REQUESTS MANAGEMENT STATE ───
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>(INITIAL_ACCESS_REQUESTS);
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  const [editRequestForm, setEditRequestForm] = useState({
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
    requestedRole: "member" as Role,
    reason: "",
    reviewNotes: "",
  });

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
    avatarUrl: "",
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
    avatarUrl: "",
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

  // LINE OAuth verification state
  const [isLineVerifying, setIsLineVerifying] = useState(false);
  const [lineModalNotice, setLineModalNotice] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const isLiveConnected = isSupabaseConfigured();

  // Load session from localStorage on client mount & handle LINE OAuth callback
  useEffect(() => {
    setIsHydrated(true);
    try {
      // Load cached members so edited profiles are immediately active
      const cachedMembers = getLocalMembers();
      if (cachedMembers && cachedMembers.length > 0) {
        setMembers(cachedMembers);
      }

      const savedSession =
        localStorage.getItem("smartmso_auth_session") ||
        localStorage.getItem("omnioffice_auth_session");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.user) {
          setCurrentUser(parsed.user);
          setCurrentUserRole(parsed.user.role);
          if (parsed.loginTime) setLoginTime(parsed.loginTime);
        }
      }

      const cachedRequests = getLocalAccessRequests();
      if (cachedRequests && cachedRequests.length > 0) {
        setAccessRequests(cachedRequests);
      }
    } catch (e) {
      console.error("Failed to load saved session:", e);
    }

    // Check URL parameters for LINE OAuth redirect
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const returnedState = urlParams.get("state");
      const lineError = urlParams.get("line_error") || urlParams.get("error");
      const lineErrorDesc = urlParams.get("error_description");

      if (lineError) {
        showToast(`⚠️ LINE Login ไม่สำเร็จ: ${lineErrorDesc || lineError}`);
        window.history.replaceState({}, "", window.location.pathname);
      } else if (code) {
        // CSRF State Verification
        const savedState = sessionStorage.getItem("line_oauth_state");
        if (savedState && returnedState && savedState !== returnedState) {
          showToast("⚠️ การยืนยันตัวตน LINE ไม่ถูกต้อง: State Mismatch (อาจถูกโจมตี CSRF)");
          window.history.replaceState({}, "", window.location.pathname);
          sessionStorage.removeItem("line_oauth_state");
          return;
        }
        sessionStorage.removeItem("line_oauth_state");

        setIsLineVerifying(true);
        const redirectUri =
          sessionStorage.getItem("line_redirect_uri") || window.location.origin;

        fetch("/api/auth/line/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirectUri }),
        })
          .then((res) => res.json())
          .then(async (data) => {
            setIsLineVerifying(false);
            window.history.replaceState({}, "", window.location.pathname);

            if (data.success && data.profile) {
              const p = data.profile;
              const displayName = (p.displayName || "ผู้ใช้งาน LINE").trim();
              const lineShortId = p.userId.slice(0, 12);
              const lineIdTag = `@${p.userId.slice(0, 8)}`;
              const expectedId = `usr_line_${lineShortId}`;

              // Check if display name explicitly starts with a standard Thai title
              const KNOWN_PREFIXES = ["ว่าที่ ร.ต.", "ว่าที่ร้อยตรี", "นางสาว", "น.ส.", "นาย", "นาง", "ดร.", "ผศ.", "รศ."];
              let detectedPrefix = "";
              let cleanFirstName = displayName;
              let cleanLastName = "";

              for (const pref of KNOWN_PREFIXES) {
                if (displayName.startsWith(pref)) {
                  detectedPrefix = pref === "น.ส." ? "นางสาว" : pref;
                  cleanFirstName = displayName.slice(pref.length).trim();
                  break;
                }
              }

              // Fetch freshest pool of members to check for existing record
              const allCurrentMembers = await fetchMembers();
              const savedLineUserId =
                typeof window !== "undefined"
                  ? localStorage.getItem("smartmso_last_line_user_id") ||
                    localStorage.getItem("omnioffice_last_line_user_id")
                  : null;

              // Match existing member by:
              // 1. Expected LINE ID (usr_line_...) or exact LINE userId
              // 2. Previously remembered LINE user id in session/localStorage
              // 3. Registered lineId in profile
              // 4. Matching email (if non-empty)
              const existingMember = allCurrentMembers.find((m) => {
                if (m.id === expectedId || m.id === `usr_line_${p.userId}` || m.id === p.userId) return true;
                if (savedLineUserId && m.id === savedLineUserId) return true;
                if (m.lineId && (m.lineId === lineIdTag || m.lineId === p.userId || m.lineId === `@${p.userId}`)) return true;
                if (p.email && m.email && m.email.toLowerCase().trim() === p.email.toLowerCase().trim()) return true;
                return false;
              });

              let memberToLogin: Member;

              if (existingMember) {
                // 🛡️ CRITICAL: PRESERVE all previously updated personal data!
                // Never overwrite customized position, division, phone, role, nickname, name, or personnelType
                memberToLogin = {
                  ...existingMember,
                  // Refresh avatar from LINE if available, keeping custom avatar if already set
                  avatarUrl: p.pictureUrl || existingMember.avatarUrl,
                  // Ensure lineId is populated if previously unset
                  lineId: existingMember.lineId && existingMember.lineId !== "-" ? existingMember.lineId : lineIdTag,
                  // If existing email was empty or placeholder, update with verified email
                  email: existingMember.email && !existingMember.email.includes("@line.me") ? existingMember.email : (p.email || existingMember.email),
                };
              } else {
                // First-time LINE registration: create a new member record
                memberToLogin = {
                  id: expectedId,
                  prefix: detectedPrefix,
                  firstName: cleanFirstName,
                  lastName: cleanLastName,
                  name: displayName,
                  personnelType: "ข้าราชการ",
                  position: "เจ้าหน้าที่ปฏิบัติการ (LINE SSO)",
                  division: GOVERNMENT_DIVISIONS[0],
                  department: GOVERNMENT_DIVISIONS[0],
                  email: p.email || `${p.userId.slice(0, 8).toLowerCase()}@line.me`,
                  phone: "-",
                  lineId: lineIdTag,
                  role: "member",
                  status: "active",
                  avatarUrl: p.pictureUrl,
                  avatarText: (cleanFirstName || "LN").slice(0, 2),
                  joinedDate: "วันนี้",
                };
              }

              // Save to persistent storage and update members in memory
              await saveMember(memberToLogin);
              setMembers((prev) => {
                const exists = prev.some((m) => m.id === memberToLogin.id);
                return exists
                  ? prev.map((m) => (m.id === memberToLogin.id ? memberToLogin : m))
                  : [memberToLogin, ...prev];
              });
              if (typeof window !== "undefined") {
                localStorage.setItem("smartmso_last_line_user_id", memberToLogin.id);
              }

              handleLogin(memberToLogin, true);
              if (existingMember) {
                showToast(`🎉 ยินดีต้อนรับกลับ ${memberToLogin.name} (เข้าสู่ระบบด้วย LINE สำเร็จ)`);
              } else {
                showToast(`🎉 สมัครและเข้าสู่ระบบด้วย LINE: ${memberToLogin.name} สำเร็จ!`);
              }
            } else if (data.missingSecret) {
              setLineModalNotice({
                title: "✅ ตรวจสอบสิทธิ์ LINE สำเร็จ (ได้รับ Authorization Code แล้ว)",
                message:
                  "ระบบเชื่อมต่อกับบัญชี LINE ของท่านเรียบร้อยแล้ว! เพื่อดึงรูปโปรไฟล์และชื่อจริงอัตโนมัติ ให้ระบุ LINE_CHANNEL_SECRET ใน .env.local หรือท่านสามารถกดเข้าสู่ระบบทันทีด้านล่าง",
              });
            } else {
              showToast(`⚠️ LINE OAuth: ${data.error || "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์"}`);
            }
          })
          .catch((err) => {
            setIsLineVerifying(false);
            window.history.replaceState({}, "", window.location.pathname);
            console.error("Error exchanging LINE code:", err);
          });
      }
    }
  }, []);

  // Fetch live members, access requests, audit logs, tasks from Supabase & subscribe to realtime changes & Supabase Auth
  useEffect(() => {
    if (isLiveConnected) {
      fetchMembers().then((liveMembers) => {
        if (liveMembers && liveMembers.length > 0) {
          setMembers(liveMembers);
        }
      });

      fetchAccessRequests().then((liveReqs) => {
        if (liveReqs && liveReqs.length > 0) {
          setAccessRequests(liveReqs);
        }
      });

      fetchAuditLogs().then((logs) => {
        if (logs && logs.length > 0) {
          setAuditLogs(logs);
        }
      });

      fetchTasks().then((liveTasks) => {
        if (liveTasks) {
          setTasks(liveTasks);
        }
      });

      fetchMeetings().then((liveMeetings) => {
        if (liveMeetings) {
          setMeetings(liveMeetings);
        }
      });

      fetchCarBookings().then((liveBookings) => {
        if (liveBookings) {
          setCarBookings(liveBookings);
        }
      });

      // Check current Supabase Auth session
      getSupabaseSession().then((session: any) => {
        if (session?.user) {
          setMembers((currentMembers) => {
            const authMember = findOrMapAuthMember(session.user, currentMembers);
            setCurrentUser((prev) => {
              if (
                prev &&
                (prev.id === authMember.id ||
                  (prev.email && prev.email.toLowerCase() === authMember.email?.toLowerCase()))
              ) {
                return {
                  ...authMember,
                  prefix: prev.prefix || authMember.prefix,
                  firstName: prev.firstName || authMember.firstName,
                  lastName: prev.lastName || authMember.lastName,
                  nickname: prev.nickname || authMember.nickname,
                  name: prev.name || authMember.name,
                  personnelType: prev.personnelType || authMember.personnelType,
                  position: prev.position && prev.position !== "รอกำหนดตำแหน่ง" ? prev.position : authMember.position,
                  division: prev.division && prev.division !== "รอกำหนดกลุ่มงาน" ? prev.division : authMember.division,
                  phone: prev.phone && prev.phone !== "-" ? prev.phone : authMember.phone,
                  lineId: prev.lineId && prev.lineId !== "-" ? prev.lineId : authMember.lineId,
                  avatarUrl: prev.avatarUrl || authMember.avatarUrl,
                  role: prev.role || authMember.role,
                };
              }
              return authMember;
            });
            setCurrentUserRole((prev) => prev || authMember.role);
            return currentMembers;
          });
        }
      });

      // Subscribe to Supabase Auth state changes
      const authSub = subscribeToAuthChanges((event: string, session: any) => {
        if (event === "SIGNED_IN" && session?.user) {
          setMembers((currentMembers) => {
            const authMember = findOrMapAuthMember(session.user, currentMembers);
            setCurrentUser((prev) => {
              if (
                prev &&
                (prev.id === authMember.id ||
                  (prev.email && prev.email.toLowerCase() === authMember.email?.toLowerCase()))
              ) {
                return {
                  ...authMember,
                  prefix: prev.prefix || authMember.prefix,
                  firstName: prev.firstName || authMember.firstName,
                  lastName: prev.lastName || authMember.lastName,
                  nickname: prev.nickname || authMember.nickname,
                  name: prev.name || authMember.name,
                  personnelType: prev.personnelType || authMember.personnelType,
                  position: prev.position && prev.position !== "รอกำหนดตำแหน่ง" ? prev.position : authMember.position,
                  division: prev.division && prev.division !== "รอกำหนดกลุ่มงาน" ? prev.division : authMember.division,
                  phone: prev.phone && prev.phone !== "-" ? prev.phone : authMember.phone,
                  lineId: prev.lineId && prev.lineId !== "-" ? prev.lineId : authMember.lineId,
                  avatarUrl: prev.avatarUrl || authMember.avatarUrl,
                  role: prev.role || authMember.role,
                };
              }
              return authMember;
            });
            setCurrentUserRole((prev) => prev || authMember.role);
            return currentMembers;
          });
        } else if (event === "SIGNED_OUT") {
          setCurrentUser(null);
        }
      });

      const unsubscribeMembers = subscribeToMembers((updatedMembers) => {
        setMembers(updatedMembers);
      });

      const unsubscribeRequests = subscribeToAccessRequests((updatedRequests) => {
        setAccessRequests(updatedRequests);
      });

      const unsubscribeAudit = subscribeToAuditLogs(() => {
        fetchAuditLogs().then((logs) => {
          if (logs && logs.length > 0) {
            setAuditLogs(logs);
          }
        });
      });

      const unsubscribeTasks = subscribeToTasks((updatedTasks) => {
        setTasks(updatedTasks);
      });

      const unsubscribeMeetings = subscribeToMeetings((updatedMeetings) => {
        setMeetings(updatedMeetings);
      });

      const unsubscribeCarBookings = subscribeToCarBookings((updatedBookings) => {
        setCarBookings(updatedBookings);
      });

      return () => {
        unsubscribeMembers();
        unsubscribeRequests();
        unsubscribeAudit();
        unsubscribeTasks();
        unsubscribeMeetings();
        unsubscribeCarBookings();
        authSub?.unsubscribe?.();
      };
    }
  }, [isLiveConnected]);

  // Active session lifecycle and remote revocation listener
  useEffect(() => {
    if (!currentUser) return;

    initCurrentSession(currentUser.id, loginTime).catch(console.error);

    const cleanup = listenSessionRevocation(() => {
      // Remote session revocation triggered for this device
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("smartmso_auth_session");
          localStorage.removeItem("omnioffice_auth_session");
        } catch (e) {}
      }
      signOutUser().catch(console.error);
      setCurrentUser(null);
      setCurrentPage("dashboard");
      showToast("🔒 เซสชันนี้ถูกยกเลิกการเชื่อมต่อจากอุปกรณ์อื่นแล้ว ระบบได้ออกจากระบบเพื่อความปลอดภัย");
    });

    return () => cleanup();
  }, [currentUser?.id, loginTime]);

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
    saveAuditLog(newLog).catch(() => {});
  };

  // ─── AUTH ACTIONS ───
  const handleLogin = (member: Member, rememberMe: boolean = true) => {
    setCurrentUser(member);
    setCurrentUserRole(member.role);
    const timeStr =
      new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
    setLoginTime(timeStr);

    // Auto-insert or update member in database & state without guessing unknown fields
    setMembers((prev) => {
      const exists = prev.some((m) => m.id === member.id);
      return exists ? prev.map((m) => (m.id === member.id ? member : m)) : [member, ...prev];
    });
    saveMember(member).catch(console.error);

    if (rememberMe && typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "smartmso_auth_session",
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
    showToast(`👋 ยินดีต้อนรับกลับ ${member.name}`);
  };

  const handleInitiateLogout = () => {
    setShowUserDropdown(false);
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    if (currentUser) {
      revokeSession(currentUser.id, getCurrentSessionId());
      addAuditLog(
        `${currentUser.name} (${ROLE_CONFIG[currentUserRole].label})`,
        "ออกจากระบบ (Logout)",
        "Authentication",
        "success"
      );
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("smartmso_auth_session");
        localStorage.removeItem("omnioffice_auth_session");
      } catch (e) {}
    }
    clearUserNasSid();
    signOutUser().catch(console.error);
    setCurrentUser(null);
    setCurrentPage("dashboard");
    setShowLogoutModal(false);
    setShowUserDropdown(false);
    showToast("👋 ออกจากระบบเรียบร้อยแล้ว");
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
      avatarUrl: member.avatarUrl || "",
    });
  };

  const handleAdminSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEditingMember) return;

    const prefix = adminEditForm.prefix.trim();
    let sanitizedFirst = adminEditForm.firstName.trim();
    if (prefix && sanitizedFirst.startsWith(prefix)) {
      sanitizedFirst = sanitizedFirst.slice(prefix.length).trim();
    }
    const trimmedLast = adminEditForm.lastName.trim();

    const namesCombined = `${sanitizedFirst} ${trimmedLast}`.trim();
    const fullName = prefix ? `${prefix}${namesCombined}` : namesCombined;
    const initials = (sanitizedFirst || adminEditingMember.name).slice(0, 2);

    const updatedMember: Member = {
      ...adminEditingMember,
      prefix,
      firstName: sanitizedFirst,
      lastName: trimmedLast,
      nickname: adminEditForm.nickname.trim() || undefined,
      name: fullName,
      personnelType: adminEditForm.personnelType,
      position: adminEditForm.position.trim(),
      division: adminEditForm.division,
      department: adminEditForm.division,
      email: adminEditForm.email.trim(),
      phone: adminEditForm.phone.trim() || "-",
      lineId: adminEditForm.lineId.trim() || "-",
      role: adminEditForm.role,
      status: adminEditForm.status,
      avatarUrl: adminEditForm.avatarUrl ? adminEditForm.avatarUrl.trim() : undefined,
      avatarText: initials,
    };

    setMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
    saveMember(updatedMember).catch(console.error);

    // Synchronize session if the edited member is the logged-in user
    if (currentUser && currentUser.id === updatedMember.id) {
      setCurrentUser(updatedMember);
      setCurrentUserRole(updatedMember.role);
      updateSupabaseUserMetadata({
        prefix,
        first_name: sanitizedFirst,
        last_name: trimmedLast,
        name: fullName,
        nickname: updatedMember.nickname,
        position: updatedMember.position,
        division: updatedMember.division,
        phone: updatedMember.phone,
        line_id: updatedMember.lineId,
        personnel_type: updatedMember.personnelType,
        avatar_url: updatedMember.avatarUrl,
      }).catch(() => {});

      if (typeof window !== "undefined") {
        try {
          const savedSession =
            localStorage.getItem("smartmso_auth_session") ||
            localStorage.getItem("omnioffice_auth_session");
          const parsed = savedSession ? JSON.parse(savedSession) : {};
          localStorage.setItem(
            "smartmso_auth_session",
            JSON.stringify({
              ...parsed,
              user: updatedMember,
              loginTime: parsed.loginTime || loginTime,
              rememberMe: true,
            })
          );
          window.dispatchEvent(new Event("storage"));
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

  // ─── ACCESS REQUEST HANDLERS ───
  const handleNewAccessRequest = (req: AccessRequest) => {
    setAccessRequests((prev) => [req, ...prev.filter((r) => r.id !== req.id)]);
    showToast(`📬 ได้รับคำขอเข้าใช้งานใหม่จาก ${req.name} (${req.position}) ส่งไปยังผู้ดูแลระบบเรียบร้อย`);
  };

  const handleOpenEditRequest = (req: AccessRequest) => {
    setSelectedRequest(req);
    setEditRequestForm({
      prefix: req.prefix,
      firstName: req.firstName,
      lastName: req.lastName,
      nickname: req.nickname || "",
      personnelType: req.personnelType,
      position: req.position,
      division: req.division,
      email: req.email,
      phone: req.phone || "",
      lineId: req.lineId || "",
      requestedRole: req.approvedRole || req.requestedRole,
      reason: req.reason,
      reviewNotes: req.reviewNotes || "",
    });
    setShowEditRequestModal(true);
  };

  const handleSaveEditRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    const fullName = `${editRequestForm.prefix}${editRequestForm.firstName.trim()} ${editRequestForm.lastName.trim()}`.trim();
    const updatedReq: AccessRequest = {
      ...selectedRequest,
      prefix: editRequestForm.prefix,
      firstName: editRequestForm.firstName.trim(),
      lastName: editRequestForm.lastName.trim(),
      nickname: editRequestForm.nickname.trim() || undefined,
      name: fullName,
      personnelType: editRequestForm.personnelType,
      position: editRequestForm.position.trim(),
      division: editRequestForm.division,
      email: editRequestForm.email.trim(),
      phone: editRequestForm.phone.trim() || "-",
      lineId: editRequestForm.lineId.trim() || "-",
      requestedRole: editRequestForm.requestedRole,
      approvedRole: editRequestForm.requestedRole,
      reason: editRequestForm.reason.trim(),
      reviewNotes: editRequestForm.reviewNotes.trim() || undefined,
    };

    setAccessRequests((prev) =>
      prev.map((r) => (r.id === selectedRequest.id ? updatedReq : r))
    );

    const existing = getLocalAccessRequests();
    const updated = existing.map((r) => (r.id === selectedRequest.id ? updatedReq : r));
    saveLocalAccessRequests(updated);

    saveAccessRequest(updatedReq).catch(console.warn);

    addAuditLog(
      currentUser ? currentUser.name : "Admin",
      `แก้ไขรายละเอียดคำขอสิทธิ์ของ ${updatedReq.name}`,
      "Access Request Update",
      "success"
    );

    showToast(`✏️ บันทึกการแก้ไขคำขอของ ${updatedReq.name} เรียบร้อย`);
    setSelectedRequest(updatedReq);
    setShowEditRequestModal(false);
  };

  const handleApproveRequest = (req: AccessRequest, roleOverride?: Role) => {
    const finalRole = roleOverride || req.approvedRole || req.requestedRole;
    const fullName = `${req.prefix}${req.firstName.trim()} ${req.lastName.trim()}`.trim();
    const initials = req.firstName.trim().slice(0, 2).toUpperCase() || "MB";

    // 1. Create new Member
    const newM: Member = {
      id: `usr_${Date.now()}`,
      prefix: req.prefix,
      firstName: req.firstName.trim(),
      lastName: req.lastName.trim(),
      nickname: req.nickname?.trim() || undefined,
      name: fullName,
      personnelType: req.personnelType,
      position: req.position.trim() || "เจ้าหน้าที่",
      division: req.division,
      department: req.division,
      email: req.email.trim(),
      phone: req.phone.trim() || "-",
      lineId: req.lineId.trim() || "-",
      role: finalRole,
      status: "active",
      joinedDate: "วันนี้",
      avatarText: initials,
    };

    setMembers((prev) => [newM, ...prev]);
    saveMember(newM).catch(console.error);

    // 2. Update Access Request status
    const updatedReq: AccessRequest = {
      ...req,
      status: "approved",
      approvedRole: finalRole,
      reviewedAt: new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      reviewedBy: currentUser ? currentUser.name : "Admin",
    };

    setAccessRequests((prev) =>
      prev.map((r) => (r.id === req.id ? updatedReq : r))
    );

    const existing = getLocalAccessRequests();
    const updated = existing.map((r) => (r.id === req.id ? updatedReq : r));
    saveLocalAccessRequests(updated);

    saveAccessRequest(updatedReq).catch(console.warn);

    // 3. Add Audit Log
    addAuditLog(
      currentUser ? currentUser.name : "Admin",
      `อนุมัติคำขอสิทธิ์ของ ${req.name} เป็น ${ROLE_CONFIG[finalRole]?.label || finalRole} (${req.division})`,
      "Access Request Approval",
      "success"
    );

    showToast(`✅ อนุมัติสิทธิ์ให้ ${req.name} สำเร็จ! สามารถเข้าสู่ระบบด้วยอีเมล ${req.email} ได้ทันที`);
    setShowRequestDetailModal(false);
    setShowEditRequestModal(false);
  };

  const handleRejectRequest = (req: AccessRequest, reason: string) => {
    const updatedReq: AccessRequest = {
      ...req,
      status: "rejected",
      reviewNotes: reason || "คำขอไม่ผ่านเกณฑ์การพิจารณา",
      reviewedAt: new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      reviewedBy: currentUser ? currentUser.name : "Admin",
    };

    setAccessRequests((prev) =>
      prev.map((r) => (r.id === req.id ? updatedReq : r))
    );

    const existing = getLocalAccessRequests();
    const updated = existing.map((r) => (r.id === req.id ? updatedReq : r));
    saveLocalAccessRequests(updated);

    saveAccessRequest(updatedReq).catch(console.warn);

    addAuditLog(
      currentUser ? currentUser.name : "Admin",
      `ปฏิเสธคำขอสิทธิ์ของ ${req.name} (เหตุผล: ${reason || "ไม่ระบุ"})`,
      "Access Request Rejection",
      "denied"
    );

    showToast(`ℹ️ ปฏิเสธคำขอสิทธิ์ของ ${req.name} เรียบร้อยแล้ว`);
    setShowRejectModal(false);
    setShowRequestDetailModal(false);
    setRejectReason("");
  };

  // Profile Edit Handlers
  const handleOpenEditProfile = () => {
    if (!currentUser) return;
    const prefix = (currentUser.prefix || "").trim();
    let cleanFirst = (
      currentUser.firstName ||
      (currentUser.name ? currentUser.name.split(" ")[0] : "") ||
      ""
    ).trim();
    if (prefix && cleanFirst.startsWith(prefix)) {
      cleanFirst = cleanFirst.slice(prefix.length).trim();
    }
    const cleanLast = (
      currentUser.lastName ||
      (currentUser.name && currentUser.name.includes(" ")
        ? currentUser.name.split(" ").slice(1).join(" ")
        : "")
    ).trim();

    setEditProfileForm({
      prefix,
      firstName: cleanFirst,
      lastName: cleanLast,
      nickname: currentUser.nickname || "",
      personnelType: currentUser.personnelType || "ข้าราชการ",
      position: currentUser.position || "",
      division: currentUser.division || (GOVERNMENT_DIVISIONS[0] as string),
      email: currentUser.email || "",
      phone: currentUser.phone && currentUser.phone !== "-" ? currentUser.phone : "",
      lineId: currentUser.lineId && currentUser.lineId !== "-" ? currentUser.lineId : "",
      avatarUrl: currentUser.avatarUrl || "",
    });
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const trimmedFirst = editProfileForm.firstName.trim();
    const trimmedLast = editProfileForm.lastName.trim();
    const prefix = editProfileForm.prefix.trim();

    // Prevent duplicate prefix if user typed it into first name
    let sanitizedFirst = trimmedFirst;
    if (prefix && sanitizedFirst.startsWith(prefix)) {
      sanitizedFirst = sanitizedFirst.slice(prefix.length).trim();
    }

    const namesCombined = `${sanitizedFirst} ${trimmedLast}`.trim();
    const fullName = prefix ? `${prefix}${namesCombined}` : namesCombined;
    const initials = (sanitizedFirst || currentUser.name).slice(0, 2);

    const updatedUser: Member = {
      ...currentUser,
      prefix,
      firstName: sanitizedFirst,
      lastName: trimmedLast,
      nickname: editProfileForm.nickname.trim() || undefined,
      name: fullName,
      personnelType: editProfileForm.personnelType,
      position: editProfileForm.position.trim(),
      division: editProfileForm.division,
      department: editProfileForm.division,
      email: editProfileForm.email.trim(),
      phone: editProfileForm.phone.trim() || "-",
      lineId: editProfileForm.lineId.trim() || "-",
      avatarUrl: editProfileForm.avatarUrl ? editProfileForm.avatarUrl.trim() : undefined,
      avatarText: initials,
    };

    // 1. Immediately update in-memory active user state
    setCurrentUser(updatedUser);

    // 2. Update directory member list
    setMembers((prev) => {
      const exists = prev.some((m) => m.id === updatedUser.id);
      return exists
        ? prev.map((m) => (m.id === updatedUser.id ? updatedUser : m))
        : [updatedUser, ...prev];
    });

    // 3. Save to local cache & Supabase table
    saveMember(updatedUser).catch(console.error);

    // 4. Synchronize Supabase Auth user metadata if logged in via Auth
    updateSupabaseUserMetadata({
      prefix,
      first_name: sanitizedFirst,
      last_name: trimmedLast,
      name: fullName,
      nickname: updatedUser.nickname,
      position: updatedUser.position,
      division: updatedUser.division,
      phone: updatedUser.phone,
      line_id: updatedUser.lineId,
      personnel_type: updatedUser.personnelType,
      avatar_url: updatedUser.avatarUrl,
    }).catch(() => {});

    // 5. Always persist updated session to localStorage for immediate reload consistency
    if (typeof window !== "undefined") {
      try {
        const savedSession =
          localStorage.getItem("smartmso_auth_session") ||
          localStorage.getItem("omnioffice_auth_session");
        const parsed = savedSession ? JSON.parse(savedSession) : {};
        localStorage.setItem(
          "smartmso_auth_session",
          JSON.stringify({
            ...parsed,
            user: updatedUser,
            loginTime: parsed.loginTime || loginTime,
            rememberMe: true,
          })
        );
        window.dispatchEvent(new Event("storage"));
      } catch (err) {
        console.warn("Could not save session to localStorage:", err);
      }
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

  // Dynamic navigation badges calculated from real live Supabase state
  const navBadges: Record<ModuleId, number> = useMemo(() => {
    const taskCount = tasks.filter((t) => t.status !== "done").length;
    const meetingCount = meetings.length;
    const pendingReqCount = accessRequests.filter((r) => r.status === "pending").length;

    let carCount = 0;
    if (currentUserRole === "admin") {
      carCount = carBookings.filter((b) => b.status === "endorsed").length;
    } else if (currentUserRole === "manager") {
      carCount = carBookings.filter((b) => b.status === "pending_review").length;
    } else {
      carCount = carBookings.filter(
        (b) =>
          b.requesterId === currentUser?.id &&
          (b.status === "pending_review" || b.status === "endorsed")
      ).length;
    }

    let pendingCircularCount = 0;
    try {
      const cDocs = loadStoredCircularDocs();
      if (currentUser) {
        pendingCircularCount = cDocs.filter((d) => {
          const r = d.recipients.find((rec) => rec.memberId === currentUser.id);
          return r && !r.isAcknowledged;
        }).length;
      }
    } catch {
      // fallback
    }

    return {
      dashboard: 0,
      chat: 2,
      task: taskCount,
      meetings: meetingCount,
      carbooking: carCount,
      circular: pendingCircularCount,
      files: 0,
      gallery: 0,
      reports: 0,
      admin: currentUserRole === "admin" ? pendingReqCount : 0,
      user: 0,
    };
  }, [tasks, meetings, accessRequests, carBookings, currentUserRole, currentUser?.id]);

  const toggleTaskStatus = (id: string | number) => {
    let updatedTask: TaskItem | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextStatus =
            t.status === "todo"
              ? "in_progress"
              : t.status === "in_progress"
              ? "review"
              : t.status === "review"
              ? "done"
              : "todo";
          updatedTask = { ...t, status: nextStatus };
          return updatedTask;
        }
        return t;
      })
    );
    if (updatedTask) {
      saveTask(updatedTask).catch(console.error);
    }
    showToast("🔄 อัปเดตสถานะงานเรียบร้อย");
  };

  const handleContinueWithLineProfile = async () => {
    const allCurrentMembers = await fetchMembers();
    const savedLineUserId =
      typeof window !== "undefined"
        ? localStorage.getItem("smartmso_last_line_user_id") ||
          localStorage.getItem("omnioffice_last_line_user_id")
        : null;

    const existingMember = allCurrentMembers.find((m) => {
      if (savedLineUserId && m.id === savedLineUserId) return true;
      if (m.id.startsWith("usr_line_")) return true;
      if (m.lineId === "@line_staff") return true;
      return false;
    });

    let memberToLogin: Member;

    if (existingMember) {
      // 🛡️ CRITICAL: PRESERVE all previously updated personal data!
      memberToLogin = existingMember;
    } else {
      memberToLogin = {
        id: `usr_line_${Date.now()}`,
        prefix: "",
        firstName: "ผู้ใช้งาน LINE",
        lastName: "",
        name: "ผู้ใช้งาน LINE (LINE Verified)",
        personnelType: "พนักงานราชการ",
        position: "เจ้าหน้าที่สื่อสารและสารสนเทศ (LINE SSO)",
        division: GOVERNMENT_DIVISIONS[0],
        department: GOVERNMENT_DIVISIONS[0],
        email: "line.user@m-society.go.th",
        phone: "-",
        lineId: "@line_staff",
        role: "member",
        status: "active",
        avatarText: "LN",
        joinedDate: "วันนี้",
      };
      await saveMember(memberToLogin);
      setMembers((prev) => [memberToLogin, ...prev]);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("smartmso_last_line_user_id", memberToLogin.id);
    }
    setLineModalNotice(null);
    handleLogin(memberToLogin, true);
    showToast(`🎉 เข้าสู่ระบบด้วย LINE: ${memberToLogin.name} สำเร็จ!`);
  };

  // ─── IF NOT LOGGED IN: SHOW LOGIN PAGE ───
  if (!currentUser) {
    return (
      <>
        {isLineVerifying && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md text-white p-6 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-[#06C755] flex items-center justify-center text-3xl shadow-xl shadow-[#06C755]/30 mb-4 animate-bounce">
              💬
            </div>
            <h3 className="text-lg font-bold font-heading">กำลังยืนยันตัวตนด้วยบัญชี LINE...</h3>
            <p className="text-xs text-slate-300 mt-1">กำลังตรวจสอบ Authorization Token และเชื่อมต่อระบบ Smart MSO</p>
          </div>
        )}

        {lineModalNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-sm animate-fade-in text-slate-800 overflow-y-auto">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4 my-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-[#06C755] flex items-center justify-center text-2xl font-bold">
                  💬
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">{lineModalNotice.title}</h3>
                  <p className="text-[11px] text-slate-500">LINE OAuth 2.0 Authorization Verified</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/70">
                {lineModalNotice.message}
              </p>
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleContinueWithLineProfile}
                  className="w-full py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold shadow-md shadow-[#06C755]/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>⚡ ดำเนินการเข้าสู่ระบบด้วยบัญชี LINE ทันที ➜</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLineModalNotice(null)}
                  className="w-full py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-semibold cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

        <LoginPage
          onLogin={handleLogin}
          availableMembers={members}
          onRequestAccess={handleNewAccessRequest}
        />
      </>
    );
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
              ) : isHydrated && navBadges[item.id] > 0 && !isActive && isModuleOpen ? (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    item.id === "admin" || item.id === "carbooking"
                      ? "bg-amber-500 text-white shadow-xs animate-pulse"
                      : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  }`}
                  title={`${item.label}: ${navBadges[item.id]} รายการ`}
                >
                  {navBadges[item.id]}
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
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/15 border border-rose-500/25 transition-all cursor-pointer group shadow-xs"
      >
        <svg
          className="w-4 h-4 text-rose-400 group-hover:text-rose-200 transition-colors stroke-[2]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
          />
        </svg>
        <span>ออกจากระบบ</span>
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

      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="hidden md:flex w-64 shrink-0 bg-[#0F172A] text-slate-300 flex-col h-screen border-r border-slate-800/80 select-none shadow-xl z-20">
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#818CF8] flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/30">
              MSO
            </div>
            <div>
              <span className="text-lg font-bold text-white font-heading tracking-tight block leading-tight">
                Smart MSO
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
                <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white font-bold text-xs">
                  MSO
                </div>
                <span className="text-lg font-bold text-white font-heading">Smart MSO</span>
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


            {/* Notification Bell & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 cursor-pointer"
                title="การแจ้งเตือน"
              >
                🔔
                {isHydrated && accessRequests.filter((r) => r.status === "pending").length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#F59E0B] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {accessRequests.filter((r) => r.status === "pending").length}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in text-slate-800">
                  <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔔</span>
                      <span className="font-bold text-xs text-slate-800">ศูนย์การแจ้งเตือน (Notifications)</span>
                    </div>
                    {accessRequests.filter((r) => r.status === "pending").length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {accessRequests.filter((r) => r.status === "pending").length} คำขอรออนุมัติ
                      </span>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {accessRequests.filter((r) => r.status === "pending").length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        ✨ ไม่มีคำขอสิทธิ์ใหม่ที่รอดำเนินการ
                      </div>
                    ) : (
                      accessRequests
                        .filter((r) => r.status === "pending")
                        .map((req) => (
                          <div key={req.id} className="p-3 hover:bg-slate-50 transition-colors flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              📬
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-900 truncate">{req.name}</span>
                                <span className="text-[10px] text-slate-400 shrink-0">{req.createdAt}</span>
                              </div>
                              <div className="text-[11px] text-slate-600 truncate mt-0.5">
                                {req.position} · {req.division}
                              </div>
                              <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                                ขอสิทธิ์: {ROLE_CONFIG[req.requestedRole]?.label || req.requestedRole}
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentPage("admin");
                                    setAdminTab("requests");
                                    setSelectedRequest(req);
                                    setShowNotificationDropdown(false);
                                  }}
                                  className="px-2.5 py-1 bg-[#4F46E5] text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                                >
                                  ตรวจสอบ & จัดการ
                                </button>
                                {currentUserRole === "admin" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleApproveRequest(req);
                                      setShowNotificationDropdown(false);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                                  >
                                    ✓ อนุมัติทันที
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                      className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer group"
                    >
                      <svg
                        className="w-4 h-4 text-rose-500 group-hover:text-rose-600 transition-colors stroke-[2]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                        />
                      </svg>
                      <span>ออกจากระบบ (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleInitiateLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer group"
              title="ออกจากระบบ (Logout)"
              aria-label="ออกจากระบบ"
            >
              <svg
                className="w-5 h-5 group-hover:translate-x-0.5 transition-transform stroke-[2]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                />
              </svg>
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
                      <div className="font-bold text-sm">
                        โหมดผู้ดูแลระบบ (Admin Override): โมดูลนี้ปิดปรับปรุงอยู่
                      </div>
                      <div className="text-xs text-amber-700">
                        ผู้ใช้งานทั่วไปจะไม่สามารถเข้าใช้งานหน้านี้ได้จนกว่าจะเปิดระบบอีกครั้ง
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleModuleStatus(currentPage)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🟢</span>
                    <span>เปิดใช้งานโมดูลให้ทุกคน</span>
                  </button>
                </div>
              )}

              {/* ─── MODULAR PAGES ─── */}
              {currentPage === "dashboard" && (
                <DashboardPage
                  currentUser={currentUser}
                  currentUserRole={currentUserRole}
                  canAccess={canAccess}
                  setCurrentPage={setCurrentPage}
                  tasks={tasks}
                  meetings={meetings}
                  members={members}
                  toggleTaskStatus={toggleTaskStatus}
                  showToast={showToast}
                  rolePermissions={rolePermissions}
                />
              )}

              {currentPage === "chat" && (
                <ChatPage
                  currentUser={currentUser}
                  showToast={showToast}
                  members={members}
                />
              )}

              {currentPage === "task" && (
                <TasksPage
                  tasks={tasks}
                  currentUser={currentUser}
                  members={members}
                  setTasks={setTasks}
                  toggleTaskStatus={toggleTaskStatus}
                  showToast={showToast}
                />
              )}

              {currentPage === "meetings" && (
                <MeetingsPage
                  meetings={meetings}
                  showToast={showToast}
                  currentUser={currentUser}
                  setMeetings={setMeetings}
                />
              )}

              {currentPage === "carbooking" && (
                <CarBookingPage
                  currentUser={currentUser}
                  showToast={showToast}
                  members={members}
                />
              )}

              {currentPage === "circular" && (
                <CircularPage
                  currentUser={currentUser}
                  members={members}
                  showToast={showToast}
                />
              )}

              {currentPage === "files" && (
                <NasFileManager
                  currentUser={currentUser}
                  showToast={showToast}
                />
              )}

              {currentPage === "gallery" && (
                <NasPhotoGallery
                  currentUser={currentUser}
                  showToast={showToast}
                />
              )}

              {currentPage === "reports" && (
                <ReportsPage
                  showToast={showToast}
                  tasks={tasks}
                  meetings={meetings}
                  members={members}
                  bookings={carBookings}
                />
              )}

              {currentPage === "user" && (
                <UserPage
                  currentUser={currentUser}
                  currentUserRole={currentUserRole}
                  loginTime={loginTime}
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
                  handleOpenEditProfile={handleOpenEditProfile}
                  handleInitiateLogout={handleInitiateLogout}
                  showToast={showToast}
                />
              )}

              {currentPage === "admin" && (
                <AdminPage
                  members={members}
                  currentUser={currentUser}
                  accessRequests={accessRequests}
                  systemModules={systemModules}
                  rolePermissions={rolePermissions}
                  auditLogs={auditLogs}
                  setAuditLogs={setAuditLogs}
                  initialAuditLogs={INITIAL_AUDIT_LOGS}
                  adminTab={adminTab}
                  setAdminTab={setAdminTab}
                  memberSearch={memberSearch}
                  setMemberSearch={setMemberSearch}
                  requestSearch={requestSearch}
                  setRequestSearch={setRequestSearch}
                  requestStatusFilter={requestStatusFilter}
                  setRequestStatusFilter={setRequestStatusFilter}
                  setShowAddMemberModal={setShowAddMemberModal}
                  setViewingMember={setViewingMember}
                  handleOpenAdminEdit={handleOpenAdminEdit}
                  setMemberToDelete={setMemberToDelete}
                  handleChangeMemberRole={handleChangeMemberRole}
                  setSelectedRequest={setSelectedRequest}
                  setShowRequestDetailModal={setShowRequestDetailModal}
                  handleOpenEditRequest={handleOpenEditRequest}
                  handleApproveRequest={handleApproveRequest}
                  setRejectReason={setRejectReason}
                  setShowRejectModal={setShowRejectModal}
                  handleToggleModuleStatus={handleToggleModuleStatus}
                  handleOpenEditModule={handleOpenEditModule}
                  handleTogglePermission={handleTogglePermission}
                  showToast={showToast}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* ─── MODALS ─── */}
      <AdminModals
        viewingMember={viewingMember}
        setViewingMember={setViewingMember}
        currentUser={currentUser}
        systemModules={systemModules}
        rolePermissions={rolePermissions}
        adminEditingMember={adminEditingMember}
        setAdminEditingMember={setAdminEditingMember}
        adminEditForm={adminEditForm}
        setAdminEditForm={setAdminEditForm}
        handleAdminSaveMember={handleAdminSaveMember}
        handleOpenAdminEdit={handleOpenAdminEdit}
        memberToDelete={memberToDelete}
        setMemberToDelete={setMemberToDelete}
        handleConfirmDeleteMember={handleConfirmDeleteMember}
        showAddMemberModal={showAddMemberModal}
        setShowAddMemberModal={setShowAddMemberModal}
        newMemberForm={newMemberForm}
        setNewMemberForm={setNewMemberForm}
        handleAddMember={handleAddMember}
        editingModuleId={editingModuleId}
        setEditingModuleId={setEditingModuleId}
        editModuleForm={editModuleForm}
        setEditModuleForm={setEditModuleForm}
        handleSaveModuleInfo={handleSaveModuleInfo}
        showRequestDetailModal={showRequestDetailModal}
        setShowRequestDetailModal={setShowRequestDetailModal}
        selectedRequest={selectedRequest}
        setSelectedRequest={setSelectedRequest}
        handleOpenEditRequest={handleOpenEditRequest}
        handleApproveRequest={handleApproveRequest}
        showEditRequestModal={showEditRequestModal}
        setShowEditRequestModal={setShowEditRequestModal}
        editRequestForm={editRequestForm}
        setEditRequestForm={setEditRequestForm}
        handleSaveEditRequest={handleSaveEditRequest}
        showRejectModal={showRejectModal}
        setShowRejectModal={setShowRejectModal}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        handleRejectRequest={handleRejectRequest}
      />

      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        form={editProfileForm}
        setForm={setEditProfileForm}
        onSubmit={handleSaveProfile}
      />

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        user={currentUser}
        role={currentUserRole}
      />
    </div>
  );
}