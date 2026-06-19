"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  ShieldAlert,
  UserPlus,
  Trash2,
  Lock,
  Building,
  Key,
  ShieldCheck,
  CheckCircle2,
  User
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axios";

interface Member {
  id: string;
  email: string;
  name?: string;
  role: "OWNER" | "STAFF";
  isActive: boolean;
  canManageRooms: boolean;
  canManageBookings: boolean;
  canViewFinance: boolean;
  createdAt: string;
}

interface HotelInfo {
  name: string;
  description: string;
  subscriptionStatus: string;
  rentAmount: number;
  overdueMonths: number;
}

export default function SettingsPage() {
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [hotelInfo, setHotelInfo] = useState<HotelInfo | null>(null);

  // Form states for adding staff
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [canManageRooms, setCanManageRooms] = useState(false);
  const [canManageBookings, setCanManageBookings] = useState(true);
  const [canViewFinance, setCanViewFinance] = useState(false);

  // Fetch current user and members
  const fetchSettingsData = async () => {
    try {
      const membersRes = await api.get("/api/members");
      const membersJson = membersRes.data;

      if (membersJson.success) {
        setMembers(membersJson.data);
        setIsOwner(true); // If we successfully queried members, we are the OWNER
        
        setHotelInfo({
          name: membersJson.hotelName || "โรงแรมของฉัน",
          description: "ระบบจัดการส่วนตัว",
          subscriptionStatus: "ACTIVE",
          rentAmount: 1500,
          overdueMonths: 0
        });
      } else {
        setIsOwner(false); // Staf members get 403 / fail
        // If staff, we might want to get hotel info from somewhere else or we just leave it default
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsOwner(false);
        setHotelInfo({
          name: err.response?.data?.hotelName || "โรงแรมของฉัน",
          description: "ระบบจัดการส่วนตัว",
          subscriptionStatus: "ACTIVE",
          rentAmount: 1500,
          overdueMonths: 0
        });
      } else {
        console.error(err);
        toast.error("ไม่สามารถเชื่อมต่อระบบตั้งค่าได้");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error("กรุณากรอกอีเมลพนักงาน");
      return;
    }

    try {
      const res = await api.post("/api/members", {
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: "STAFF",
        canManageRooms,
        canManageBookings,
        canViewFinance,
      });

      const json = res.data;
      if (json.success) {
        toast.success(`เพิ่มพนักงาน ${inviteEmail} เข้าสู่ระบบสำเร็จแล้ว!`);
        setInviteEmail("");
        setInviteName("");
        setCanManageRooms(false);
        setCanManageBookings(true);
        setCanViewFinance(false);
        fetchSettingsData();
      } else {
        toast.error(json.message || "ไม่สามารถเพิ่มพนักงานได้");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const handleTogglePermission = async (
    memberId: string,
    field: "canManageRooms" | "canManageBookings" | "canViewFinance" | "isActive",
    value: boolean
  ) => {
    try {
      const res = await api.put(`/api/members/${memberId}`, { [field]: value });

      const json = res.data;
      if (json.success) {
        toast.success("อัปเดตสิทธิ์การเข้าถึงพนักงานเสร็จสิ้น!");
        // Update local state
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, [field]: value } : m))
        );
      } else {
        toast.error(json.message || "ไม่สามารถแก้ไขสิทธิ์ได้");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const handleDeleteMember = async (id: string, email: string) => {
    if (!confirm(`คุณแน่ใจว่าต้องการลบพนักงาน ${email} ออกจากระบบ ใช่หรือไม่?`)) return;

    try {
      const res = await api.delete(`/api/members/${id}`);

      const json = res.data;
      if (json.success) {
        toast.success("ลบพนักงานออกจากระบบโรงแรมสำเร็จแล้ว");
        fetchSettingsData();
      } else {
        toast.error(json.message || "ไม่สามารถลบได้");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ตั้งค่า</h1>
        <p className="text-sm text-muted-foreground mt-0.5">จัดการข้อมูลโรงแรมและสิทธิ์ทีมงานในระบบของคุณ</p>
      </div>

      <Tabs defaultValue={isOwner ? "members" : "hotel"} className="w-full">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          {isOwner && (
            <TabsTrigger value="members" className="rounded-lg">
              <Users className="h-4 w-4 mr-2" />
              จัดการพนักงานสิทธิ์การใช้งาน ({members.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="hotel" className="rounded-lg">
            <Building className="h-4 w-4 mr-2" />
            ข้อมูลโรงแรม
          </TabsTrigger>
        </TabsList>

        {/* แท็บจัดการพนักงาน */}
        {isOwner && (
          <TabsContent value="members" className="space-y-6 mt-4">
            {/* ฟอร์มเพิ่มพนักงาน */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  เพิ่มสิทธิ์พนักงานใหม่
                </CardTitle>
                <CardDescription>
                  ป้อนอีเมลที่พนักงานใช้ลงทะเบียนในระบบ Clerk เพื่อมอบสิทธิ์เข้าทำงานในโรงแรมของคุณ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="staff-email">อีเมลพนักงาน *</Label>
                      <Input
                        id="staff-email"
                        type="email"
                        placeholder="เช่น employee@hotel.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        className="rounded-xl h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="staff-name">ชื่อพนักงาน</Label>
                      <Input
                        id="staff-name"
                        placeholder="เช่น สมชาย ใจดี"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="rounded-xl h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 border rounded-2xl p-4 bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      ตั้งค่าสิทธิ์เข้าถึงเบื้องต้น:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="perm-rooms" className="text-sm cursor-pointer">
                          จัดการห้องพัก (เพิ่ม/ลบ/แก้ไขห้อง)
                        </Label>
                        <Switch
                          id="perm-rooms"
                          checked={canManageRooms}
                          onCheckedChange={setCanManageRooms}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="perm-bookings" className="text-sm cursor-pointer">
                          จัดการการจองและเช็คอินเช็คเอาท์
                        </Label>
                        <Switch
                          id="perm-bookings"
                          checked={canManageBookings}
                          onCheckedChange={setCanManageBookings}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="perm-finance" className="text-sm cursor-pointer">
                          ดูรายงานสรุปการเงิน/บันทึกรายจ่าย
                        </Label>
                        <Switch
                          id="perm-finance"
                          checked={canViewFinance}
                          onCheckedChange={setCanViewFinance}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full rounded-xl h-10 mt-4">
                      เพิ่มพนักงาน
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* รายชื่อพนักงาน */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  รายชื่อทีมงานทั้งหมด
                </CardTitle>
                <CardDescription>
                  เปิด/ปิดสิทธิ์พนักงานด้วยสวิตช์ หรือติ๊กมอบสิทธิ์รายรายการได้แบบรีลไทม์
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.map((m) => {
                    const isSelf = m.role === "OWNER";
                    return (
                      <div
                        key={m.id}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-2xl hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 bg-primary/10 text-primary flex items-center justify-center rounded-full">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">
                                {m.name || "ไม่ระบุชื่อ"}
                              </p>
                              <Badge
                                className={
                                  isSelf
                                    ? "bg-violet-500/10 text-violet-600 border-violet-200"
                                    : "bg-blue-500/10 text-blue-600 border-blue-200"
                                }
                                variant="outline"
                              >
                                {isSelf ? "Owner (แอดมินโรงแรม)" : "Staff (พนักงาน)"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{m.email}</p>
                          </div>
                        </div>

                        {/* สวิตช์เปิดปิดสิทธิ์และเปิดใช้งาน (เฉพาะสต๊าฟ) */}
                        <div className="flex items-center gap-6 flex-wrap">
                          <div className="flex items-center gap-4 border-l pl-4 shrink-0">
                            {/* เปิดปิดใช้งานตัวคน */}
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`active-${m.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                {m.isActive ? "ใช้งานอยู่" : "ปิดการใช้งาน"}
                              </Label>
                              <Switch
                                id={`active-${m.id}`}
                                disabled={isSelf}
                                checked={m.isActive}
                                onCheckedChange={(val: boolean) =>
                                  handleTogglePermission(m.id, "isActive", val)
                                }
                              />
                            </div>
                          </div>

                          {/* สิทธิ์ย่อย */}
                          <div className="flex items-center gap-5 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Label htmlFor={`rooms-${m.id}`} className="text-xs cursor-pointer font-medium">
                                จัดการห้อง
                              </Label>
                              <Switch
                                id={`rooms-${m.id}`}
                                disabled={isSelf || !m.isActive}
                                checked={isSelf ? true : m.canManageRooms}
                                onCheckedChange={(val: boolean) =>
                                  handleTogglePermission(m.id, "canManageRooms", val)
                                }
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Label htmlFor={`bookings-${m.id}`} className="text-xs cursor-pointer font-medium">
                                จัดการการจอง
                              </Label>
                              <Switch
                                id={`bookings-${m.id}`}
                                disabled={isSelf || !m.isActive}
                                checked={isSelf ? true : m.canManageBookings}
                                onCheckedChange={(val: boolean) =>
                                  handleTogglePermission(m.id, "canManageBookings", val)
                                }
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Label htmlFor={`finance-${m.id}`} className="text-xs cursor-pointer font-medium">
                                ดูการเงิน
                              </Label>
                              <Switch
                                id={`finance-${m.id}`}
                                disabled={isSelf || !m.isActive}
                                checked={isSelf ? true : m.canViewFinance}
                                onCheckedChange={(val: boolean) =>
                                  handleTogglePermission(m.id, "canViewFinance", val)
                                }
                              />
                            </div>
                          </div>

                          {!isSelf && (
                            <Button
                              onClick={() => handleDeleteMember(m.id, m.email)}
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 hover:border-red-500 hover:text-red-600 rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* แท็บข้อมูลทั่วไป */}
        <TabsContent value="hotel" className="mt-4">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-base font-semibold">ข้อมูลพื้นฐานโรงแรม</CardTitle>
              <CardDescription>รายละเอียดสิทธิ์การใช้งานและแพ็คเกจ SaaS ที่คุณสมัครอยู่</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <Label className="text-xs text-muted-foreground">ชื่อระบบ</Label>
                  <p className="font-semibold text-sm mt-1">{hotelInfo?.name || "โรงแรมของฉัน"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">คำอธิบาย</Label>
                  <p className="text-sm mt-1">{hotelInfo?.description || "ระบบจัดการส่วนตัว"}</p>
                </div>
                <div className="border-t pt-3 mt-2">
                  <Label className="text-xs text-muted-foreground">สถานะใบอนุญาต</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                      เปิดใช้งานปกติ (Active)
                    </Badge>
                  </div>
                </div>
                <div className="border-t pt-3 mt-2">
                  <Label className="text-xs text-muted-foreground">ค่าลิขสิทธิ์ระบบรายเดือน</Label>
                  <p className="font-bold text-sm mt-1 text-primary">฿1,500 / เดือน</p>
                </div>
              </div>

              {!isOwner && (
                <div className="bg-muted/40 p-4 border rounded-2xl flex items-center gap-3 text-sm max-w-md mt-4">
                  <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                  <p className="text-muted-foreground leading-relaxed text-xs">
                    ท่านกำลังล็อกอินด้วยสิทธิ์พนักงาน (Staff) สิทธิ์การเชิญพนักงานและการมอบบทบาทหน้าที่ถูกสงวนไว้สำหรับเจ้าของโรงแรมหลัก (Owner) เท่านั้น
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
