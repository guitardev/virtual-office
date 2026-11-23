import React, { Suspense } from "react";
import LeavePage from "@/components/leave/LeavePage";
import PreloadSkeleton from "@/components/ui/PreloadSkeleton";

export default function Page() {
  return (
    <Suspense
      fallback={
        <PreloadSkeleton
          variant="cards"
          rows={4}
          label="กำลังโหลดระบบใบลาอิเล็กทรอนิกส์..."
        />
      }
    >
      <LeavePage />
    </Suspense>
  );
}
