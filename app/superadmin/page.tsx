"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  Wallet,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Mail,
  ShieldCheck,
  Calendar,
  DollarSign,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface HotelMember {
  email: string;
  name: string;
  userId: string;
}

interface Hotel {
  id: string;
  name: string;
  description?: string;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "OVERDUE" | "SUSPENDED";
  rentAmount: number;
  overdueMonths: number;
  nextBillingDate?: string;
  createdAt: string;
  _count: { rooms: number };
  members: HotelMember[];
}

interface SystemFeedback {
  id: string;
  userId?: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

const statusBadgeConfig: Record<string, { label: string; color: string }> = {
  TRIAL: { label: "ทดลองงาน", color: "bg-yellow-500/10 text-yellow-600 border-yellow-200" },
  ACTIVE: { label: "ปกติ", color: "bg-green-500/10 text-green-600 border-green-200" },
  OVERDUE: { label: "ค้างชำระ", color: "bg-red-500/10 text-red-600 border-red-200 animate-pulse" },
  SUSPENDED: { label: "ระงับการใช้งาน", color: "bg-gray-500/10 text-gray-600 border-gray-200" },
};

export default function SuperAdminPage() {
  const [data, setData] = useState<{ hotels: Hotel[]; feedbacks: SystemFeedback[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  // Form states for creation
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newRentAmount, setNewRentAmount] = useState("1500");
  const [newStatus, setNewStatus] = useState<"TRIAL" | "ACTIVE" | "OVERDUE" | "SUSPENDED">("TRIAL");

  // Form states for editing
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<"TRIAL" | "ACTIVE" | "OVERDUE" | "SUSPENDED">("TRIAL");
  const [editRentAmount, setEditRentAmount] = useState("1500");
  const [editOverdueMonths, setEditOverdueMonths] = useState("0");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/superadmin");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      }
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ระบบใหญ่ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newOwnerEmail) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      const res = await fetch("/api/superadmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          ownerEmail: newOwnerEmail,
          ownerName: newOwnerName || "Owner",
          rentAmount: Number(newRentAmount),
          subscriptionStatus: newStatus,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("สร้างระบบโรงแรมใหม่และผูกสิทธิ์เจ้าของสำเร็จ!");
        setIsCreateOpen(false);
        // Reset
        setNewName("");
        setNewDesc("");
        setNewOwnerEmail("");
        setNewOwnerName("");
        setNewRentAmount("1500");
        setNewStatus("TRIAL");
        fetchData();
      } else {
        toast.error(json.message || "ไม่สามารถสร้างโรงแรมได้");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const handleOpenEdit = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setEditName(hotel.name);
    setEditDesc(hotel.description || "");
    setEditStatus(hotel.subscriptionStatus);
    setEditRentAmount(hotel.rentAmount.toString());
    setEditOverdueMonths(hotel.overdueMonths.toString());
    setIsEditOpen(true);
  };

  const handleUpdateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel) return;

    try {
      const res = await fetch(`/api/superadmin/${selectedHotel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          subscriptionStatus: editStatus,
          rentAmount: Number(editRentAmount),
          overdueMonths: Number(editOverdueMonths),
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("อัปเดตข้อมูลและสถานะบิลของโรงแรมสำเร็จ!");
        setIsEditOpen(false);
        fetchData();
      } else {
        toast.error(json.message || "ไม่สามารถอัปเดตได้");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const handleDeleteHotel = async (id: string) => {
    if (!confirm("คุณต้องการลบโรงแรมนี้และข้อมูลห้องพัก ทั้งหมดในระบบ ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนคืนได้")) return;

    try {
      const res = await fetch(`/api/superadmin/${id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (json.success) {
        toast.success("ลบระบบโรงแรมออกจากฐานข้อมูลเรียบร้อยแล้ว");
        fetchData();
      } else {
        toast.error(json.message || "ไม่สามารถลบได้");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // คำนวณสรุป
  const totalHotels = data?.hotels.length || 0;
  const totalRooms = data?.hotels.reduce((sum, h) => sum + h._count.rooms, 0) || 0;
  const activeSaaSIncome = data?.hotels
    .filter((h) => h.subscriptionStatus === "ACTIVE" || h.subscriptionStatus === "TRIAL")
    .reduce((sum, h) => sum + h.rentAmount, 0) || 0;
  const overdueCount = data?.hotels.filter((h) => h.subscriptionStatus === "OVERDUE").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-violet-700 dark:text-violet-400 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7" />
            SaaS SuperAdmin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">ระบบควบคุมใบเสร็จการชำระเงินและตรวจสอบโรงแรมทั้งหมดในระบบ</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11">
          <Plus className="mr-2 h-4 w-4" />
          สร้างสิทธิ์โรงแรมใหม่
        </Button>
      </div>

      {/* สถิติหลัก */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { title: "จำนวนโรงแรมทั้งหมด", value: totalHotels, sub: "โรงแรมที่สมัครเข้าใช้งาน", icon: Building2, color: "text-violet-600 bg-violet-500/10" },
          { title: "จำนวนห้องพักรวม", value: totalRooms, sub: "ห้องที่พร้อมขายทั้งหมด", icon: Users, color: "text-blue-600 bg-blue-500/10" },
          { title: "รายรับระบบรวม/เดือน", value: formatCurrency(activeSaaSIncome), sub: "ประมาณการรายเดือน", icon: Wallet, color: "text-green-600 bg-green-500/10" },
          { title: "โรงแรมค้างชำระ", value: overdueCount, sub: "รอใบเสร็จ/ค้างจ่าย", icon: AlertCircle, color: "text-red-600 bg-red-500/10" },
        ].map((s) => (
          <Card key={s.title} className="border-border/40 hover:shadow-lg transition-all">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{s.title}</p>
                  <p className="text-2xl font-bold mt-1.5">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                </div>
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* เนื้อหาแท็บ */}
      <Tabs defaultValue="hotels" className="w-full">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="hotels" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white">
            <Building2 className="h-4 w-4 mr-2" />
            ระบบโรงแรมทั้งหมด ({totalHotels})
          </TabsTrigger>
          <TabsTrigger value="feedbacks" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white">
            <MessageSquare className="h-4 w-4 mr-2" />
            ข้อคิดเห็น / คำขอสมัคร ({data?.feedbacks.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* ตารางโรงแรม */}
        <TabsContent value="hotels" className="mt-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">รายชื่อโรงแรมและสถานะสมาชิก</CardTitle>
              <CardDescription>จัดการค่าบริการรายเดือนและสิทธิ์การเข้าใช้งานของเจ้าของโรงแรม</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.hotels.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed rounded-2xl">
                  <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">ยังไม่มีโรงแรมที่ลงทะเบียนในระบบ</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b">
                      <tr>
                        <th className="px-4 py-3">ชื่อโรงแรม</th>
                        <th className="px-4 py-3">จำนวนห้อง</th>
                        <th className="px-4 py-3">แอดมินโรงแรม (อีเมล)</th>
                        <th className="px-4 py-3">ค่าบริการระบบ</th>
                        <th className="px-4 py-3">สถานะบิล</th>
                        <th className="px-4 py-3">ค้างชำระ (เดือน)</th>
                        <th className="px-4 py-3 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data?.hotels.map((hotel) => {
                        const statusConfig = statusBadgeConfig[hotel.subscriptionStatus];
                        const owner = hotel.members[0];
                        return (
                          <tr key={hotel.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-4.5 font-medium">
                              <div>
                                <p className="font-semibold text-foreground">{hotel.name}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">{hotel.description || "ไม่มีรายละเอียด"}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4.5 font-medium">{hotel._count.rooms} ห้อง</td>
                            <td className="px-4 py-4.5">
                              <div>
                                <p className="font-medium">{owner?.name || "Owner"}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3 inline" /> {owner?.email || "ไม่มีข้อมูล"}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4.5 font-semibold">{formatCurrency(hotel.rentAmount)} / ด.</td>
                            <td className="px-4 py-4.5">
                              <Badge variant="outline" className={statusConfig.color}>
                                {statusConfig.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-4.5 font-semibold">
                              <span className={hotel.overdueMonths > 0 ? "text-red-500 font-bold" : "text-muted-foreground"}>
                                {hotel.overdueMonths} เดือน
                              </span>
                            </td>
                            <td className="px-4 py-4.5 text-right space-x-2">
                              <Button onClick={() => handleOpenEdit(hotel)} variant="outline" size="icon" className="h-8 w-8 rounded-lg hover:border-violet-500 hover:text-violet-600">
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button onClick={() => handleDeleteHotel(hotel.id)} variant="outline" size="icon" className="h-8 w-8 rounded-lg hover:border-red-500 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ความคิดเห็นลูกค้า */}
        <TabsContent value="feedbacks" className="mt-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">ความคิดเห็น / คำแนะนำและการแจ้งขอเปิดสิทธิ์</CardTitle>
              <CardDescription>ข้อความทั้งหมดที่ผู้ใช้โรงแรมส่งตรงมาหาคุณ</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.feedbacks.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed rounded-2xl">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">ยังไม่มีการส่งข้อคิดเห็นเข้ามา</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data?.feedbacks.map((f) => (
                    <div key={f.id} className="border border-border/60 rounded-2xl p-5 hover:bg-muted/10 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 mb-3">
                        <div>
                          <h3 className="font-semibold text-sm text-violet-700 dark:text-violet-400">{f.subject}</h3>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" /> {f.email}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                          <Calendar className="h-3.5 w-3.5" /> {format(new Date(f.createdAt), "d MMMM yyyy HH:mm", { locale: th })}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {f.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog สร้างโรงแรม */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>สร้างระบบโรงแรมและกำหนดเจ้าของ</DialogTitle>
            <DialogDescription>
              สร้างฐานข้อมูลห้องพักและเปิดสิทธิ์เจ้าของโรงแรมหลัก (Owner) เพื่อให้ล็อกอินผ่าน Clerk เข้าใช้งานได้ทันที
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateHotel} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="hotel-name">ชื่อโรงแรม *</Label>
              <Input id="hotel-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="เช่น แฮปปี้รีสอร์ท พัทยา" required className="rounded-xl h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hotel-desc">คำอธิบายย่อ</Label>
              <Input id="hotel-desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="เช่น ตั้งอยู่ริมหาดจอมเทียน ฯลฯ" className="rounded-xl h-10" />
            </div>

            <div className="border-t pt-3 mt-3">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-3">ข้อมูลสิทธิ์เจ้าของหลัก (Admin/Owner):</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="owner-email">อีเมลบัญชี Clerk *</Label>
                  <Input id="owner-email" type="email" value={newOwnerEmail} onChange={(e) => setNewOwnerEmail(e.target.value)} placeholder="ระบุอีเมลที่ใช้ล็อกอิน เช่น owner@hotel.com" required className="rounded-xl h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="owner-name">ชื่อผู้ติดต่อ</Label>
                  <Input id="owner-name" value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)} placeholder="ระบุชื่อเจ้าของโรงแรม" className="rounded-xl h-10" />
                </div>
              </div>
            </div>

            <div className="border-t pt-3 mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rent-amount">ค่าระบบ / เดือน (บาท)</Label>
                <Input id="rent-amount" type="number" value={newRentAmount} onChange={(e) => setNewRentAmount(e.target.value)} required className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-status">สถานะสมาชิกเริ่มต้น</Label>
                <Select value={newStatus} onValueChange={(v: any) => setNewStatus(v)}>
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRIAL">ทดลองงาน</SelectItem>
                    <SelectItem value="ACTIVE">ปกติ</SelectItem>
                    <SelectItem value="OVERDUE">ค้างชำระ</SelectItem>
                    <SelectItem value="SUSPENDED">ระงับชั่วคราว</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl h-10">ยกเลิก</Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10">
                สร้างสิทธิ์ใช้งาน
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog แก้ไขโรงแรม */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>แก้ไขการตั้งค่าโรงแรมและบิล</DialogTitle>
            <DialogDescription>
              อัปเดตยอดค่าเช่าระบบและสถานะค้างชำระรายเดือนของโรงแรม {selectedHotel?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateHotel} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-hotel-name">ชื่อโรงแรม *</Label>
              <Input id="edit-hotel-name" value={editName} onChange={(e) => setEditName(e.target.value)} required className="rounded-xl h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-hotel-desc">คำอธิบายย่อ</Label>
              <Input id="edit-hotel-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="rounded-xl h-10" />
            </div>

            <div className="border-t pt-3 mt-3 grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-rent">ค่าเช่าระบบ (บาท)</Label>
                <Input id="edit-rent" type="number" value={editRentAmount} onChange={(e) => setEditRentAmount(e.target.value)} required className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-overdue">ค้างจ่าย (เดือน)</Label>
                <Input id="edit-overdue" type="number" value={editOverdueMonths} onChange={(e) => setEditOverdueMonths(e.target.value)} required className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-sub">สถานะการชำระ</Label>
                <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRIAL">ทดลองงาน</SelectItem>
                    <SelectItem value="ACTIVE">ปกติ</SelectItem>
                    <SelectItem value="OVERDUE">ค้างชำระ</SelectItem>
                    <SelectItem value="SUSPENDED">ระงับชั่วคราว</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl h-10">ยกเลิก</Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10">
                บันทึกการแก้ไข
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
