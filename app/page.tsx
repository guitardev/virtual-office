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
  SystemNotification,
  ChatMessage,
  ChatGroup,
  CircularDocument,
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
  buildUnifiedNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
} from "@/lib/notifications";
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
  fetchChatMessages,
  subscribeToChatMessages,
  fetchChatGroups,
  fetchCircularDocs,
  subscribeToCircularDocs,
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

const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export default function SmartMSOApp() {
  // ─── AUTH & SESSION STATE ───
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loginTime, setLoginTime] = useState<string>("09:00 น.");

  const [currentPage, setCurrentPage] = useState<ModuleId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ─── COLLAPSIBLE SIDEBAR & GROUP ACCORDION STATE ───
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync theme preference with localStorage and html.dark class
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("smart_mso_theme");
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setIsDarkMode(true);
      }
    } catch {
      // Fallback
    }
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("smart_mso_theme", next ? "dark" : "light");
      } catch {
        // Fallback
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [isDarkMode]);

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

  // ─── UNIFIED SYSTEM NOTIFICATIONS STATE ───
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notificationTab, setNotificationTab] = useState<"all" | "chat" | "circular" | "other">("all");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [circularDocs, setCircularDocs] = useState<CircularDocument[]>([]);
  const [deeplinkChatGroupId, setDeeplinkChatGroupId] = useState<string | null>(null);
  const [deeplinkCircularDocId, setDeeplinkCircularDocId] = useState<string | null>(null);
  const [browserNotifPermission, setBrowserNotifPermission] = useState<NotificationPermission>("default");
  const [readNotifRevision, setReadNotifRevision] = useState<number>(0);

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

      // Load saved sidebar collapse preferences
      const storedSidebar = localStorage.getItem("smartmso_sidebar_collapsed");
      if (storedSidebar === "true") setIsSidebarCollapsed(true);
      const storedGroups = localStorage.getItem("smartmso_collapsed_groups");
      if (storedGroups) {
        try {
          setCollapsedGroups(JSON.parse(storedGroups));
        } catch {}
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
          // Sync current logged in user with official profile from database
          setCurrentUser((prev) => {
            if (!prev) return null;
            const liveMatch = liveMembers.find(
              (m) =>
                m.id === prev.id ||
                (prev.email && m.email && m.email.toLowerCase() === prev.email.toLowerCase()) ||
                (prev.name && m.name && (m.name === prev.name || m.name.includes(prev.name) || prev.name.includes(m.name)))
            );
            if (liveMatch) {
              const updated = {
                ...prev,
                prefix: liveMatch.prefix || prev.prefix,
                firstName: liveMatch.firstName || prev.firstName,
                lastName: liveMatch.lastName || prev.lastName,
                name: liveMatch.name || prev.name,
                division: liveMatch.division || prev.division,
                department: liveMatch.department || prev.department,
                position: liveMatch.position || prev.position,
                personnelType: liveMatch.personnelType || prev.personnelType,
                avatarUrl: liveMatch.avatarUrl || prev.avatarUrl,
                role: prev.role === "admin" ? "admin" : liveMatch.role || prev.role,
              };
              try {
                const raw = localStorage.getItem("smartmso_auth_session") || localStorage.getItem("omnioffice_auth_session");
                if (raw) {
                  const parsed = JSON.parse(raw);
                  parsed.user = updated;
                  localStorage.setItem("smartmso_auth_session", JSON.stringify(parsed));
                }
              } catch {}
              return updated;
            }
            return prev;
          });
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
        setAccessRequests((prev) => {
          if (prev && prev.length > 0 && updatedRequests.length > prev.length) {
            const newReq = updatedRequests[0];
            if (currentUserRole === "admin") {
              showToast(`📬 มีคำขอเข้าใช้งานใหม่: ${newReq.name} (${newReq.position})`);
              if (typeof document !== "undefined") {
                sendBrowserNotification(`📬 คำขอสิทธิ์ใหม่: ${newReq.name}`, {
                  body: `${newReq.position} · ${newReq.division} (ขอสิทธิ์ ${newReq.requestedRole})`,
                });
              }
            }
          }
          return updatedRequests;
        });
      });

      const unsubscribeAudit = subscribeToAuditLogs(() => {
        fetchAuditLogs().then((logs) => {
          if (logs && logs.length > 0) {
            setAuditLogs(logs);
          }
        });
      });

      const unsubscribeTasks = subscribeToTasks((updatedTasks) => {
        setTasks((prev) => {
          if (prev && prev.length > 0 && updatedTasks.length > prev.length) {
            const newTask = updatedTasks[0];
            if (
              currentUser &&
              (newTask.assigneeId === currentUser.id ||
                newTask.assignee === currentUser.name ||
                (currentUser.firstName && newTask.assignee?.includes(currentUser.firstName)))
            ) {
              showToast(`📋 งานมอบหมายใหม่: "${newTask.title}" (ฝ่าย${newTask.dept})`);
              if (typeof document !== "undefined") {
                sendBrowserNotification(`📋 งานมอบหมายใหม่: ${newTask.title}`, {
                  body: `ฝ่าย${newTask.dept} · กำหนดส่ง: ${newTask.due || "เร็วๆ นี้"}`,
                });
              }
            }
          }
          return updatedTasks;
        });
      });

      const unsubscribeMeetings = subscribeToMeetings((updatedMeetings) => {
        setMeetings(updatedMeetings);
      });

      const unsubscribeCarBookings = subscribeToCarBookings((updatedBookings) => {
        setCarBookings((prev) => {
          if (prev && prev.length > 0 && updatedBookings.length > prev.length) {
            const newBooking = updatedBookings[0];
            if (currentUserRole === "admin" || currentUserRole === "manager") {
              showToast(`🚗 คำขอจองรถใหม่: ${newBooking.destination} โดย ${newBooking.requesterName}`);
            }
          }
          return updatedBookings;
        });
      });

      // Fetch chat messages, groups, and circular documents for Notification Center
      fetchChatMessages().then((msgs) => setChatMessages(msgs));
      fetchChatGroups().then((grps) => setChatGroups(grps));
      fetchCircularDocs().then((docs) => setCircularDocs(docs));

      const unsubscribeChat = subscribeToChatMessages({
        onInsert: (newMsg) => {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (
            currentUser &&
            newMsg.senderId !== currentUser.id &&
            newMsg.senderName !== currentUser.name
          ) {
            showToast(`💬 ข้อความใหม่จาก ${newMsg.senderName}: "${(newMsg.text || "แนบไฟล์").slice(0, 45)}"`);
            if (typeof document !== "undefined" && document.hidden) {
              sendBrowserNotification(`💬 ข้อความใหม่: ${newMsg.senderName}`, {
                body: newMsg.text || "มีเอกสารแนบใหม่ในห้องแชท",
              });
            }
          }
        },
        onUpdate: (updatedMsg) => {
          setChatMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          );
        },
        onChange: () => {
          fetchChatMessages().then((msgs) => setChatMessages(msgs));
        },
      });

      const unsubscribeCircular = subscribeToCircularDocs({
        onInsert: (newDoc) => {
          setCircularDocs((prev) => {
            if (prev.some((d) => d.id === newDoc.id)) return prev;
            return [newDoc, ...prev];
          });
          const urgencyPrefix =
            newDoc.urgency === "most_urgent"
              ? "🚨 [ด่วนที่สุด] "
              : newDoc.urgency === "very_urgent"
              ? "⚡ [ด่วนมาก] "
              : newDoc.urgency === "urgent"
              ? "⚡ [ด่วน] "
              : "";
          showToast(`📜 ${urgencyPrefix}มีหนังสือเวียนใหม่: ${newDoc.docNumber} "${(newDoc.title || "").slice(0, 45)}"`);
          if (typeof document !== "undefined") {
            sendBrowserNotification(`📜 หนังสือเวียนใหม่: ${newDoc.docNumber}`, {
              body: `${newDoc.title} (${newDoc.senderOrg || "สป.พม."})`,
            });
          }
        },
        onUpdate: (updatedDoc) => {
          setCircularDocs((prev) =>
            prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
          );
        },
        onDelete: (deletedDocId) => {
          setCircularDocs((prev) => prev.filter((d) => d.id !== deletedDocId));
        },
        onChange: () => {
          fetchCircularDocs().then((docs) => setCircularDocs(docs));
        },
      });

      return () => {
        unsubscribeMembers();
        unsubscribeRequests();
        unsubscribeAudit();
        unsubscribeTasks();
        unsubscribeMeetings();
        unsubscribeCarBookings();
        unsubscribeChat();
        unsubscribeCircular();
        authSub?.unsubscribe?.();
      };
    } else {
      setCircularDocs(loadStoredCircularDocs());
    }
  }, [isLiveConnected, currentUser?.id, currentUser?.name]);

  // Listen to local circular creation events for 0ms in-tab responsiveness
  useEffect(() => {
    const handleLocalCircularEvent = (e: any) => {
      const doc = e.detail as CircularDocument;
      if (doc && doc.id) {
        setCircularDocs((prev) => {
          if (prev.some((d) => d.id === doc.id)) {
            return prev.map((d) => (d.id === doc.id ? doc : d));
          }
          return [doc, ...prev];
        });
      }
    };
    window.addEventListener("smartmso:circular_created", handleLocalCircularEvent);
    window.addEventListener("smartmso:circular_updated", handleLocalCircularEvent);
    return () => {
      window.removeEventListener("smartmso:circular_created", handleLocalCircularEvent);
      window.removeEventListener("smartmso:circular_updated", handleLocalCircularEvent);
    };
  }, []);

  useEffect(() => {
    setBrowserNotifPermission(getBrowserNotificationPermission());
  }, []);

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
    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) return;

    const updatedMember: Member = { ...targetMember, role: newRole };

    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? updatedMember : m))
    );
    saveMember(updatedMember).catch(console.error);

    // If target member is the currently logged-in user, synchronize current session
    if (currentUser && currentUser.id === memberId) {
      setCurrentUser(updatedMember);
      setCurrentUserRole(newRole);
      if (typeof window !== "undefined") {
        try {
          const savedSession = localStorage.getItem("smartmso_auth_session");
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            localStorage.setItem(
              "smartmso_auth_session",
              JSON.stringify({ ...parsed, user: updatedMember })
            );
          }
        } catch {}
      }
    }

    addAuditLog(
      currentUser ? currentUser.name : "Admin",
      `เปลี่ยนบทบาท ${targetMember.name} เป็น ${ROLE_CONFIG[newRole].label}`,
      "User Role Management",
      "success"
    );
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

  // ─── UNIFIED SYSTEM NOTIFICATIONS COMPUTATION ───
  const systemNotifications = useMemo(() => {
    return buildUnifiedNotifications({
      currentUser,
      currentUserRole,
      messages: chatMessages,
      groups: chatGroups,
      circularDocs,
      accessRequests,
      carBookings,
      tasks,
      allMembers: members,
    });
  }, [
    currentUser,
    currentUserRole,
    chatMessages,
    chatGroups,
    circularDocs,
    accessRequests,
    carBookings,
    tasks,
    members,
    readNotifRevision,
  ]);

  const unreadNotifCount = useMemo(() => {
    return systemNotifications.filter((n) => !n.isRead).length;
  }, [systemNotifications]);

  const handleMarkAsRead = (id: string) => {
    markNotificationAsRead(id);
    setReadNotifRevision((r) => r + 1);
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = systemNotifications.filter((n) => !n.isRead).map((n) => n.id);
    markAllNotificationsAsRead(unreadIds);
    setReadNotifRevision((r) => r + 1);
    showToast("✓ ทำเครื่องหมายว่าอ่านแล้วทั้งหมด");
  };

  const handleEnableBrowserNotifications = async () => {
    const granted = await requestBrowserNotificationPermission();
    setBrowserNotifPermission(granted ? "granted" : "denied");
    if (granted) {
      showToast("🔔 เปิดการแจ้งเตือนระดับเบราว์เซอร์สำเร็จ");
      sendBrowserNotification("Smart MSO - ระบบสำนักงานเสมือนจริง", {
        body: "เปิดใช้งานระบบแจ้งเตือนข้อราชการและหนังสือเวียนเรียบร้อยแล้ว",
      });
    } else {
      showToast("⚠️ ไม่ได้รับการอนุญาตแจ้งเตือนจากเบราว์เซอร์");
    }
  };

  const handleNotificationClick = (notif: SystemNotification) => {
    handleMarkAsRead(notif.id);
    setShowNotificationDropdown(false);
    if (notif.link.page === "chat") {
      setDeeplinkChatGroupId(notif.link.targetId || null);
      setCurrentPage("chat");
    } else if (notif.link.page === "circular") {
      setDeeplinkCircularDocId(notif.link.targetId || null);
      setCurrentPage("circular");
    } else if (notif.link.page === "admin") {
      setCurrentPage("admin");
      setAdminTab("requests");
      const matched = accessRequests.find((r) => r.id === notif.link.targetId);
      if (matched) setSelectedRequest(matched);
    } else if (notif.link.page === "carbooking") {
      setCurrentPage("carbooking");
    } else if (notif.link.page === "task") {
      setCurrentPage("task");
    }
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

    const unreadChatCount = systemNotifications.filter(
      (n) => n.type === "chat" && !n.isRead
    ).length;

    const unreadCircularCount = systemNotifications.filter(
      (n) => n.type === "circular" && !n.isRead
    ).length;

    return {
      dashboard: 0,
      chat: unreadChatCount,
      task: taskCount,
      meetings: meetingCount,
      carbooking: carCount,
      circular: unreadCircularCount,
      files: 0,
      gallery: 0,
      reports: 0,
      admin: currentUserRole === "admin" ? pendingReqCount : 0,
      user: 0,
    };
  }, [
    tasks,
    meetings,
    accessRequests,
    carBookings,
    currentUserRole,
    currentUser?.id,
    systemNotifications,
  ]);

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

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("smartmso_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem("smartmso_collapsed_groups", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Render navigation links with Groups, Collapsible Sections, RBAC badge/lock and System status
  const renderNavLinks = (isMobile: boolean = false) => {
    const isCollapsed = !isMobile && isSidebarCollapsed;

    return (
      <nav className="flex-1 px-2.5 py-3 space-y-3 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-800">
        {!isCollapsed && (
          <div className="px-2.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>เมนูระบบราชการ</span>
            <span className="text-[9px] lowercase text-indigo-400 font-mono bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-800/40">
              rbac active
            </span>
          </div>
        )}

        {NAV_GROUPS.map((group, groupIdx) => {
          const isGroupCollapsed = !isCollapsed && Boolean(collapsedGroups[group.id]);

          return (
            <div key={group.id} className="space-y-1">
              {/* Group Header */}
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleGroupCollapse(group.id)}
                  className="w-full px-2.5 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-200 transition-colors group/header cursor-pointer select-none rounded-lg hover:bg-slate-800/40"
                  title={isGroupCollapsed ? `คลิกเพื่อขยายกลุ่ม ${group.title}` : `คลิกเพื่อยุบกลุ่ม ${group.title}`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    {group.icon && <span className="text-xs opacity-75">{group.icon}</span>}
                    <span>{group.title}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 group-hover/header:text-slate-300 transition-transform">
                    {isGroupCollapsed ? "▸" : "▾"}
                  </span>
                </button>
              ) : (
                groupIdx > 0 && <hr className="border-slate-800/80 my-2" />
              )}

              {/* Group Items */}
              {(!isGroupCollapsed || isCollapsed) && (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = currentPage === item.id;
                    const permitted = canAccess(item.id);
                    const sysModule = systemModules[item.id];
                    const isModuleOpen = sysModule?.enabled !== false;
                    const badgeCount = isHydrated ? navBadges[item.id] || 0 : 0;
                    const moduleTitle = sysModule?.name ? sysModule.name.split(" (")[0] : item.label;

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
                        title={`${moduleTitle}${!permitted ? " (ไม่มีสิทธิ์เข้าถึง)" : ""}${!isModuleOpen ? " (ปิดปรับปรุง)" : ""}`}
                        className={`w-full flex items-center rounded-xl text-sm font-medium transition-all group relative cursor-pointer ${
                          isCollapsed
                            ? "justify-center p-2.5 mx-auto"
                            : "justify-between px-3 py-2"
                        } ${
                          isActive
                            ? "bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white shadow-md shadow-indigo-500/25 font-semibold"
                            : !permitted
                            ? "text-slate-500 hover:bg-slate-800/40 opacity-70"
                            : !isModuleOpen
                            ? "text-amber-300/80 hover:bg-slate-800/60"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <div className={`flex items-center ${isCollapsed ? "justify-center" : "space-x-2.5 min-w-0"}`}>
                          <span
                            className={`shrink-0 transition-transform ${
                              isCollapsed ? "text-xl" : "text-base"
                            } ${isActive ? "scale-110" : "group-hover:scale-105"}`}
                          >
                            {sysModule?.icon || item.icon}
                          </span>
                          <span className={isCollapsed ? "sr-only" : "truncate text-xs sm:text-[13px]"}>
                            {moduleTitle}
                          </span>
                        </div>

                        {/* Badges and Indicators */}
                        {!isCollapsed ? (
                          <div className="flex items-center gap-1.5 shrink-0 ml-1">
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
                            ) : badgeCount > 0 && !isActive && isModuleOpen ? (
                              <span
                                className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                                  item.id === "admin" || item.id === "carbooking"
                                    ? "bg-amber-500 text-white shadow-xs animate-pulse"
                                    : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                }`}
                                title={`${item.label}: ${badgeCount} รายการ`}
                              >
                                {badgeCount}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          // Collapsed miniature badge indicator
                          badgeCount > 0 && !isActive && isModuleOpen && (
                            <span
                              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 border border-[#0F172A] animate-pulse"
                              title={`${item.label}: ${badgeCount} รายการ`}
                            />
                          )
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    );
  };

  const renderUserProfile = (isMobile: boolean = false) => {
    const isCollapsed = !isMobile && isSidebarCollapsed;

    if (isCollapsed) {
      return (
        <div className="p-2 border-t border-slate-800 bg-[#0B0F19] flex flex-col items-center gap-2">
          <div
            className="relative cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setCurrentPage("user")}
            title={`${currentUser.name} (${ROLE_CONFIG[currentUserRole].label})`}
          >
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
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0B0F19] rounded-full" />
          </div>

          <button
            type="button"
            onClick={handleInitiateLogout}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-400 hover:text-white hover:bg-rose-500/20 transition-all cursor-pointer"
            title="ออกจากระบบ"
          >
            <svg
              className="w-4 h-4 stroke-[2]"
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
      );
    }

    return (
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
  };

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
    <div className={`flex h-screen w-screen overflow-hidden transition-colors duration-200 ${isDarkMode ? "dark bg-[#030712] text-slate-100" : "bg-[#F8FAFC] text-slate-800"}`}>
      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900/95 text-white text-sm font-medium shadow-2xl border border-slate-700/60 backdrop-blur-md animate-fade-in">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside
        className={`hidden md:flex shrink-0 flex-col h-screen select-none shadow-xl z-20 transition-all duration-300 ease-in-out border-r ${
          isDarkMode
            ? "bg-[#090D16] border-slate-800/90 text-slate-300"
            : "bg-[#0F172A] border-slate-800/80 text-slate-300"
        } ${isSidebarCollapsed ? "w-20" : "w-64"}`}
      >
        {/* Brand & Collapse Button */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 shrink-0">
          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center space-x-3 overflow-hidden">
                <img
                  src="/logo.png"
                  alt="Smart MSO Logo"
                  className="w-10 h-10 rounded-xl object-contain bg-white p-1 shadow-md shrink-0"
                />
                <div className="truncate">
                  <span className="text-lg font-bold text-white font-heading tracking-tight block leading-tight truncate">
                    Smart MSO
                  </span>
                  <span className="text-[10px] text-indigo-400 font-medium tracking-wide block truncate">
                    ระบบสำนักงานอัจฉริยะ
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleSidebarCollapse}
                className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0 ml-1"
                title="ยุบแถบเมนู (Collapse Sidebar)"
                aria-label="Collapse Sidebar"
              >
                ◀
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={toggleSidebarCollapse}
                className="w-10 h-10 rounded-xl bg-white p-1 shadow-md hover:scale-105 transition-transform cursor-pointer relative group flex items-center justify-center"
                title="ขยายแถบเมนู (Expand Sidebar)"
                aria-label="Expand Sidebar"
              >
                <img src="/logo.png" alt="Smart MSO Logo" className="w-full h-full object-contain" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-800 text-indigo-300 border border-slate-600 text-[9px] flex items-center justify-center">
                  ▶
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        {renderNavLinks(false)}

        {/* User Footer with Quick Logout */}
        {renderUserProfile(false)}
      </aside>

      {/* ─── MOBILE DRAWER ─── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className={`relative w-72 flex flex-col h-full z-10 shadow-2xl transition-colors ${
            isDarkMode ? "bg-[#090D16] text-slate-300 border-r border-slate-800" : "bg-[#0F172A] text-slate-300"
          }`}>
            <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <img
                  src="/logo.png"
                  alt="Smart MSO Logo"
                  className="w-9 h-9 rounded-xl object-contain bg-white p-1 shrink-0"
                />
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
            {renderUserProfile(true)}
          </aside>
        </div>
      )}

      {/* ─── MAIN CONTENT VIEWPORT ─── */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className={`h-16 px-6 md:px-8 border-b flex items-center justify-between shrink-0 shadow-xs z-30 transition-colors backdrop-blur-md ${
          isDarkMode
            ? "bg-slate-900/90 border-slate-800 text-slate-100 shadow-slate-950/40"
            : "bg-white/90 border-slate-200/80 text-slate-800"
        }`}>
          <div className="flex items-center space-x-4 flex-1 max-w-2xl">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className={`md:hidden p-2 rounded-xl transition-colors ${
                isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
              }`}
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
                className={`w-full pl-10 pr-4 py-2 text-sm border rounded-xl transition-all ${
                  isDarkMode
                    ? "bg-slate-800/90 border-slate-700 text-slate-100 placeholder-slate-400 focus:bg-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                }`}
              />
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
            {/* Quick Theme Toggle (Light / Dark) */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isDarkMode
                  ? "bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-750 hover:text-amber-200 shadow-xs"
                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/80 hover:text-slate-800"
              }`}
              title={isDarkMode ? "สลับเป็นโหมดสว่าง (Light Mode)" : "สลับเป็นโหมดกลางคืน (Dark Theme)"}
              aria-label="Toggle Dark Mode"
            >
              <span className="text-sm leading-none">{isDarkMode ? "☀️" : "🌙"}</span>
              <span className="hidden sm:inline">
                {isDarkMode ? "โหมดสว่าง" : "โหมดกลางคืน"}
              </span>
            </button>

            {/* Supabase Live Status Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isLiveConnected
                  ? isDarkMode
                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80 shadow-2xs"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs"
                  : isDarkMode
                  ? "bg-slate-800 text-slate-400 border-slate-700"
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

            {/* ─── UNIFIED NOTIFICATION CENTER BELL & DROPDOWN ─── */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className={`relative p-2.5 rounded-xl transition-colors cursor-pointer ${
                  isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                }`}
                title="ศูนย์การแจ้งเตือนราชการ (Notifications)"
                aria-label="การแจ้งเตือน"
              >
                <span className="text-lg">🔔</span>
                {isHydrated && unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <div className={`absolute right-0 mt-2 w-84 sm:w-[420px] rounded-2xl shadow-2xl border z-50 overflow-hidden animate-fade-in ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-700/80 text-slate-100 shadow-black/80"
                    : "bg-white border-slate-200 text-slate-800"
                }`}>
                  {/* Dropdown Header */}
                  <div className={`p-3.5 border-b flex items-center justify-between ${
                    isDarkMode ? "bg-slate-800/90 border-slate-700" : "bg-slate-50 border-slate-100"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔔</span>
                      <span className="font-bold text-xs text-slate-800">
                        ศูนย์การแจ้งเตือน (Notifications)
                      </span>
                      {unreadNotifCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          {unreadNotifCount} ใหม่
                        </span>
                      )}
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                      >
                        ✓ อ่านทั้งหมด
                      </button>
                    )}
                  </div>

                  {/* Browser Push Permission Banner */}
                  {browserNotifPermission !== "granted" && isBrowserNotificationSupported() && (
                    <div className="mx-3 my-2 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-indigo-900 min-w-0">
                        <span className="shrink-0 text-base">🌐</span>
                        <span className="text-[11px] font-medium leading-tight truncate">
                          เปิดรับแจ้งเตือนราชการด่วนบนหน้าจอ
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleEnableBrowserNotifications}
                        className="px-2.5 py-1 bg-[#4F46E5] text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors shrink-0 cursor-pointer shadow-xs"
                      >
                        เปิดใช้งาน
                      </button>
                    </div>
                  )}

                  {/* Category Tabs */}
                  <div className="flex items-center px-3 pt-2 gap-1 border-b border-slate-100 bg-white">
                    <button
                      type="button"
                      onClick={() => setNotificationTab("all")}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        notificationTab === "all"
                          ? "bg-slate-800 text-white shadow-xs"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      ทั้งหมด ({systemNotifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationTab("chat")}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        notificationTab === "chat"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <span>💬 แชท</span>
                      <span className="text-[10px] opacity-80">
                        ({systemNotifications.filter((n) => n.type === "chat").length})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationTab("circular")}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        notificationTab === "circular"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <span>📜 หนังสือเวียน</span>
                      <span className="text-[10px] opacity-80">
                        ({systemNotifications.filter((n) => n.type === "circular").length})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationTab("other")}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        notificationTab === "other"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <span>📬 คำขอ/งาน</span>
                      <span className="text-[10px] opacity-80">
                        ({systemNotifications.filter((n) => n.type !== "chat" && n.type !== "circular").length})
                      </span>
                    </button>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-88 overflow-y-auto divide-y divide-slate-100">
                    {(() => {
                      const displayedNotifs = systemNotifications.filter((n) => {
                        if (notificationTab === "chat") return n.type === "chat";
                        if (notificationTab === "circular") return n.type === "circular";
                        if (notificationTab === "other")
                          return n.type !== "chat" && n.type !== "circular";
                        return true;
                      });

                      if (displayedNotifs.length === 0) {
                        return (
                          <div className="p-8 text-center text-xs text-slate-400">
                            <span className="text-3xl block mb-2 opacity-50">✨</span>
                            ไม่มีรายการแจ้งเตือนในหมวดนี้
                          </div>
                        );
                      }

                      return displayedNotifs.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 transition-colors flex items-start gap-3 cursor-pointer group ${
                            !notif.isRead
                              ? "bg-indigo-50/50 hover:bg-indigo-50/90"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          {/* Unread indicator */}
                          <div className="pt-1.5 shrink-0">
                            {!notif.isRead ? (
                              <span className="block w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-indigo-200 animate-pulse" />
                            ) : (
                              <span className="block w-2 h-2 rounded-full bg-transparent" />
                            )}
                          </div>

                          {/* Icon / Avatar */}
                          <div className="shrink-0">
                            {notif.type === "chat" ? (
                              notif.senderAvatar ? (
                                <img
                                  src={notif.senderAvatar}
                                  alt={notif.senderName || ""}
                                  className="w-8 h-8 rounded-xl object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
                                  💬
                                </div>
                              )
                            ) : notif.type === "circular" ? (
                              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center">
                                📜
                              </div>
                            ) : notif.type === "carbooking" ? (
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center">
                                🚗
                              </div>
                            ) : notif.type === "task" ? (
                              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-800 font-bold text-sm flex items-center justify-center">
                                📋
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 font-bold text-sm flex items-center justify-center">
                                📬
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {notif.title}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {notif.timestamp}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                              {notif.message}
                            </p>

                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              {notif.priority === "emergency" && (
                                <span className="px-1.5 py-0.2 bg-red-600 text-white rounded text-[9px] font-bold">
                                  🚨 ด่วนที่สุด
                                </span>
                              )}
                              {notif.priority === "urgent" && (
                                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[9px] font-bold">
                                  ⚡ สำคัญ/ด่วน
                                </span>
                              )}
                              {notif.senderName && (
                                <span className="text-[10px] text-slate-400">
                                  โดย {notif.senderName}
                                </span>
                              )}
                              <span className="text-[10px] text-indigo-600 font-semibold group-hover:underline ml-auto">
                                เปิดดู ➜
                              </span>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
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
                <div className={`absolute right-0 top-12 w-64 rounded-2xl shadow-xl border py-2 z-50 animate-fade-in ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-700/80 text-slate-100 shadow-black/70"
                    : "bg-white border-slate-200 text-slate-800"
                }`}>
                  <div className={`px-4 py-3 border-b ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <div className="text-xs font-bold truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
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
                      className={`w-full px-4 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                        isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>👤</span>
                      <span>ข้อมูลส่วนตัวและความปลอดภัย</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleTheme}
                      className={`w-full px-4 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span>{isDarkMode ? "☀️" : "🌙"}</span>
                        <span>{isDarkMode ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดกลางคืน"}</span>
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isDarkMode ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {isDarkMode ? "Dark" : "Light"}
                      </span>
                    </button>

                    {canAccess("admin") && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPage("admin");
                          setShowUserDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                          isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>⚙️</span>
                        <span>ระบบจัดการ & สิทธิ์ RBAC</span>
                      </button>
                    )}
                  </div>

                  <div className={`border-t pt-1 ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <button
                      type="button"
                      onClick={handleInitiateLogout}
                      className={`w-full px-4 py-2 text-left text-rose-500 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer group ${
                        isDarkMode ? "hover:bg-rose-950/40" : "hover:bg-rose-50"
                      }`}
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
              className={`p-2 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer group ${
                isDarkMode ? "hover:bg-rose-950/40" : "hover:bg-rose-50"
              }`}
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
        <main className={`flex-1 overflow-y-auto p-6 md:p-8 transition-colors ${
          isDarkMode ? "bg-[#030712] text-slate-100" : "bg-[#F8FAFC] text-slate-800"
        }`}>
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
                  initialGroupId={deeplinkChatGroupId}
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
                  members={members}
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
                  initialDocId={deeplinkCircularDocId}
                  onDocumentCreated={(newDoc) => {
                    setCircularDocs((prev) => {
                      if (prev.some((d) => d.id === newDoc.id)) return prev;
                      return [newDoc, ...prev];
                    });
                    const urgencyPrefix =
                      newDoc.urgency === "most_urgent"
                        ? "🚨 [ด่วนที่สุด] "
                        : newDoc.urgency === "very_urgent"
                        ? "⚡ [ด่วนมาก] "
                        : newDoc.urgency === "urgent"
                        ? "⚡ [ด่วน] "
                        : "";
                    showToast(`📜 ${urgencyPrefix}ออกหนังสือเวียนใหม่: ${newDoc.docNumber} "${(newDoc.title || "").slice(0, 45)}"`);
                    sendBrowserNotification(`📜 หนังสือเวียนใหม่: ${newDoc.docNumber}`, {
                      body: `${newDoc.title} (${newDoc.senderOrg || "สป.พม."})`,
                    });
                  }}
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