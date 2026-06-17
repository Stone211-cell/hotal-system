"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserButton } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  Receipt,
  Settings,
  Hotel,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  MessageSquare,
  Wrench,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems = [
  {
    group: "หน้าหลัก",
    items: [
      {
        href: "/",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "ภาพรวมรายรับ-รายจ่าย",
      },
    ],
  },
  {
    group: "จัดการห้องพัก",
    items: [
      {
        href: "/rooms",
        label: "ห้องพัก",
        icon: BedDouble,
        description: "เพิ่ม/แก้ไขห้องพัก",
      },
      {
        href: "/maintenance",
        label: "แจ้งซ่อม/ทำความสะอาด",
        icon: Wrench,
        description: "บันทึกและประวัติงานแจ้งซ่อม",
      },
    ],
  },
  {
    group: "การจอง",
    items: [
      {
        href: "/bookings",
        label: "รายการจอง",
        icon: CalendarCheck,
        description: "จัดการการจองทั้งหมด",
      },
      {
        href: "/expenses",
        label: "รายรับ-รายจ่าย",
        icon: Receipt,
        description: "บันทึกรายจ่ายเพิ่มเติม",
      },
    ],
  },
  {
    group: "ระบบหอพัก",
    items: [
      {
        href: "/contracts",
        label: "สัญญาเช่า",
        icon: FileText,
        description: "จัดการสัญญาผู้เช่าห้อง",
      },
      {
        href: "/bills",
        label: "บิลค่าเช่า",
        icon: FileSpreadsheet,
        description: "ออกบิลและรับชำระเงิน",
      },
    ],
  },
];

interface AppSidebarProps {
  children: React.ReactNode;
}

export function AppSidebar({ children }: AppSidebarProps) {
  const pathname = usePathname();

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackSubject || !feedbackMessage) {
      toast.error("กรุณากรอกหัวข้อและรายละเอียดข้อเสนอแนะ");
      return;
    }
    setSubmittingFeedback(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: feedbackSubject, message: feedbackMessage }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("ส่งข้อคิดเห็น/ข้อเสนอแนะถึงผู้ดูแลระบบแล้ว ขอบคุณครับ!");
        setFeedbackSubject("");
        setFeedbackMessage("");
        setIsFeedbackOpen(false);
      } else {
        toast.error(data.message || "เกิดข้อผิดพลาดในการส่งข้อความ");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        {/* Header */}
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Hotel className="h-5 w-5" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold text-sidebar-foreground">
                Hotel System
              </span>
              <span className="text-xs text-muted-foreground">
                ระบบจัดการโรงแรม
              </span>
            </div>
          </div>
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent className="py-2">
          {navItems.map((group) => (
            <SidebarGroup key={group.group}>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-1">
                {group.group}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className={cn(
                            "transition-all duration-200",
                            isActive &&
                              "bg-primary/10 text-primary font-medium"
                          )}
                        >
                          <Link href={item.href} className="flex items-center gap-3 px-3 py-2">
                            <item.icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              )}
                            />
                            <span className="group-data-[collapsible=icon]:hidden">
                              {item.label}
                            </span>
                            {isActive && (
                              <ChevronRight className="ml-auto h-3 w-3 text-primary group-data-[collapsible=icon]:hidden" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="border-t border-sidebar-border p-3 gap-2">
          <SidebarMenu>
            {/* ปุ่มส่งข้อคิดเห็น */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setIsFeedbackOpen(true)}
                tooltip="ส่งข้อคิดเห็น/คำแนะนำ"
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <div className="flex items-center gap-3 px-3 py-2">
                  <MessageSquare className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="group-data-[collapsible=icon]:hidden font-medium">ส่งข้อคิดเห็น</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* ปุ่มตั้งค่า */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="ตั้งค่า"
                className="text-muted-foreground hover:text-foreground"
              >
                <Link href="/settings" className="flex items-center gap-3 px-3 py-2">
                  <Settings className="h-4 w-4 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden">ตั้งค่า</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen bg-background">
        {/* Top Bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur px-4">
          <SidebarTrigger className="h-8 w-8" />
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
              {new Date().toLocaleDateString("th-TH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <UserButton />
          </div>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>

      {/* Dialog ส่งข้อคิดเห็น */}
      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>💬 ส่งข้อคิดเห็น / แจ้งปัญหา</DialogTitle>
            <DialogDescription>
              ข้อเสนอแนะและปัญหาการใช้งานของท่านจะถูกส่งตรงไปหาผู้ดูแลระบบระดับสูง (SaaS SuperAdmin) เพื่อปรับปรุงระบบครับ
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendFeedback} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fb-subject">หัวข้อข้อแนะนำ *</Label>
              <Input
                id="fb-subject"
                placeholder="ระบุหัวข้อ เช่น แจ้งจุดชำรุดระบบการจอง, เสนอเพิ่มระบบ..."
                value={feedbackSubject}
                onChange={(e: any) => setFeedbackSubject(e.target.value)}
                required
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fb-message">รายละเอียดข้อคิดเห็น/ปัญหา *</Label>
              <Textarea
                id="fb-message"
                placeholder="อธิบายข้อเสนอแนะหรือปัญหาที่ท่านพบอย่างละเอียด..."
                value={feedbackMessage}
                onChange={(e: any) => setFeedbackMessage(e.target.value)}
                required
                className="min-h-[120px] rounded-xl resize-none"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFeedbackOpen(false)}
                className="rounded-xl h-10"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={submittingFeedback}
                className="rounded-xl h-10 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {submittingFeedback ? "กำลังส่ง..." : "ส่งข้อความ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
