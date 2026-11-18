import PreloadSkeleton from "@/components/ui/PreloadSkeleton";

export default function AppLoading() {
  return <PreloadSkeleton variant="page" rows={6} label="กำลังเตรียมข้อมูลหน้าจอ..." />;
}
