import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { SuperAdminSidebar } from "@/components/superadmin-sidebar";
import { PendingActivation } from "@/components/pending-activation";
import { ClerkProvider, SignInButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { getCurrentMember } from "@/lib/authHelper";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

const geistHeading = Geist({ subsets: ["latin"], variable: "--font-heading" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata = {
  title: "Hotel Management System SaaS",
  description: "ระบบจัดการโรงแรมแบบครบวงจรรองรับหลายผู้เช่า",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // ดึงข้อมูลผู้ใช้ปัจจุบันจาก Clerk
  let user = null;
  let member = null;
  try {
    user = await currentUser();
    member = user ? await getCurrentMember() : null;
  } catch {
    // Clerk ยังไม่พร้อมหรือไม่มี session — ปล่อย null ไป
  }

  return (
    <ClerkProvider>
      <html
        lang="th"
        suppressHydrationWarning
        className={cn("antialiased", fontMono.variable, inter.variable, geistHeading.variable)}
      >
        <body>
          <ThemeProvider>
            <TooltipProvider>
              {!user ? (
                // กรณีที่ยังไม่ได้เข้าสู่ระบบ
                <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/40 p-4">
                  <div className="flex w-full max-w-md flex-col items-center text-center p-8 border bg-background/50 backdrop-blur shadow-2xl rounded-3xl transition-all hover:shadow-xl">
                    <div className="h-20 w-20 bg-primary/10 text-primary flex items-center justify-center rounded-full mb-6">
                      <LockKeyhole className="h-10 w-10 text-primary animate-pulse" />
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight mb-2">
                      กรุณาเข้าสู่ระบบ
                    </h1>

                    <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                      หน้านี้สงวนสิทธิ์เฉพาะผู้ใช้ระบบจัดการโรงแรม (Hotel Portal) กรุณาล็อกอินเพื่อดำเนินการเข้าสู่ระบบหลังบ้านของท่าน
                    </p>

                    <div className="w-full">
                      <SignInButton mode="redirect">
                        <Button className="w-full h-11 text-base font-medium rounded-xl shadow-lg shadow-primary/20">
                          <LockKeyhole className="mr-2 h-5 w-5" />
                          ล็อกอินเข้าใช้งานระบบ
                        </Button>
                      </SignInButton>
                    </div>
                  </div>
                </div>
              ) : member?.isSuperAdmin ? (
                // 1. ถ้าเป็นผู้ดูแลระบบระดับสูง (SaaS Owner)
                <SuperAdminSidebar>{children}</SuperAdminSidebar>
              ) : member?.isActive && member.hotelId ? (
                // 2. ถ้าเป็นพนักงานหรือเจ้าของโรงแรมที่เปิดสิทธิ์แล้ว
                <AppSidebar>{children}</AppSidebar>
              ) : (
                // 3. ถ้าเป็นผู้ใช้ทั่วไป/เพิ่งสมัคร รอเปิดสิทธิ์ (Pending Activation)
                <PendingActivation email={user.emailAddresses[0].emailAddress} />
              )}
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
