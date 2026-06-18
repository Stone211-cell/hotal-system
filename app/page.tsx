"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDashboard, DashboardData, Period } from "@/services/dashboardService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CircularProgressChart, RevenueBarChart, TrendLineChart } from "@/components/dashboard-charts";
import {
  BedDouble, TrendingUp, TrendingDown, Wallet, Users,
  ArrowUpRight, ArrowDownRight, CalendarCheck, DoorOpen,
  CheckCircle2, Clock, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING:    { label: "รอยืนยัน",    color: "bg-yellow-500/10 text-yellow-600 border-yellow-200" },
  CONFIRMED:  { label: "ยืนยันแล้ว",  color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  CHECKED_IN: { label: "เข้าพักแล้ว", color: "bg-green-500/10 text-green-600 border-green-200" },
  CHECKED_OUT:{ label: "ออกแล้ว",     color: "bg-gray-500/10 text-gray-600 border-gray-200" },
  CANCELLED:  { label: "ยกเลิก",      color: "bg-red-500/10 text-red-600 border-red-200" },
};

const paymentConfig: Record<string, { label: string; color: string }> = {
  UNPAID:  { label: "ยังไม่ชำระ",  color: "bg-red-500/10 text-red-600 border-red-200" },
  PARTIAL: { label: "ชำระบางส่วน", color: "bg-orange-500/10 text-orange-600 border-orange-200" },
  PAID:    { label: "ชำระแล้ว",    color: "bg-green-500/10 text-green-600 border-green-200" },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    setError(null);
    getDashboard(period)
      .then((res) => {
        if (res.isSuperAdmin) {
          router.push("/superadmin");
          return;
        }
        setData(res);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลแดชบอร์ด");
      })
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <Card className="w-full max-w-lg border-red-200/50 bg-red-500/5 dark:bg-red-950/10 backdrop-blur shadow-xl rounded-3xl">
        <CardContent className="p-8 flex flex-col items-center text-center">
          <div className="h-16 w-16 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center rounded-full mb-6">
            <Building2 className="h-8 w-8 animate-pulse" />
          </div>
          
          <h2 className="text-xl font-bold tracking-tight text-red-600 dark:text-red-400 mb-2">
            ไม่สามารถเชื่อมต่อฐานข้อมูลได้
          </h2>
          
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            ระบบตรวจพบความผิดพลาดในการเชื่อมต่อฐานข้อมูลแดชบอร์ด สาเหตุส่วนใหญ่เกิดจากโครงการ Supabase ของคุณถูกระงับการใช้งานชั่วคราว (Paused)
          </p>

          <div className="w-full text-left bg-background/50 border rounded-2xl p-5 mb-6 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ขั้นตอนในการกู้คืนระบบ:
            </h3>
            <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-2 leading-relaxed">
              <li>เปิดเบราว์เซอร์ไปที่หน้าต่าง <strong>Supabase Dashboard</strong> (supabase.com/dashboard)</li>
              <li>คลิกเลือกโปรเจกต์ของคุณ</li>
              <li>กดปุ่ม <strong>&quot;Restore Project&quot;</strong> (กู้คืนโครงการ) เพื่อเปิดใช้งานระบบ</li>
              <li>รอให้ระบบสร้างเซิร์ฟเวอร์เสร็จ (1-2 นาที) แล้วลองกดปุ่มด้านล่างเพื่อเริ่มใหม่</li>
            </ol>
          </div>

          <Button 
            className="w-full h-11 text-sm font-medium rounded-xl transition-all"
            variant="outline"
            onClick={() => {
              setLoading(true);
              setError(null);
              getDashboard(period)
                .then(setData)
                .catch((err) => setError(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูล"))
                .finally(() => setLoading(false));
            }}
          >
            ลองใหม่อีกครั้ง
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ภาพรวมระบบจัดการโรงแรม</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="day">วันนี้</TabsTrigger>
            <TabsTrigger value="month">เดือนนี้</TabsTrigger>
            <TabsTrigger value="year">ปีนี้</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { title: "Check-in วันนี้", value: data.bookings.checkedInToday, sub: "ผู้เข้าพักใหม่", icon: DoorOpen },
          { title: "Check-out วันนี้", value: data.bookings.checkingOutToday, sub: "รอ check-out", icon: CalendarCheck },
          { title: "ห้องว่าง", value: `${data.rooms.available}/${data.rooms.total}`, sub: "พร้อมรับลูกค้า", icon: BedDouble },
          { title: "อัตราเข้าพัก", value: `${data.rooms.occupancyRate}%`, sub: `${data.rooms.occupied} ห้องมีผู้เข้าพัก`, icon: Building2 },
        ].map((s) => (
          <Card key={s.title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.title}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Finance */}
      {data.member?.permissions?.canViewFinance && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">รายรับ</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(data.finance.totalIncome)}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-green-500/15 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">รายจ่าย</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(data.finance.totalExpense)}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-red-500/15 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card className={data.finance.netProfit >= 0 ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/10" : "border-orange-200 bg-orange-50/50"}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">กำไรสุทธิ</p>
                <p className={`text-3xl font-bold mt-1 ${data.finance.netProfit >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                  {formatCurrency(data.finance.netProfit)}
                </p>
              </div>
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${data.finance.netProfit >= 0 ? "bg-blue-500/15" : "bg-orange-500/15"}`}>
                <Wallet className={`h-5 w-5 ${data.finance.netProfit >= 0 ? "text-blue-600" : "text-orange-600"}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CircularProgressChart
          value={data.rooms.occupancyRate}
          title="อัตราเข้าพักเฉลี่ย"
          subtitle={`มีห้องพักว่าง ${data.rooms.available} ห้อง จากทั้งหมด ${data.rooms.total} ห้อง`}
        />
        {data.member?.permissions?.canViewFinance ? (
          <RevenueBarChart
            income={data.finance.totalIncome}
            expense={data.finance.totalExpense}
          />
        ) : (
          <div className="p-5 border rounded-2xl bg-card hover:shadow-md transition-all flex flex-col justify-center items-center text-center text-muted-foreground min-h-[220px]">
            <Wallet className="h-8 w-8 mb-3 text-muted-foreground/20" />
            <p className="text-sm font-semibold">คุณไม่มีสิทธิ์เข้าถึงบัญชีการเงิน</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">ข้อมูลเปรียบเทียบรายรับ-รายจ่ายถูกจำกัดสิทธิ์เฉพาะผู้จัดการการเงินหลัก</p>
          </div>
        )}
        <TrendLineChart
          dataPoints={[20, 35, 45, 30, 50, data.rooms.occupancyRate]}
          labels={["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส./ปัจจุบัน"]}
        />
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            การจองล่าสุด
            <span className="ml-auto text-xs font-normal text-muted-foreground">{data.bookings.total} รายการ</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.bookings.recent.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">ยังไม่มีการจองในช่วงเวลานี้</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.bookings.recent.map((booking) => {
                const sc = statusConfig[booking.status] || statusConfig.PENDING;
                const pc = paymentConfig[booking.paymentStatus] || paymentConfig.UNPAID;
                return (
                  <div key={booking.id} className="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      {booking.status === "CHECKED_IN" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {booking.guest.firstName} {booking.guest.lastName}
                        </p>
                        <Badge variant="outline" className={cn("text-xs h-5", sc.color)}>{sc.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ห้อง {booking.room.roomNumber} · {format(new Date(booking.checkInDate), "d MMM", { locale: th })} → {format(new Date(booking.checkOutDate), "d MMM yyyy", { locale: th })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatCurrency(booking.finalAmount)}</p>
                      <Badge variant="outline" className={cn("text-xs h-5 mt-0.5", pc.color)}>{pc.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
