"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { ReportsPage } from "@/components/reports/ReportsPage";

export default function ReportsRoute() {
  const {
    showToast,
    tasks,
    meetings,
    members,
    carBookings,
    currentUser,
  } = useAppContext();

  if (!currentUser) return null;

  return (
    <ReportsPage
      showToast={showToast}
      tasks={tasks}
      meetings={meetings}
      members={members}
      bookings={carBookings}
    />
  );
}

