import "./globals.css";
import { Kanit, Sarabun } from "next/font/google";
import { PwaServiceWorkerRegister } from "@/components/common/PwaServiceWorkerRegister";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "Smart MSO — ระบบออฟฟิศเสมือน",
  description: "ระบบสื่อสารและทำงานร่วมกันในองค์กร Smart MSO",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Smart MSO",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${kanit.variable} ${sarabun.variable}`}>
      <body className={`${sarabun.className} min-h-screen bg-bg text-text antialiased font-body`}>
        <PwaServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}