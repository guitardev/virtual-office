"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { AdminPage } from "@/components/admin/AdminPage";
import { INITIAL_AUDIT_LOGS } from "@/lib/rbac";
import { MODULE_TO_ROUTE } from "@/lib/navigation";
import { ModuleId } from "@/lib/types";

export default function AdminRoute() {
  const router = useRouter();
  const {
    members,
    currentUser,
    accessRequests,
    systemModules,
    rolePermissions,
    auditLogs,
    setAuditLogs,
    adminTab,
    setAdminTab,
    memberSearch,
    setMemberSearch,
    requestSearch,
    setRequestSearch,
    requestStatusFilter,
    setRequestStatusFilter,
    setShowAddMemberModal,
    setViewingMember,
    handleOpenAdminEdit,
    setMemberToDelete,
    handleChangeMemberRole,
    handleToggleMemberStatus,
    setSelectedRequest,
    setShowRequestDetailModal,
    handleOpenEditRequest,
    handleApproveRequest,
    setRejectReason,
    setShowRejectModal,
    handleToggleModuleStatus,
    handleOpenEditModule,
    handleTogglePermission,
    showToast,
    meetings,
    setMeetings,
    setMembers,
    circularDocs,
    chatGroups,
    setChatGroups,
  } = useAppContext();

  if (!currentUser) return null;

  return (
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
      handleToggleMemberStatus={handleToggleMemberStatus}
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
      meetings={meetings}
      setMeetings={setMeetings}
      setMembers={setMembers}
      circularDocs={circularDocs}
      onOpenCircularDoc={(docId) => {
        router.push(`/circular?docId=${docId}`);
      }}
      onNavigatePage={(p) => {
        router.push(MODULE_TO_ROUTE[p as ModuleId] || `/${p}`);
      }}
      chatGroups={chatGroups}
      setChatGroups={setChatGroups}
      onSelectChatGroup={(groupId) => {
        router.push(`/chat?groupId=${groupId}`);
      }}
    />
  );
}

