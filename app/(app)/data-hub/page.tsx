"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { DataHubPage } from "@/components/datahub/DataHubPage";

export default function DataHubRoute() {
  const { currentUser, showToast, members } = useAppContext();

  if (!currentUser) return null;

  return (
    <DataHubPage
      currentUser={currentUser}
      showToast={showToast}
      members={members}
    />
  );
}
