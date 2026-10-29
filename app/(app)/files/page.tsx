"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { NasFileManager } from "@/components/dms/NasFileManager";

export default function FilesRoute() {
  const { currentUser, showToast } = useAppContext();

  if (!currentUser) return null;

  return (
    <NasFileManager
      currentUser={currentUser}
      showToast={showToast}
    />
  );
}

