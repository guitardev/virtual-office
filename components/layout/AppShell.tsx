"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { LoginPage } from "@/components/auth/LoginPage";
import { LogoutConfirmModal } from "@/components/auth/LogoutConfirmModal";
import { EditProfileModal } from "@/components/user/EditProfileModal";
import { ChangeNasPasswordModal } from "@/components/user/ChangeNasPasswordModal";
import { AdminModals } from "@/components/admin/AdminModals";
import { ROLE_CONFIG, MODULE_NAMES } from "@/lib/rbac";
import { NAV_GROUPS, MODULE_TO_ROUTE, getModuleFromPathname } from "@/lib/navigation";
import { ModuleId, Role } from "@/lib/types";
import { isBrowserNotificationSupported } from "@/lib/notifications";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    currentUser,
    currentUserRole,
    isHydrated,
    loginTime,
    handleLogin,
    handleInitiateLogout,
    handleConfirmLogout,
    showLogoutModal,
    setShowLogoutModal,
    showUserDropdown,
    setShowUserDropdown,

    isDarkMode,
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
    systemModules,
    canAccess,
    addAuditLog,

    members,
    setMembers,
    auditLogs,
    tasks,
    meetings,
    setMeetings,
    circularDocs,
    chatGroups,
    setChatGroups,

    systemNotifications,
    unreadNotifCount,
    showNotificationDropdown,
    setShowNotificationDropdown,
    notificationTab,
    setNotificationTab,
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
  } = useAppContext();

  const currentModule = getModuleFromPathname(pathname || "/");

  // Render 403 Forbidden Screen
  const renderAccessDenied = (moduleId: ModuleId) => (
    <div className="max-w-2xl mx-auto py-12 px-6 text-center animate-fade-in">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-4xl shadow-xs mb-6">
        🔒
      </div>
      <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider">
        403 Access Denied · จำกัดสิทธิ์การเข้าถึง
      </span>
      <h2 className="text-2xl font-bold font-heading text-slate-900 mt-4">
        คุณไม่มีสิทธิ์เข้าถึงโมดูล {systemModules[moduleId]?.name || MODULE_NAMES[moduleId]?.name || moduleId}
      </h2>
      <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto leading-relaxed">
        บทบาทปัจจุบันของคุณคือ <span className="font-bold text-indigo-600">{ROLE_CONFIG[currentUserRole]?.label || currentUserRole}</span> ซึ่งไม่ได้รับอนุญาตให้เข้าใช้งานโมดูลนี้ตามนโยบายความปลอดภัย (RBAC)
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
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors cursor-pointer"
        >
          ← กลับหน้าแรก
        </Link>
      </div>
    </div>
  );

  // Render System Maintenance Screen
  const renderMaintenanceScreen = (moduleId: ModuleId) => {
    const mod = systemModules[moduleId];
    return (
      <div className="max-w-2xl mx-auto py-14 px-6 text-center animate-fade-in">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-4xl shadow-xs mb-6">
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
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors cursor-pointer"
          >
            ← กลับหน้าแรก (Dashboard)
          </Link>
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

  // Nav links rendering with Next.js Link
  const renderNavLinks = (isMobile: boolean = false) => {
    const isCollapsed = !isMobile && isSidebarCollapsed;

    return (
      <nav className="flex-1 px-2.5 py-3 space-y-3 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-800">
        {!isCollapsed && (
          <div className="px-2.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>เมนูระบบราชการ</span>
          </div>
        )}

        {NAV_GROUPS.map((group, groupIdx) => {
          const isGroupCollapsed = !isCollapsed && Boolean(collapsedGroups[group.id]);

          return (
            <div key={group.id} className="space-y-1">
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

              {(!isGroupCollapsed || isCollapsed) && (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const itemRoute = MODULE_TO_ROUTE[item.id] || `/${item.id}`;
                    const isActive =
                      currentModule === item.id ||
                      (item.id === "dashboard" && (pathname === "/" || pathname === "/dashboard"));
                    const permitted = canAccess(item.id);
                    const sysModule = systemModules[item.id];
                    const isModuleOpen = sysModule?.enabled !== false;
                    const badgeCount = isHydrated ? navBadges[item.id] || 0 : 0;
                    const moduleTitle = sysModule?.name ? sysModule.name.split(" (")[0] : item.label;

                    return (
                      <Link
                        key={item.id}
                        href={itemRoute}
                        onClick={() => {
                          if (isMobile) setSidebarOpen(false);
                          if (!permitted && currentUser) {
                            addAuditLog(
                              `${currentUser.name} (${ROLE_CONFIG[currentUserRole]?.label || currentUserRole})`,
                              `พยายามเข้าถึงโมดูล ${sysModule?.name || MODULE_NAMES[item.id]?.name || item.id} (ถูกปฏิเสธสิทธิ์ RBAC)`,
                              "Access Control",
                              "denied"
                            );
                          } else if (!isModuleOpen && currentUserRole !== "admin" && currentUser) {
                            addAuditLog(
                              `${currentUser.name} (${ROLE_CONFIG[currentUserRole]?.label || currentUserRole})`,
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
                          badgeCount > 0 && !isActive && isModuleOpen && (
                            <span
                              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 border border-[#0F172A] animate-pulse"
                              title={`${item.label}: ${badgeCount} รายการ`}
                            />
                          )
                        )}
                      </Link>
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

  // User profile in sidebar
  const renderUserProfile = (isMobile: boolean = false) => {
    if (!currentUser) return null;
    const isCollapsed = !isMobile && isSidebarCollapsed;

    if (isCollapsed) {
      return (
        <div className="p-2 border-t border-slate-800 bg-[#0B0F19] flex flex-col items-center gap-2">
          <Link
            href="/user"
            className="relative cursor-pointer hover:scale-105 transition-transform"
            title={`${currentUser.name} (${ROLE_CONFIG[currentUserRole]?.label || currentUserRole})`}
          >
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {currentUser.avatarText}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0B0F19] rounded-full" />
          </Link>

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
        <Link
          href="/user"
          className="flex items-center space-x-3 p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <div className="relative shrink-0">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-sm shadow-xs">
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
              <span>{ROLE_CONFIG[currentUserRole]?.icon} {ROLE_CONFIG[currentUserRole]?.label?.split(" ")[0]}</span>
            </div>
          </div>
        </Link>

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

  // If session is hydrating on client mount
  if (!isHydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="Smart MSO" className="w-12 h-12 object-contain animate-pulse" />
          <p className="text-xs text-slate-400">กำลังเชื่อมต่อระบบ Smart MSO...</p>
        </div>
      </div>
    );
  }

  // If not logged in, render Login Page
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-xs animate-fade-in text-slate-800 overflow-y-auto">
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

  return (
    <div className={`flex h-screen w-screen overflow-hidden transition-colors duration-200 ${isDarkMode ? "dark bg-[#030712] text-slate-100" : "bg-[#F8FAFC] text-slate-800"}`}>
      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900/95 text-white text-sm font-medium shadow-2xl border border-slate-700/60 backdrop-blur-md animate-fade-in">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside
        className={`hidden md:flex shrink-0 flex-col h-screen select-none shadow-xl z-20 transition-all duration-300 ease-in-out border-r print:hidden ${
          isDarkMode
            ? "bg-[#090D16] border-slate-800/90 text-slate-300"
            : "bg-[#0F172A] border-slate-800/80 text-slate-300"
        } ${isSidebarCollapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 shrink-0">
          {!isSidebarCollapsed ? (
            <>
              <Link href="/dashboard" className="flex items-center space-x-3 overflow-hidden group">
                <img
                  src="/logo.png"
                  alt="Smart MSO Logo"
                  className="w-10 h-10 rounded-xl object-contain bg-white p-1 shadow-md shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="truncate">
                  <span className="text-lg font-bold text-white font-heading tracking-tight block leading-tight truncate">
                    Smart MSO
                  </span>
                  <span className="text-[10px] text-indigo-400 font-medium tracking-wide block truncate">
                    ระบบสำนักงานอัจฉริยะ
                  </span>
                </div>
              </Link>

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

        {renderNavLinks(false)}
        {renderUserProfile(false)}
      </aside>

      {/* ─── MOBILE DRAWER ─── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex print:hidden">
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
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        {/* Top Header */}
        <header className={`h-16 px-6 md:px-8 border-b flex items-center justify-between shrink-0 shadow-xs z-30 transition-colors backdrop-blur-md print:hidden ${
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
            {/* Quick Theme Toggle */}
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

            {/* Notification Center Bell & Dropdown */}
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
                          onClick={() => handleNotificationClick(notif, router)}
                          className={`p-3 transition-colors flex items-start gap-3 cursor-pointer group ${
                            !notif.isRead
                              ? "bg-indigo-50/50 hover:bg-indigo-50/90"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="pt-1.5 shrink-0">
                            {!notif.isRead ? (
                              <span className="block w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-indigo-200 animate-pulse" />
                            ) : (
                              <span className="block w-2 h-2 rounded-full bg-transparent" />
                            )}
                          </div>

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

            {/* User Profile Popover */}
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
                    {ROLE_CONFIG[currentUserRole]?.label?.split(" ")[0]}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-600">▾</span>
              </button>

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
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_CONFIG[currentUserRole]?.badgeColor}`}
                      >
                        {ROLE_CONFIG[currentUserRole]?.icon} {ROLE_CONFIG[currentUserRole]?.label}
                      </span>
                      <span className="text-[10px] text-slate-400">เข้าสู่ระบบ: {loginTime}</span>
                    </div>
                  </div>

                  <div className="py-1 text-xs">
                    <Link
                      href="/user"
                      onClick={() => setShowUserDropdown(false)}
                      className={`w-full px-4 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                        isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>👤</span>
                      <span>ข้อมูลส่วนตัวและความปลอดภัย</span>
                    </Link>

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
                      <Link
                        href="/admin"
                        onClick={() => setShowUserDropdown(false)}
                        className={`w-full px-4 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                          isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>⚙️</span>
                        <span>ระบบจัดการ & สิทธิ์ RBAC</span>
                      </Link>
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
          {!canAccess(currentModule) ? (
            renderAccessDenied(currentModule)
          ) : !systemModules[currentModule]?.enabled && currentUserRole !== "admin" ? (
            renderMaintenanceScreen(currentModule)
          ) : (
            <>
              {!systemModules[currentModule]?.enabled && currentUserRole === "admin" && (
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
                    onClick={() => handleToggleModuleStatus(currentModule)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🟢</span>
                    <span>เปิดใช้งานโมดูลให้ทุกคน</span>
                  </button>
                </div>
              )}

              {children}
            </>
          )}
        </main>
      </div>

      {/* ─── GLOBAL MODALS ─── */}
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
        onOpenChangePassword={() => setShowGlobalNasPasswordModal(true)}
      />

      <ChangeNasPasswordModal
        isOpen={showGlobalNasPasswordModal}
        onClose={() => setShowGlobalNasPasswordModal(false)}
        currentUser={currentUser}
        onSuccess={(msg) => showToast(msg)}
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
