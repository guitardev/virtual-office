"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { MODULE_TO_ROUTE } from "@/lib/navigation";
import { ModuleId } from "@/lib/types";

export default function DashboardRoute() {
  const router = useRouter();
  const {
    currentUser,
    currentUserRole,
    canAccess,
    tasks,
    meetings,
    members,
    toggleTaskStatus,
    showToast,
    rolePermissions,
    circularDocs,
    carBookings,
  } = useAppContext();

  if (!currentUser) return null;

  return (
    <DashboardPage
      currentUser={currentUser}
      currentUserRole={currentUserRole}
      canAccess={canAccess}
      setCurrentPage={(page: ModuleId) => {
        router.push(MODULE_TO_ROUTE[page] || `/${page}`);
      }}
      tasks={tasks}
      meetings={meetings}
      members={members}
      toggleTaskStatus={toggleTaskStatus}
      showToast={showToast}
      rolePermissions={rolePermissions}
      circularDocs={circularDocs}
      carBookings={carBookings}
      onOpenCircularDoc={(docId) => {
        router.push(`/circular?docId=${docId}`);
      }}
    />
  );
}

