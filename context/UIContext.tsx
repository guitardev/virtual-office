"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

export interface UIContextType {
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
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("smart_mso_theme");
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
      } else if (
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        setIsDarkMode(true);
      }

      const storedSidebar = localStorage.getItem("smartmso_sidebar_collapsed");
      if (storedSidebar === "true") setIsSidebarCollapsed(true);
      const storedGroups = localStorage.getItem("smartmso_collapsed_groups");
      if (storedGroups) {
        try {
          setCollapsedGroups(JSON.parse(storedGroups));
        } catch {}
      }
    } catch {}
  }, []);

  const handleToggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("smart_mso_theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [isDarkMode]);

  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("smartmso_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem("smartmso_collapsed_groups", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
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
    }),
    [
      isDarkMode,
      handleToggleTheme,
      toastMessage,
      showToast,
      isSidebarCollapsed,
      toggleSidebarCollapse,
      collapsedGroups,
      toggleGroupCollapse,
      sidebarOpen,
      searchQuery,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUIContext() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUIContext must be used within a UIProvider");
  }
  return context;
}

