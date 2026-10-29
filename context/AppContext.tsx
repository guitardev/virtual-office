"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
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
import { AdminTabId } from "@/components/admin/AdminPage";
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
import { MODULE_TO_ROUTE } from "@/lib/navigation";

interface AppContextType {
  // Auth & Session
  currentUser: Member | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<Member | null>>;
  currentUserRole: Role;
  setCurrentUserRole: React.Dispatch<React.SetStateAction<Role>>;
  isHydrated: boolean;
  loginTime: string;
  setLoginTime: React.Dispatch<React.SetStateAction<string>>;
  handleLogin: (member: Member, rememberMe?: boolean) => void;
  handleInitiateLogout: () => void;
  handleConfirmLogout: () => void;
  showLogoutModal: boolean;
  setShowLogoutModal: React.Dispatch<React.SetStateAction<boolean>>;
  showUserDropdown: boolean;
  setShowUserDropdown: React.Dispatch<React.SetStateAction<boolean>>;

  // Theme & Toast
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleTheme: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  setToastMessage: React.Dispatch<React.SetStateAction<string | null>>;

  // Navigation & Layout
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
  collapsedGroups: Record<string, boolean>;
  toggleGroupCollapse: (groupId: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;

  // RBAC & Modules
  rolePermissions: Record<Role, Record<ModuleId, boolean>>;
  setRolePermissions: React.Dispatch<React.SetStateAction<Record<Role, Record<ModuleId, boolean>>>>;
  systemModules: Record<ModuleId, SystemModule>;
  setSystemModules: React.Dispatch<React.SetStateAction<Record<ModuleId, SystemModule>>>;
  canAccess: (moduleId: ModuleId, role?: Role) => boolean;
  addAuditLog: (actor: string, action: string, target: string, status: "success" | "denied") => void;

  // Shared Collections
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  auditLogs: AuditLog[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  toggleTaskStatus: (id: string | number) => void;
  meetings: MeetingItem[];
  setMeetings: React.Dispatch<React.SetStateAction<MeetingItem[]>>;
  carBookings: CarBookingRequest[];
  setCarBookings: React.Dispatch<React.SetStateAction<CarBookingRequest[]>>;
  circularDocs: CircularDocument[];
  setCircularDocs: React.Dispatch<React.SetStateAction<CircularDocument[]>>;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  chatGroups: ChatGroup[];
  setChatGroups: React.Dispatch<React.SetStateAction<ChatGroup[]>>;

  // Notifications
  systemNotifications: SystemNotification[];
  unreadNotifCount: number;
  showNotificationDropdown: boolean;
  setShowNotificationDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  notificationTab: "all" | "chat" | "circular" | "other";
  setNotificationTab: React.Dispatch<React.SetStateAction<"all" | "chat" | "circular" | "other">>;
  handleMarkAsRead: (id: string) => void;
  handleMarkAllAsRead: () => void;
  handleNotificationClick: (notif: SystemNotification, router: any) => void;
  browserNotifPermission: NotificationPermission;
  handleEnableBrowserNotifications: () => Promise<void>;
  navBadges: Record<ModuleId, number>;

  // Admin Management
  adminTab: AdminTabId;
  setAdminTab: React.Dispatch<React.SetStateAction<AdminTabId>>;
  memberSearch: string;
  setMemberSearch: React.Dispatch<React.SetStateAction<string>>;
  requestSearch: string;
  setRequestSearch: React.Dispatch<React.SetStateAction<string>>;
  requestStatusFilter: "all" | "pending" | "approved" | "rejected";
  setRequestStatusFilter: React.Dispatch<React.SetStateAction<"all" | "pending" | "approved" | "rejected">>;
  accessRequests: AccessRequest[];
  setAccessRequests: React.Dispatch<React.SetStateAction<AccessRequest[]>>;
  handleChangeMemberRole: (memberId: string, newRole: Role) => void;
  handleToggleMemberStatus: (member: Member) => void;
  handleTogglePermission: (role: Role, moduleId: ModuleId) => void;
  handleToggleModuleStatus: (modId: ModuleId) => void;
  handleOpenEditModule: (modId: ModuleId) => void;
  handleSaveModuleInfo: (e: React.FormEvent) => void;
  handleOpenAdminEdit: (member: Member) => void;
  handleAdminSaveMember: (e: React.FormEvent) => void;
  handleConfirmDeleteMember: () => void;
  handleAddMember: (e: React.FormEvent) => void;
  handleNewAccessRequest: (req: AccessRequest) => void;
  handleOpenEditRequest: (req: AccessRequest) => void;
  handleSaveEditRequest: (e: React.FormEvent) => void;
  handleApproveRequest: (req: AccessRequest, roleOverride?: Role) => void;
  handleRejectRequest: (req: AccessRequest, reason: string) => void;

  // Admin Modals State
  viewingMember: Member | null;
  setViewingMember: React.Dispatch<React.SetStateAction<Member | null>>;
  adminEditingMember: Member | null;
  setAdminEditingMember: React.Dispatch<React.SetStateAction<Member | null>>;
  adminEditForm: any;
  setAdminEditForm: React.Dispatch<React.SetStateAction<any>>;
  memberToDelete: Member | null;
  setMemberToDelete: React.Dispatch<React.SetStateAction<Member | null>>;
  showAddMemberModal: boolean;
  setShowAddMemberModal: React.Dispatch<React.SetStateAction<boolean>>;
  newMemberForm: any;
  setNewMemberForm: React.Dispatch<React.SetStateAction<any>>;
  editingModuleId: ModuleId | null;
  setEditingModuleId: React.Dispatch<React.SetStateAction<ModuleId | null>>;
  editModuleForm: any;
  setEditModuleForm: React.Dispatch<React.SetStateAction<any>>;
  selectedRequest: AccessRequest | null;
  setSelectedRequest: React.Dispatch<React.SetStateAction<AccessRequest | null>>;
  showRequestDetailModal: boolean;
  setShowRequestDetailModal: React.Dispatch<React.SetStateAction<boolean>>;
  showEditRequestModal: boolean;
  setShowEditRequestModal: React.Dispatch<React.SetStateAction<boolean>>;
  editRequestForm: any;
  setEditRequestForm: React.Dispatch<React.SetStateAction<any>>;
  showRejectModal: boolean;
  setShowRejectModal: React.Dispatch<React.SetStateAction<boolean>>;
  rejectReason: string;
  setRejectReason: React.Dispatch<React.SetStateAction<string>>;

  // User Profile Modals State
  showEditProfileModal: boolean;
  setShowEditProfileModal: React.Dispatch<React.SetStateAction<boolean>>;
  editProfileForm: any;
  setEditProfileForm: React.Dispatch<React.SetStateAction<any>>;
  handleOpenEditProfile: () => void;
  handleSaveProfile: (e: React.FormEvent) => void;
  showGlobalNasPasswordModal: boolean;
  setShowGlobalNasPasswordModal: React.Dispatch<React.SetStateAction<boolean>>;

  // LINE SSO State
  isLineVerifying: boolean;
  lineModalNotice: { title: string; message: string } | null;
  setLineModalNotice: React.Dispatch<React.SetStateAction<{ title: string; message: string } | null>>;
  handleContinueWithLineProfile: () => Promise<void>;

  // Connectivity
  isLiveConnected: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // ─── AUTH & SESSION STATE ───
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loginTime, setLoginTime] = useState<string>("09:00 น.");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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
  const [adminTab, setAdminTab] = useState<AdminTabId>("members");
  const [memberSearch, setMemberSearch] = useState("");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showGlobalNasPasswordModal, setShowGlobalNasPasswordModal] = useState(false);

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

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync theme preference with localStorage and html.dark class
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("smart_mso_theme");
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
      } else if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setIsDarkMode(true);
      }
    } catch {}
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("smart_mso_theme", next ? "dark" : "light");
      } catch {}
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

  // Load session from localStorage on client mount & handle LINE OAuth callback
  useEffect(() => {
    setIsHydrated(true);
    try {
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

      try {
        const PURGE_V2_KEY = "smartmso_purged_mock_requests_v2";
        if (!localStorage.getItem(PURGE_V2_KEY)) {
          localStorage.removeItem("smartmso_access_requests");
          localStorage.removeItem("omnioffice_access_requests");
          localStorage.removeItem("smartmso_access_requests_cache_v1");
          localStorage.setItem(PURGE_V2_KEY, "true");
        }
      } catch {}

      const cachedRequests = getLocalAccessRequests();
      setAccessRequests(cachedRequests);

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

              const allCurrentMembers = await fetchMembers();
              const savedLineUserId =
                typeof window !== "undefined"
                  ? localStorage.getItem("smartmso_last_line_user_id") ||
                    localStorage.getItem("omnioffice_last_line_user_id")
                  : null;

              const existingMember = allCurrentMembers.find((m) => {
                if (m.id === expectedId || m.id === `usr_line_${p.userId}` || m.id === p.userId) return true;
                if (savedLineUserId && m.id === savedLineUserId) return true;
                if (m.lineId && (m.lineId === lineIdTag || m.lineId === p.userId || m.lineId === `@${p.userId}`)) return true;
                if (p.email && m.email && m.email.toLowerCase().trim() === p.email.toLowerCase().trim()) return true;
                return false;
              });

              let memberToLogin: Member;

              if (existingMember) {
                memberToLogin = {
                  ...existingMember,
                  avatarUrl: p.pictureUrl || existingMember.avatarUrl,
                  lineId: existingMember.lineId && existingMember.lineId !== "-" ? existingMember.lineId : lineIdTag,
                  email: existingMember.email && !existingMember.email.includes("@line.me") ? existingMember.email : (p.email || existingMember.email),
                };
              } else {
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

  // Fetch live members, access requests, audit logs, tasks from Supabase & subscribe to realtime
  useEffect(() => {
    if (isLiveConnected) {
      fetchMembers().then((liveMembers) => {
        if (liveMembers && liveMembers.length > 0) {
          setMembers(liveMembers);
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
        setAccessRequests(liveReqs || []);
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
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("smartmso_auth_session");
          localStorage.removeItem("omnioffice_auth_session");
        } catch (e) {}
      }
      signOutUser().catch(console.error);
      setCurrentUser(null);
      showToast("🔒 เซสชันนี้ถูกยกเลิกการเชื่อมต่อจากอุปกรณ์อื่นแล้ว ระบบได้ออกจากระบบเพื่อความปลอดภัย");
    });

    return () => cleanup();
  }, [currentUser?.id, loginTime]);

  const canAccess = (moduleId: ModuleId, role: Role = currentUserRole): boolean => {
    return !!rolePermissions[role]?.[moduleId];
  };

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
    setShowLogoutModal(false);
    setShowUserDropdown(false);
    showToast("👋 ออกจากระบบเรียบร้อยแล้ว");
  };

  // ─── ADMIN ACTIONS ───
  const handleChangeMemberRole = (memberId: string, newRole: Role) => {
    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) return;

    const updatedMember: Member = { ...targetMember, role: newRole };

    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? updatedMember : m))
    );
    saveMember(updatedMember).catch(console.error);

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

  const handleToggleMemberStatus = (member: Member) => {
    const nextStatus: "active" | "inactive" = member.status === "active" ? "inactive" : "active";
    const updatedMember: Member = { ...member, status: nextStatus };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? updatedMember : m))
    );
    saveMember(updatedMember).catch(console.error);

    if (currentUser && currentUser.id === member.id) {
      setCurrentUser(updatedMember);
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
      `${nextStatus === "active" ? "เปิดใช้งาน" : "ระงับการใช้งาน"} บัญชีของ ${member.name} (${ROLE_CONFIG[member.role]?.label || member.role})`,
      "Member Status Toggle",
      "success"
    );

    showToast(
      nextStatus === "active"
        ? `🟢 เปิดใช้งานบัญชี ${member.name} เรียบร้อยแล้ว`
        : `⚪ ระงับการใช้งานบัญชี ${member.name} เรียบร้อยแล้ว`
    );
  };

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

    setCurrentUser(updatedUser);

    setMembers((prev) => {
      const exists = prev.some((m) => m.id === updatedUser.id);
      return exists
        ? prev.map((m) => (m.id === updatedUser.id ? updatedUser : m))
        : [updatedUser, ...prev];
    });

    saveMember(updatedUser).catch(console.error);

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

  // Unified Notifications
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

  const handleNotificationClick = (notif: SystemNotification, router: any) => {
    handleMarkAsRead(notif.id);
    setShowNotificationDropdown(false);
    if (notif.link.page === "chat") {
      router.push(`/chat${notif.link.targetId ? `?groupId=${notif.link.targetId}` : ""}`);
    } else if (notif.link.page === "circular") {
      router.push(`/circular${notif.link.targetId ? `?docId=${notif.link.targetId}` : ""}`);
    } else if (notif.link.page === "admin") {
      setAdminTab("requests");
      const matched = accessRequests.find((r) => r.id === notif.link.targetId);
      if (matched) setSelectedRequest(matched);
      router.push("/admin");
    } else if (notif.link.page === "carbooking") {
      router.push("/carbooking");
    } else if (notif.link.page === "task") {
      router.push("/tasks");
    }
  };

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

    const unreadCarBookingCount = systemNotifications.filter(
      (n) => n.type === "carbooking" && !n.isRead
    ).length;

    return {
      dashboard: 0,
      chat: unreadChatCount,
      task: taskCount,
      meetings: meetingCount,
      carbooking: unreadCarBookingCount > 0 ? unreadCarBookingCount : carCount,
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

  const value = {
    currentUser,
    setCurrentUser,
    currentUserRole,
    setCurrentUserRole,
    isHydrated,
    loginTime,
    setLoginTime,
    handleLogin,
    handleInitiateLogout,
    handleConfirmLogout,
    showLogoutModal,
    setShowLogoutModal,
    showUserDropdown,
    setShowUserDropdown,

    isDarkMode,
    setIsDarkMode,
    handleToggleTheme,
    toastMessage,
    showToast,
    setToastMessage,

    isSidebarCollapsed,
    toggleSidebarCollapse,
    collapsedGroups,
    toggleGroupCollapse,
    sidebarOpen,
    setSidebarOpen,
    searchQuery,
    setSearchQuery,

    rolePermissions,
    setRolePermissions,
    systemModules,
    setSystemModules,
    canAccess,
    addAuditLog,

    members,
    setMembers,
    auditLogs,
    setAuditLogs,
    tasks,
    setTasks,
    toggleTaskStatus,
    meetings,
    setMeetings,
    carBookings,
    setCarBookings,
    circularDocs,
    setCircularDocs,
    chatMessages,
    setChatMessages,
    chatGroups,
    setChatGroups,

    systemNotifications,
    unreadNotifCount,
    showNotificationDropdown,
    setShowNotificationDropdown,
    notificationTab,
    setNotificationTab,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleNotificationClick,
    browserNotifPermission,
    handleEnableBrowserNotifications,
    navBadges,

    adminTab,
    setAdminTab,
    memberSearch,
    setMemberSearch,
    requestSearch,
    setRequestSearch,
    requestStatusFilter,
    setRequestStatusFilter,
    accessRequests,
    setAccessRequests,
    handleChangeMemberRole,
    handleToggleMemberStatus,
    handleTogglePermission,
    handleToggleModuleStatus,
    handleOpenEditModule,
    handleSaveModuleInfo,
    handleOpenAdminEdit,
    handleAdminSaveMember,
    handleConfirmDeleteMember,
    handleAddMember,
    handleNewAccessRequest,
    handleOpenEditRequest,
    handleSaveEditRequest,
    handleApproveRequest,
    handleRejectRequest,

    viewingMember,
    setViewingMember,
    adminEditingMember,
    setAdminEditingMember,
    adminEditForm,
    setAdminEditForm,
    memberToDelete,
    setMemberToDelete,
    showAddMemberModal,
    setShowAddMemberModal,
    newMemberForm,
    setNewMemberForm,
    editingModuleId,
    setEditingModuleId,
    editModuleForm,
    setEditModuleForm,
    selectedRequest,
    setSelectedRequest,
    showRequestDetailModal,
    setShowRequestDetailModal,
    showEditRequestModal,
    setShowEditRequestModal,
    editRequestForm,
    setEditRequestForm,
    showRejectModal,
    setShowRejectModal,
    rejectReason,
    setRejectReason,

    showEditProfileModal,
    setShowEditProfileModal,
    editProfileForm,
    setEditProfileForm,
    handleOpenEditProfile,
    handleSaveProfile,
    showGlobalNasPasswordModal,
    setShowGlobalNasPasswordModal,

    isLineVerifying,
    lineModalNotice,
    setLineModalNotice,
    handleContinueWithLineProfile,

    isLiveConnected,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

