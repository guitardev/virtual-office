"use client";

import React from "react";

interface PreloadSkeletonProps {
  variant?: "page" | "table" | "cards";
  rows?: number;
  label?: string;
}

export default function PreloadSkeleton({
  variant = "page",
  rows = 5,
  label = "กำลังโหลดข้อมูล...",
}: PreloadSkeletonProps) {
  if (variant === "table") {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
            <span>{label}</span>
          </div>
          <div className="h-4 w-28 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>

        <div className="space-y-2.5 animate-pulse">
          <div className="h-10 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-3 items-center py-2 px-2 border-b border-slate-100 dark:border-slate-800/70"
            >
              <div className="col-span-1 h-4 rounded bg-slate-200/70 dark:bg-slate-800" />
              <div className="col-span-4 h-4 rounded bg-slate-200/80 dark:bg-slate-800" />
              <div className="col-span-2 h-4 rounded bg-slate-200/70 dark:bg-slate-800" />
              <div className="col-span-2 h-4 rounded bg-slate-200/70 dark:bg-slate-800" />
              <div className="col-span-3 h-4 rounded bg-slate-200/60 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 px-1">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
          <span>{label}</span>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm animate-pulse space-y-3"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-20 rounded-full bg-slate-200/80 dark:bg-slate-800" />
              </div>
              <div className="h-8 w-28 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
            </div>
            <div className="h-4 w-2/3 rounded bg-slate-200/80 dark:bg-slate-800" />
            <div className="h-3 w-1/2 rounded bg-slate-200/60 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  // variant === "page"
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm animate-pulse space-y-3">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
          <span>{label}</span>
        </div>
        <div className="h-6 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-96 max-w-full rounded-lg bg-slate-200/70 dark:bg-slate-800" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-2.5"
          >
            <div className="h-4 w-24 rounded bg-slate-200/80 dark:bg-slate-800" />
            <div className="h-7 w-16 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>

      <PreloadSkeleton variant="table" rows={rows} label={label} />
    </div>
  );
}
