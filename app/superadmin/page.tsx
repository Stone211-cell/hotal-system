"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
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
  MessageSquare,
  ImagePlus,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import api from "@/lib/axios";

interface HotelMember {
  email: string;
  name: string;
  userId: string;
}

interface Hotel {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string | null;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "OVERDUE" | "SUSPENDED" | "TERMINATED";
  rentAmount: number;
  overdueMonths: number;
  isPaidThisMonth: boolean;
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
  OVERDUE: { label: "ค้างชำระ", color: "bg-orange-500/10 text-orange-600 border-orange-200 animate-pulse" },
  SUSPENDED: { label: "ระงับการใช้งาน", color: "bg-gray-500/10 text-gray-600 border-gray-200" },
  TERMINATED: { label: "ยกเลิกบริการ", color: "bg-red-500/10 text-red-600 border-red-200" },
};

export default function SuperAdminPage() {
  const [data, setData] = useState<{ hotels: Hotel[]; feedbacks: SystemFeedback[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [deleteConfirmHotel, setDeleteConfirmHotel] = useState<Hotel | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Create Form State
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLogoUrl, setNewLogoUrl] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newRentAmount, setNewRentAmount] = useState("1500");
  const [newStatus, setNewStatus] = useState<"TRIAL" | "ACTIVE" | "OVERDUE" | "SUSPENDED" | "TERMINATED">("TRIAL");

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editStatus, setEditStatus] = useState<"TRIAL" | "ACTIVE" | "OVERDUE" | "SUSPENDED" | "TERMINATED">("TRIAL");
  const [editRentAmount, setEditRentAmount] = useState("1500");
  const [editOverdueMonths, setEditOverdueMonths] = useState("0");
  const [editIsPaidThisMonth, setEditIsPaidThisMonth] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setLogoState: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.src = ev.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/webp", 0.8);
        setLogoState(dataUrl);
      };
    };
    reader.readAsDataURL(file);
  };

  const fetchData = async () => {
    try {
      const res = await api.get("/api/superadmin");
      const json = res.data;
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

  const handleImpersonate = async (hotelId: string) => {
    try {
      const res = await api.post("/api/impersonate", { hotelId, action: "enter" });
      if (res.data.success) {
        toast.success("กำลังเข้าสู่ระบบในฐานะเจ้าของโรงแรม...");
        window.location.href = "/";
      } else {
        toast.error(res.data.message || "ไม่สามารถเข้าจัดการโรงแรมได้");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเข้าจัดการโรงแรม");
    }
  };

  // เปิดฟอร์มสร้างโรงแรม (Quick Approve จากคำขอ)
  const handleApproveRequest = (f: SystemFeedback) => {
    setNewName(f.subject.replace("[สมัครใช้งาน] ", "").split("—")[0].trim() || "โรงแรมใหม่");
    setNewOwnerEmail(f.email);
    // พยายามดึงชื่อออกมาจาก message ถ้ามี
    const lines = f.message.split("\n");
    let extractedName = "";
    lines.forEach(line => {
      if (line.includes("ชื่อผู้ติดต่อ:")) {
        extractedName = line.replace("ชื่อผู้ติดต่อ:", "").trim();
      }
    });
    setNewOwnerName(extractedName);
    setNewRentAmount("1500");
    setNewStatus("TRIAL");
    setActiveFeedbackId(f.id); // บันทึก ID เพื่อลบคำขอหลังจากสร้างสำเร็จ
    setIsCreateOpen(true);
  };

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newOwnerEmail) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      // 1. สร้างโรงแรม
      const res = await api.post("/api/superadmin", {
        name: newName,
        description: newDesc,
        logoUrl: newLogoUrl,
        ownerEmail: newOwnerEmail,
        ownerName: newOwnerName || "Owner",
        rentAmount: Number(newRentAmount),
        subscriptionStatus: newStatus,
      });

      const json = res.data;
      if (json.success) {
        // 2. ถ้ามี activeFeedbackId (มาจากคำขอสมัคร) ให้ลบคำขอนั้นทิ้ง
        if (activeFeedbackId) {
          await api.delete(`/api/superadmin/feedback/${activeFeedbackId}`);
        }

        toast.success("สร้างระบบโรงแรมใหม่และผูกสิทธิ์เจ้าของสำเร็จ!");
        setIsCreateOpen(false);
        setActiveFeedbackId(null);
        
        // Reset
        setNewName("");
        setNewDesc("");
        setNewLogoUrl("");
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
    setEditLogoUrl(hotel.logoUrl || "");
    setEditStatus(hotel.subscriptionStatus);
    setEditRentAmount(hotel.rentAmount.toString());
    setEditOverdueMonths(hotel.overdueMonths.toString());
    setEditIsPaidThisMonth(hotel.isPaidThisMonth || false);
    setIsEditOpen(true);
  };

  const handleUpdateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel) return;

    try {
      const res = await api.patch(`/api/superadmin/hotels/${selectedHotel.id}`, {
        name: editName,
        description: editDesc,
        logoUrl: editLogoUrl,
        subscriptionStatus: editStatus,
        rentAmount: Number(editRentAmount),
        overdueMonths: Number(editOverdueMonths),
        isPaidThisMonth: editIsPaidThisMonth
      });

      const json = res.data;
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

  // Quick toggle isPaidThisMonth on the table directly
  const handleToggleIsPaid = async (hotelId: string, currentStatus: boolean) => {
    try {
      const res = await api.patch(`/api/superadmin/hotels/${hotelId}`, {
        isPaidThisMonth: !currentStatus
      });
      if (res.data.success) {
        toast.success(currentStatus ? "ยกเลิกการชำระบิลแล้ว" : "ทำเครื่องหมายว่าชำระบิลแล้ว");
        fetchData();
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอัปเดตสถานะบิล");
    }
  };

  const handleDeleteHotel = async () => {
    if (!deleteConfirmHotel) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/api/superadmin/${deleteConfirmHotel.id}`);
      const json = res.data;
      if (json.success) {
        toast.success("ลบระบบโรงแรมออกจากฐานข้อมูลเรียบร้อยแล้ว");
        setDeleteConfirmHotel(null);
        setDeleteConfirmText("");
        fetchData();
      } else {
        toast.error(json.message || "ไม่สามารถลบได้");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsDeleting(false);
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

  // แยกคำขอสมัคร กับ ข้อเสนอแนะทั่วไป
  const registrationRequests = data?.feedbacks.filter(f => f.subject.startsWith("[สมัครใช้งาน]")) || [];
  const generalFeedbacks = data?.feedbacks.filter(f => !f.subject.startsWith("[สมัครใช้งาน]")) || [];

  const totalHotels = data?.hotels.length || 0;
  const totalRooms = data?.hotels.reduce((sum: number, h: any) => sum + h._count.rooms, 0) || 0;
  const activeSaaSIncome = data?.hotels
    .filter((h) => h.subscriptionStatus === "ACTIVE" || h.subscriptionStatus === "TRIAL")
    .reduce((sum: number, h: any) => sum + h.rentAmount, 0) || 0;
  const overdueCount = data?.hotels.filter((h) => h.subscriptionStatus === "OVERDUE" || (h.subscriptionStatus === "ACTIVE" && !h.isPaidThisMonth)).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-violet-600 dark:text-violet-400" />
            SaaS SuperAdmin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">ระบบจัดการโรงแรม อนุมัติสิทธิ์การใช้งาน และตรวจสอบบิลค่าเช่ารายเดือน</p>
        </div>
        <Button onClick={() => { setIsCreateOpen(true); setActiveFeedbackId(null); }} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11">
          <Plus className="mr-2 h-4 w-4" />
          สร้างสิทธิ์โรงแรมใหม่
        </Button>
      </div>

      {/* สถิติหลัก */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { title: "โรงแรมในระบบ", value: totalHotels, sub: "โรงแรมที่สมัครเข้าใช้งาน", icon: Building2, color: "text-violet-600 bg-violet-500/10" },
          { title: "รออนุมัติเปิดสิทธิ์", value: registrationRequests.length, sub: "คำขอสมัครล่าสุด", icon: Users, color: "text-orange-600 bg-orange-500/10" },
          { title: "เป้าหมายรายรับ/เดือน", value: formatCurrency(activeSaaSIncome), sub: "ประมาณการรายเดือน", icon: Wallet, color: "text-green-600 bg-green-500/10" },
          { title: "ยังไม่ชำระค่าบริการ", value: overdueCount, sub: "ค้างจ่ายในเดือนนี้", icon: AlertCircle, color: "text-rose-600 bg-rose-500/10" },
        ].map((s) => (
          <Card key={s.title} className="border-border/40 hover:shadow-lg transition-all border-l-4 border-l-violet-500/50">
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
      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="bg-muted/60 p-1 rounded-xl h-auto flex flex-wrap">
          <TabsTrigger value="requests" className="rounded-lg py-2.5 data-[state=active]:bg-violet-600 data-[state=active]:text-white">
            <Users className="h-4 w-4 mr-2" />
            คำขอสมัครใช้งาน ({registrationRequests.length})
          </TabsTrigger>
          <TabsTrigger value="hotels" className="rounded-lg py-2.5 data-[state=active]:bg-violet-600 data-[state=active]:text-white">
            <Building2 className="h-4 w-4 mr-2" />
            โรงแรมที่ใช้งานอยู่ ({totalHotels})
          </TabsTrigger>
          <TabsTrigger value="feedbacks" className="rounded-lg py-2.5 data-[state=active]:bg-violet-600 data-[state=active]:text-white">
            <MessageSquare className="h-4 w-4 mr-2" />
            ข้อเสนอแนะ ({generalFeedbacks.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. คำขอสมัครใช้งาน */}
        <TabsContent value="requests" className="mt-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">คำขอสมัครใช้งานรอการอนุมัติ</CardTitle>
              <CardDescription>กดสวิตช์เพื่ออนุมัติและสร้างบัญชีโรงแรมให้กับลูกค้า</CardDescription>
            </CardHeader>
            <CardContent>
              {registrationRequests.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed rounded-2xl">
                  <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">ไม่มีคำขอสมัครใช้งานใหม่</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {registrationRequests.map((f) => (
                    <div key={f.id} className="relative border border-violet-500/20 bg-violet-500/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                      <div className="flex-1 pr-8">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-orange-500/10 text-orange-600 border-orange-200">รออนุมัติ</Badge>
                          <h3 className="font-bold text-base text-foreground">
                            {f.subject.replace("[สมัครใช้งาน] ", "")}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1.5">
                          <Mail className="h-4 w-4" /> {f.email}
                          <span className="mx-2">•</span>
                          <Calendar className="h-4 w-4" /> {format(new Date(f.createdAt), "d MMMM yyyy HH:mm", { locale: th })}
                        </p>
                        <div className="bg-background/80 p-3 rounded-xl border text-sm text-muted-foreground whitespace-pre-wrap">
                          {f.message}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-3 bg-background p-4 rounded-xl border">
                        <div className="text-right">
                          <p className="text-sm font-semibold">อนุมัติคำขอ</p>
                          <p className="text-xs text-muted-foreground">สร้างโรงแรมใหม่</p>
                        </div>
                        <Switch 
                          checked={false} 
                          onCheckedChange={() => handleApproveRequest(f)} 
                          className="data-[state=checked]:bg-violet-600"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-4 right-4 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                          onClick={async () => {
                            if (confirm("ต้องการลบคำขอนี้ทิ้งโดยไม่อนุมัติใช่หรือไม่?")) {
                              await api.delete(`/api/superadmin/feedback/${f.id}`);
                              fetchData();
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ตารางโรงแรมที่ใช้งานอยู่ */}
        <TabsContent value="hotels" className="mt-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">รายชื่อโรงแรมและจัดการค่าบริการรายเดือน</CardTitle>
              <CardDescription>ตรวจสอบสถานะบิล ค่าเช่าระบบ และระงับ/ยกเลิกบริการ</CardDescription>
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
                        <th className="px-4 py-3">ข้อมูลโรงแรม / วันที่อนุมัติ</th>
                        <th className="px-4 py-3">เจ้าของ (Owner)</th>
                        <th className="px-4 py-3">ค่าบริการระบบ</th>
                        <th className="px-4 py-3 text-center">ชำระเดือนนี้แล้ว</th>
                        <th className="px-4 py-3">สถานะบัญชี</th>
                        <th className="px-4 py-3 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data?.hotels.map((hotel) => {
                        const statusConfig = statusBadgeConfig[hotel.subscriptionStatus];
                        const owner = hotel.members[0];
                        return (
                          <tr key={hotel.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-4 font-medium">
                              <div>
                                <p className="font-semibold text-foreground text-base mb-1">{hotel.name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> อนุมัติเมื่อ {format(new Date(hotel.createdAt), "d MMM yyyy", { locale: th })}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div>
                                <p className="font-medium">{owner?.name || "ไม่มีชื่อ"}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Mail className="h-3 w-3" /> {owner?.email || "ไม่มีข้อมูล"}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 font-bold text-foreground">
                              {formatCurrency(hotel.rentAmount)} / ด.
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex items-center justify-center">
                                <Switch 
                                  checked={hotel.isPaidThisMonth || false} 
                                  onCheckedChange={() => handleToggleIsPaid(hotel.id, hotel.isPaidThisMonth || false)}
                                  className="data-[state=checked]:bg-green-500"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <Badge variant="outline" className={statusConfig.color}>
                                {statusConfig.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button onClick={() => handleImpersonate(hotel.id)} variant="outline" size="sm" className="h-8 text-xs rounded-lg border-blue-200 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 hover:border-blue-300">
                                  เข้าจัดการ
                                </Button>
                                <Button onClick={() => handleOpenEdit(hotel)} variant="outline" size="icon" className="h-8 w-8 rounded-lg hover:border-violet-500 hover:text-violet-600">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
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

        {/* 3. ข้อเสนอแนะทั่วไป */}
        <TabsContent value="feedbacks" className="mt-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">ข้อเสนอแนะและแจ้งปัญหา</CardTitle>
              <CardDescription>ข้อความอื่นๆ ที่ผู้ใช้ส่งตรงมาหาคุณ</CardDescription>
            </CardHeader>
            <CardContent>
              {generalFeedbacks.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed rounded-2xl">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">ยังไม่มีข้อเสนอแนะใหม่</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generalFeedbacks.map((f) => (
                    <div key={f.id} className="relative border border-border/60 rounded-2xl p-5 hover:bg-muted/10 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 mb-3 pr-8">
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{f.subject}</h3>
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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                        onClick={async () => {
                          if (confirm("ต้องการลบข้อเสนอแนะนี้ทิ้งใช่หรือไม่?")) {
                            await api.delete(`/api/superadmin/feedback/${f.id}`);
                            fetchData();
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
        <DialogContent className="max-w-md rounded-2xl border-violet-500/20">
          <DialogHeader>
            <DialogTitle className="text-foreground">อนุมัติ / สร้างสิทธิ์โรงแรมใหม่</DialogTitle>
            <DialogDescription>
              สร้างฐานข้อมูลห้องพักและเปิดสิทธิ์เจ้าของโรงแรมหลักให้ลูกค้า
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateHotel} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="hotel-name">ชื่อโรงแรม *</Label>
              <Input id="hotel-name" value={newName} onChange={(e) => setNewName(e.target.value)} required className="rounded-xl h-10" />
            </div>
            
            <div className="border-t border-violet-500/20 pt-3 mt-3">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-3 flex items-center gap-1.5"><Users className="h-4 w-4"/> ข้อมูลเจ้าของบัญชี (Owner)</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="owner-email">อีเมลบัญชี *</Label>
                  <Input id="owner-email" type="email" value={newOwnerEmail} onChange={(e) => setNewOwnerEmail(e.target.value)} required className="rounded-xl h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="owner-name">ชื่อผู้ติดต่อ</Label>
                  <Input id="owner-name" value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)} className="rounded-xl h-10" />
                </div>
              </div>
            </div>

            <div className="border-t border-violet-500/20 pt-3 mt-3">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-3 flex items-center gap-1.5"><FileText className="h-4 w-4"/> ตั้งค่าการชำระเงินรายเดือน (SaaS Billing)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rent-amount">ยอดเรียกเก็บ / เดือน (บาท)</Label>
                  <Input id="rent-amount" type="number" step="any" value={newRentAmount} onChange={(e) => setNewRentAmount(e.target.value)} required className="rounded-xl h-10 border-violet-200 focus-visible:ring-violet-500" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-status">สถานะเริ่มต้น</Label>
                  <Select value={newStatus} onValueChange={(v: any) => setNewStatus(v)}>
                    <SelectTrigger className="rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRIAL">ทดลองงานฟรี</SelectItem>
                      <SelectItem value="ACTIVE">ปกติ (เก็บเงิน)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="rounded-xl h-10">ยกเลิก</Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10 shadow-md shadow-violet-500/20">
                อนุมัติและสร้างสิทธิ์
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog แก้ไขโรงแรม */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-2xl border-violet-500/20">
          <DialogHeader>
            <DialogTitle>จัดการบัญชีและบิลรายเดือน: {selectedHotel?.name}</DialogTitle>
            <DialogDescription>
              อัปเดตยอดเรียกเก็บ หรือระงับการใช้งานโรงแรมนี้
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateHotel} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-hotel-name">ชื่อโรงแรม *</Label>
              <Input id="edit-hotel-name" value={editName} onChange={(e) => setEditName(e.target.value)} required className="rounded-xl h-10" />
            </div>

            <div className="border-t border-violet-500/20 pt-3 mt-3">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-3 flex items-center gap-1.5"><DollarSign className="h-4 w-4"/> สถานะการชำระบิลรอบเดือนนี้</p>
              
              <div className="flex items-center justify-between bg-muted/40 p-4 rounded-xl border border-border/50">
                <div>
                  <p className="text-sm font-semibold">โรงแรมชำระเงินเดือนนี้แล้วหรือยัง?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">เปิดไว้เพื่อลบการค้างชำระในรอบเดือน</p>
                </div>
                <Switch 
                  checked={editIsPaidThisMonth} 
                  onCheckedChange={setEditIsPaidThisMonth} 
                  className="data-[state=checked]:bg-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-rent">ยอดเรียกเก็บ / เดือน (บาท)</Label>
                  <Input id="edit-rent" type="number" step="any" value={editRentAmount} onChange={(e) => setEditRentAmount(e.target.value)} required className="rounded-xl h-10 font-bold text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-sub">สถานะบัญชี (ปิดระบบ/ยกเลิก)</Label>
                  <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
                    <SelectTrigger className="rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRIAL">ทดลองงาน</SelectItem>
                      <SelectItem value="ACTIVE">ปกติ</SelectItem>
                      <SelectItem value="OVERDUE">ค้างชำระ (เตือน)</SelectItem>
                      <SelectItem value="SUSPENDED">ระงับชั่วคราว (ล็อกระบบ)</SelectItem>
                      <SelectItem value="TERMINATED">ยกเลิกบริการ (ปิดถาวร)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
               <Button type="button" onClick={() => { setIsEditOpen(false); setDeleteConfirmHotel(selectedHotel); setDeleteConfirmText(""); }} variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-8 px-2">
                 ลบข้อมูลโรงแรมนี้ทิ้งทั้งหมด
               </Button>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl h-10">ยกเลิก</Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10 shadow-md shadow-violet-500/20">
                บันทึกการเปลี่ยนแปลง
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog ยืนยันการลบโรงแรม */}
      <Dialog open={!!deleteConfirmHotel} onOpenChange={(open) => { if (!open) setDeleteConfirmHotel(null); }}>
        <DialogContent className="max-w-sm rounded-2xl border-red-500/20">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              ยืนยันการลบข้อมูลโรงแรม
            </DialogTitle>
            <DialogDescription className="text-foreground pt-2">
              การลบข้อมูลนี้จะลบห้องพัก การจอง และผู้ใช้ที่เกี่ยวข้องทั้งหมดอย่างถาวร <strong>ไม่สามารถกู้คืนได้</strong>
              <br /><br />
              หากมั่นใจ กรุณาพิมพ์ชื่อ <strong>{deleteConfirmHotel?.name}</strong> เพื่อยืนยัน:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input 
              placeholder={deleteConfirmHotel?.name} 
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="rounded-xl border-red-200 focus-visible:ring-red-500"
            />
          </div>
          <DialogFooter className="mt-4 sm:justify-center flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmHotel(null)} className="rounded-xl w-full sm:w-auto">ยกเลิก</Button>
            <Button 
              type="button" 
              onClick={handleDeleteHotel}
              disabled={deleteConfirmText !== deleteConfirmHotel?.name || isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl w-full sm:w-auto"
            >
              {isDeleting ? "กำลังลบ..." : "ยืนยันการลบถาวร"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
