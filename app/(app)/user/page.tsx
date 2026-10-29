"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { UserPage } from "@/components/user/UserPage";

export default function UserRoute() {
  const {
    currentUser,
    currentUserRole,
    loginTime,
    isDarkMode,
    setIsDarkMode,
    handleOpenEditProfile,
    handleInitiateLogout,
    showToast,
  } = useAppContext();

  if (!currentUser) return null;

  return (
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
  );
}

