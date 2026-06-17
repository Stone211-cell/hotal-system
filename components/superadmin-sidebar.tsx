"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserButton } from "@clerk/nextjs";
import {
  ShieldAlert,
  Settings,
  Building,
  ChevronRight,
  MessageSquare,
  ShieldCheck,
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

const adminNavItems = [
  {
    group: "ผู้ให้บริการ (SaaS Owner)",
    items: [
      {
        href: "/superadmin",
        label: "แดชบอร์ดระบบใหญ่",
        icon: ShieldCheck,
        description: "ภาพรวมทุกโรงแรมและการชำระเงิน",
      },
    ],
  },
];

interface SuperAdminSidebarProps {
  children: React.ReactNode;
}

export function SuperAdminSidebar({ children }: SuperAdminSidebarProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon" className="border-sidebar-border">
        {/* Header */}
        <SidebarHeader className="border-b border-sidebar-border p-4 bg-violet-950/5 dark:bg-violet-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">
                SaaS SuperAdmin
              </span>
              <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                ระบบจัดการหลังบ้านสูงสุด
              </span>
            </div>
          </div>
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent className="py-2">
          {adminNavItems.map((group) => (
            <SidebarGroup key={group.group}>
              <SidebarGroupLabel className="text-xs font-semibold text-violet-500 dark:text-violet-400 uppercase tracking-wider px-3 py-1">
                {group.group}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className={cn(
                            "transition-all duration-200",
                            isActive &&
                              "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold border-l-2 border-violet-600 rounded-none pl-2.5"
                          )}
                        >
                          <Link href={item.href} className="flex items-center gap-3 px-3 py-2">
                            <item.icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isActive
                                  ? "text-violet-600 dark:text-violet-400"
                                  : "text-muted-foreground"
                              )}
                            />
                            <span className="group-data-[collapsible=icon]:hidden">
                              {item.label}
                            </span>
                            {isActive && (
                              <ChevronRight className="ml-auto h-3 w-3 text-violet-600 dark:text-violet-400 group-data-[collapsible=icon]:hidden" />
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
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="กลับหน้าเว็บหลัก"
                className="text-muted-foreground hover:text-foreground"
              >
                <Link href="/" className="flex items-center gap-3 px-3 py-2">
                  <Building className="h-4 w-4 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden">เข้าสู่หน้าปกติ</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen bg-muted/10">
        {/* Top Bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur px-4">
          <SidebarTrigger className="h-8 w-8 text-violet-600 dark:text-violet-400" />
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
              SaaS ROOT ACCESS
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <UserButton />
          </div>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}
