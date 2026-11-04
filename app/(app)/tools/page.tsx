"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { ToolsOverviewPage } from "@/components/tools/ToolsOverviewPage";

export default function ToolsRoute() {
  const { currentUser, showToast } = useAppContext();

  if (!currentUser) return null;

  return (
    <ToolsOverviewPage
      currentUser={currentUser}
      showToast={showToast}
    />
  );
}

