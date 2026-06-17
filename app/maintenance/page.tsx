"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getMaintenances,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  RoomMaintenance,
  MaintenanceType,
  MaintenanceStatus,
} from "@/services/maintenanceService";
import { getRooms, Room } from "@/services/roomService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wrench,
  Droplets,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Trash2,
  DollarSign,
  Building,
  User,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const typeConfig: Record<MaintenanceType, { label: string; color: string; icon: React.ElementType }> = {
  CLEANING: {
    label: "ทำความสะอาด",
    color: "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50",
    icon: Droplets,
  },
  REPAIR: {
    label: "แจ้งซ่อมแซม",
    color: "bg-red-500/10 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50",
    icon: Wrench,
  },
};

const statusConfig: Record<
  MaintenanceStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "รอดำเนินการ",
    color: "bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900/50",
    icon: AlertCircle,
  },
  IN_PROGRESS: {
    label: "กำลังดำเนินงาน",
    color: "bg-orange-500/10 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50",
    icon: Clock,
  },
  RESOLVED: {
    label: "เสร็จสิ้น",
    color: "bg-green-500/10 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50",
    icon: CheckCircle2,
  },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

// ─── Create Maintenance Dialog ──────────────
function CreateMaintenanceDialog({
  open,
  onClose,
  onSave,
  rooms,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  rooms: Room[];
}) {
  const [form, setForm] = useState({
    roomId: "",
    title: "",
    description: "",
    type: "CLEANING" as MaintenanceType,
    reportedBy: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm({
        roomId: "",
        title: "",
        description: "",
        type: "CLEANING",
        reportedBy: "",
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roomId || !form.title) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }
    setLoading(true);
    try {
      await createMaintenance({
        roomId: form.roomId,
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        reportedBy: form.reportedBy || undefined,
      });
      toast.success("บันทึกแจ้งซ่อม/ทำความสะอาดสำเร็จ");
      onSave();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>สร้างรายการแจ้งซ่อม / ทำความสะอาด</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="mt-room">ห้องพัก *</Label>
            <Select value={form.roomId} onValueChange={(v) => setForm((f) => ({ ...f, roomId: v }))} required>
              <SelectTrigger id="mt-room">
                <SelectValue placeholder="เลือกห้องพัก" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    ห้อง {room.roomNumber} ({room.roomType.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mt-type">ประเภทงาน *</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v as MaintenanceType }))}
              required
            >
              <SelectTrigger id="mt-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLEANING">ทำความสะอาด (Cleaning)</SelectItem>
                <SelectItem value="REPAIR">แจ้งซ่อมแซม (Repair)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mt-title">หัวข้อแจ้งงาน *</Label>
            <Input
              id="mt-title"
              placeholder="เช่น ล้างแอร์ห้องพัก, ท่อน้ำตัน, เปลี่ยนหลอดไฟ"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mt-desc">รายละเอียดเพิ่มเติม</Label>
            <Input
              id="mt-desc"
              placeholder="ระบุจุดที่ชำรุด หรือข้อมูลการล้างแอร์เพิ่มเติม..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mt-rep">ผู้รายงาน / ผู้แจ้งงาน</Label>
            <Input
              id="mt-rep"
              placeholder="ระบุชื่อพนักงานที่รายงาน (เว้นว่างไว้จะใช้อีเมลของคุณ)"
              value={form.reportedBy}
              onChange={(e) => setForm((f) => ({ ...f, reportedBy: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading || !form.roomId || !form.title}>
              {loading ? "กำลังบันทึก..." : "บันทึกแจ้งงาน"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Resolve Task Dialog ────────────────────
function ResolveTaskDialog({
  open,
  onClose,
  onSave,
  task,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  task: RoomMaintenance;
}) {
  const [cost, setCost] = useState("0");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setCost("0");
      setDescription("");
    } else {
      setDescription(task.description || "");
    }
  }, [open, task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateMaintenance(task.id, {
        status: "RESOLVED",
        cost: Number(cost) || 0,
        description: description || undefined,
      });
      toast.success(
        task.type === "REPAIR"
          ? `เสร็จสิ้นการแจ้งซ่อมห้อง ${task.room.roomNumber} และบันทึกค่าใช้จ่ายแล้ว`
          : `เสร็จสิ้นการทำความสะอาดห้อง ${task.room.roomNumber} เรียบร้อยแล้ว`
      );
      onSave();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ยืนยันงานเสร็จสิ้น (ห้อง {task.room.roomNumber})</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 border">
            <p className="font-semibold text-foreground">หัวข้อ: {task.title}</p>
            {task.description && <p className="text-muted-foreground">รายละเอียดเดิม: {task.description}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="res-cost">ค่าใช้จ่ายเพิ่มเติม (บาท) *</Label>
            <Input
              id="res-cost"
              type="number"
              min={0}
              placeholder="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              required
            />
            <p className="text-[10px] text-muted-foreground">
              หากค่าใช้จ่ายมากกว่า 0 บาท ระบบจะสร้างบันทึกรายจ่าย (Expense) ของโรงแรมให้อัตโนมัติ
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="res-desc">หมายเหตุงานเสร็จ / สรุปผล</Label>
            <Input
              id="res-desc"
              placeholder="เช่น ซ่อมฝ้าเรียบร้อยแล้ว, เปลี่ยนหลอดไฟ LED แล้ว"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
              {loading ? "กำลังดำเนินการ..." : "ยืนยันเสร็จงาน"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Maintenance Page ──────────────────
export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<RoomMaintenance[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<RoomMaintenance | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [list, r] = await Promise.all([getMaintenances(), getRooms()]);
      setMaintenances(list);
      setRooms(r);
    } catch {
      toast.error("ไม่สามารถดึงข้อมูลประวัติการแจ้งซ่อมได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleUpdateStatus = async (id: string, newStatus: MaintenanceStatus) => {
    setActionLoading(id);
    try {
      await updateMaintenance(id, { status: newStatus });
      toast.success("อัปเดตสถานะงานเรียบร้อยแล้ว");
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "อัปเดตสถานะล้มเหลว");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบรายการแจ้งซ่อมนี้ออกจากประวัติโรงแรมหรือไม่?")) return;
    setActionLoading(id);
    try {
      await deleteMaintenance(id);
      toast.success("ลบประวัติแจ้งซ่อมสำเร็จ");
      fetchAll();
    } catch {
      toast.error("ลบประวัติล้มเหลว");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = maintenances.filter((m) => {
    const matchType = filterType === "ALL" || m.type === filterType;
    const matchStatus = filterStatus === "ALL" || m.status === filterStatus;
    const matchSearch =
      !search ||
      m.room.roomNumber.includes(search) ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.description || "").toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">แจ้งซ่อมและรายงานทำความสะอาด</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {maintenances.length} รายการแจ้งงานทั้งหมดในระบบโรงแรม
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="rounded-xl shadow-lg shadow-primary/10">
          <Plus className="h-4 w-4 mr-1.5" />
          แจ้งซ่อม / รายงานความสะอาด
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาเลขห้อง หรือปัญหา..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl h-10"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Tabs value={filterType} onValueChange={setFilterType} className="h-10">
              <TabsList className="bg-muted/60 p-1 rounded-xl h-10">
                <TabsTrigger value="ALL" className="rounded-lg text-xs h-8">
                  ทั้งหมด ({maintenances.length})
                </TabsTrigger>
                <TabsTrigger value="CLEANING" className="rounded-lg text-xs h-8">
                  ทำความสะอาด ({maintenances.filter((m) => m.type === "CLEANING").length})
                </TabsTrigger>
                <TabsTrigger value="REPAIR" className="rounded-lg text-xs h-8">
                  งานแจ้งซ่อม ({maintenances.filter((m) => m.type === "REPAIR").length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["ALL", "PENDING", "IN_PROGRESS", "RESOLVED"] as const).map((status) => {
            const label = status === "ALL" ? "ทุกสถานะ" : statusConfig[status].label;
            const count =
              status === "ALL"
                ? filtered.length
                : maintenances.filter((m) => m.status === status).length;
            return (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="h-8 rounded-lg text-xs"
              >
                {label}
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
                    filterStatus === status
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/40">
              <CardContent className="p-5">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="py-16 text-center">
            <History className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">ไม่พบรายการประวัติงานแจ้งซ่อมหรือล้างแอร์ในขณะนี้</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const tc = typeConfig[item.type];
            const sc = statusConfig[item.status];
            const TypeIcon = tc.icon;
            const StatusIcon = sc.icon;
            const isLoading = actionLoading === item.id;

            return (
              <Card key={item.id} className="overflow-hidden border-border/40 hover:shadow-sm transition-shadow">
                <CardContent className="p-0 flex flex-col sm:flex-row">
                  <div
                    className={cn(
                      "w-full sm:w-1 min-h-2 sm:min-h-0",
                      item.status === "RESOLVED"
                        ? "bg-green-500"
                        : item.status === "IN_PROGRESS"
                        ? "bg-orange-500"
                        : "bg-yellow-500"
                    )}
                  />
                  <div className="flex-1 p-5 flex flex-col sm:flex-row gap-4 items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">ห้อง {item.room.roomNumber}</span>
                        <Badge variant="outline" className={cn("text-xs", tc.color)}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {tc.label}
                        </Badge>
                        <Badge variant="outline" className={cn("text-xs", sc.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {sc.label}
                        </Badge>
                      </div>

                      <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> แจ้งโดย: {item.reportedBy || "ระบบ"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" /> ชั้น: {item.room.floor ?? "-"} · {item.room.roomType.name}
                        </span>
                        {item.resolvedAt && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" /> เสร็จสิ้น:{" "}
                            {new Date(item.resolvedAt).toLocaleDateString("th-TH")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right w-full sm:w-auto shrink-0 space-y-3">
                      <div>
                        {item.cost > 0 ? (
                          <div className="flex sm:justify-end items-center text-primary font-bold text-lg">
                            <DollarSign className="h-4 w-4 mr-0.5" />
                            {formatCurrency(item.cost)}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">ไม่มีค่าใช้จ่าย</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          บันทึกเมื่อ: {new Date(item.createdAt).toLocaleDateString("th-TH")}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 sm:justify-end">
                        {item.status === "PENDING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 rounded-lg"
                            onClick={() => handleUpdateStatus(item.id, "IN_PROGRESS")}
                            disabled={isLoading}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            เริ่มดำเนินการ
                          </Button>
                        )}

                        {item.status === "IN_PROGRESS" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50 rounded-lg"
                            onClick={() => setResolveTarget(item)}
                            disabled={isLoading}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            ยืนยันเสร็จงาน
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-destructive border-destructive/10 hover:bg-red-50 rounded-lg"
                          onClick={() => handleDelete(item.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Maintenance Dialog */}
      <CreateMaintenanceDialog open={showCreate} onClose={() => setShowCreate(false)} onSave={fetchAll} rooms={rooms} />

      {/* Resolve Maintenance Dialog */}
      {resolveTarget && (
        <ResolveTaskDialog
          open={!!resolveTarget}
          onClose={() => setResolveTarget(null)}
          onSave={fetchAll}
          task={resolveTarget}
        />
      )}
    </div>
  );
}
