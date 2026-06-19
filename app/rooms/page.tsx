"use client";

import { useEffect, useState, useCallback } from "react";
import { getRooms, getRoomTypes, createRoom, createRoomType, updateRoom, deleteRoom, Room, RoomType, CreateRoomInput, RoomStatus, updateRoomStatus } from "@/services/roomService";
import { checkInBooking, checkOutBooking, createBooking } from "@/services/bookingService";
import { createMaintenance } from "@/services/maintenanceService";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  BedDouble,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  Wrench,
  AlertCircle,
  Filter,
  DoorOpen,
  LogOut,
} from "lucide-react";
import { User, CreditCard } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusConfig: Record<
  RoomStatus,
  { label: string; color: string; icon: React.ElementType; dot: string }
> = {
  AVAILABLE: {
    label: "ว่าง",
    color: "bg-green-500/10 text-green-700 border-green-200",
    icon: CheckCircle2,
    dot: "bg-green-500",
  },
  OCCUPIED: {
    label: "มีผู้เข้าพัก",
    color: "bg-blue-500/10 text-blue-700 border-blue-200",
    icon: BedDouble,
    dot: "bg-blue-500",
  },
  RESERVED: {
    label: "จองแล้ว",
    color: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
    icon: Clock,
    dot: "bg-yellow-500",
  },
  MAINTENANCE: {
    label: "ซ่อมบำรุง",
    color: "bg-red-500/10 text-red-700 border-red-200",
    icon: Wrench,
    dot: "bg-red-500",
  },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);

// ─── Room Form Dialog ────────────────────────
function RoomFormDialog({
  open,
  onClose,
  onSave,
  roomTypes,
  editRoom,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  roomTypes: RoomType[];
  editRoom?: Room | null;
}) {
  const [form, setForm] = useState<CreateRoomInput>({
    roomNumber: "",
    floor: undefined,
    roomTypeId: "",
    pricePerNight: 0,
    description: "",
    amenities: [],
    maxGuests: 2,
    notes: "",
  });
  const [amenitiesInput, setAmenitiesInput] = useState("");
  const [createCount, setCreateCount] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editRoom) {
      setForm({
        roomNumber: editRoom.roomNumber,
        floor: editRoom.floor,
        roomTypeId: editRoom.roomTypeId,
        pricePerNight: editRoom.pricePerNight,
        description: editRoom.description || "",
        amenities: editRoom.amenities,
        maxGuests: editRoom.maxGuests,
        notes: (editRoom as any).notes || "",
      });
      setAmenitiesInput(editRoom.amenities.join(", "));
      setCreateCount(1);
    } else {
      setForm({
        roomNumber: "",
        floor: undefined,
        roomTypeId: "",
        pricePerNight: 0,
        description: "",
        amenities: [],
        maxGuests: 2,
        notes: "",
      });
      setAmenitiesInput("");
      setCreateCount(1);
    }
  }, [editRoom, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const amenities = amenitiesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (editRoom) {
        const payload = { ...form, amenities };
        await updateRoom(editRoom.id, payload);
        toast.success("แก้ไขห้องสำเร็จ");
      } else {
        const count = Math.max(1, createCount);
        const match = form.roomNumber.match(/^(.*?)(\d+)$/);
        
        let prefix = form.roomNumber;
        let startNum = 0;
        let hasNumber = false;
        let padding = 0;

        if (match) {
           prefix = match[1];
           startNum = parseInt(match[2], 10);
           padding = match[2].length;
           hasNumber = true;
        }

        const promises = [];
        for (let i = 0; i < count; i++) {
           let currentRoomNumber = form.roomNumber;
           if (hasNumber && count > 1) {
             currentRoomNumber = prefix + String(startNum + i).padStart(padding, '0');
           } else if (!hasNumber && count > 1) {
             currentRoomNumber = form.roomNumber + (i === 0 ? "" : `-${i}`);
           }
           const payload = { ...form, roomNumber: currentRoomNumber, amenities };
           promises.push(createRoom(payload));
        }
        
        await Promise.all(promises);
        toast.success(count > 1 ? `เพิ่มห้องพัก ${count} ห้อง สำเร็จ` : "เพิ่มห้องสำเร็จ");
      }
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editRoom ? "แก้ไขห้องพัก" : "เพิ่มห้องพักใหม่"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="roomNumber">เลขห้องเริ่มต้น *</Label>
              <Input
                id="roomNumber"
                placeholder="เช่น 101"
                value={form.roomNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, roomNumber: e.target.value }))
                }
                required
              />
            </div>
            {!editRoom && (
              <div className="space-y-1.5">
                <Label htmlFor="createCount">จำนวนห้องที่จะเพิ่ม</Label>
                <Input
                  id="createCount"
                  type="number"
                  min={1}
                  max={50}
                  value={createCount}
                  onChange={(e) => setCreateCount(Number(e.target.value))}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="floor">ชั้น</Label>
              <Input
                id="floor"
                type="number"
                placeholder="เช่น 1"
                value={form.floor ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    floor: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="roomTypeId">ประเภทห้อง *</Label>
            <Select
              value={form.roomTypeId}
              onValueChange={(v) => setForm((f) => ({ ...f, roomTypeId: v }))}
              required
            >
              <SelectTrigger id="roomTypeId">
                <SelectValue placeholder="เลือกประเภทห้อง" />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name} ({formatCurrency(rt.basePrice)}/คืน)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pricePerNight">ราคา/คืน (บาท) *</Label>
              <Input
                id="pricePerNight"
                type="number"
                min={0}
                step="any"
                placeholder="1200"
                value={form.pricePerNight || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pricePerNight: Number(e.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxGuests">จำนวนผู้พักสูงสุด</Label>
              <Input
                id="maxGuests"
                type="number"
                min={1}
                value={form.maxGuests}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxGuests: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amenities">สิ่งอำนวยความสะดวก (คั่นด้วย ,)</Label>
            <Input
              id="amenities"
              placeholder="เช่น WiFi, TV, ตู้เย็น, เครื่องปรับอากาศ"
              value={amenitiesInput}
              onChange={(e) => setAmenitiesInput(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">รายละเอียด</Label>
            <Input
              id="description"
              placeholder="รายละเอียดเพิ่มเติม..."
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">หมายเหตุ (ข้อมูลห้องพัก/ประวัติลูกค้า)</Label>
            <Input
              id="notes"
              placeholder="เช่น มีประวัติฝ้าชำรุด หรือระบุข้อมูลเฉพาะของห้องนี้..."
              value={form.notes || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : editRoom ? "บันทึกการแก้ไข" : "เพิ่มห้อง"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Room Type Form Dialog ───────────────────
function RoomTypeDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({ name: "", description: "", basePrice: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createRoomType({
        name: form.name,
        description: form.description || undefined,
        basePrice: Number(form.basePrice),
      });
      toast.success("เพิ่มประเภทห้องสำเร็จ");
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
          <DialogTitle>เพิ่มประเภทห้องใหม่</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="rt-name">ชื่อประเภท *</Label>
            <Input
              id="rt-name"
              placeholder="เช่น Standard, Deluxe, Suite"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rt-price">ราคาพื้นฐาน (บาท/คืน) *</Label>
            <Input
              id="rt-price"
              type="number"
              min={0}
              step="any"
              placeholder="1000"
              value={form.basePrice}
              onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rt-desc">รายละเอียด</Label>
            <Input
              id="rt-desc"
              placeholder="คำอธิบายประเภทห้อง..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : "เพิ่มประเภทห้อง"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quick Check-In Dialog ──────────────────
function QuickCheckInDialog({ open, onClose, onSave, room }: { open: boolean; onClose: () => void; onSave: () => void; room: Room; }) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "", idNumber: "",
    checkInDate: new Date().toISOString().split("T")[0],
    checkOutDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    discountAmount: "0", notes: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const booking = await createBooking({
        roomId: room.id,
        guest: {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email || undefined,
          idNumber: form.idNumber || undefined
        },
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        pricePerNight: room.pricePerNight,
        discountAmount: Number(form.discountAmount) || 0,
        notes: form.notes || undefined,
      });

      await checkInBooking(booking.id);
      toast.success("เช็คอินสำเร็จแล้ว");
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เช็คอินด่วน (ห้อง {room.roomNumber})</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>ชื่อ *</Label>
              <Input placeholder="ชื่อผู้เข้าพัก" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>นามสกุล *</Label>
              <Input placeholder="นามสกุล" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>เบอร์โทร *</Label>
              <Input placeholder="08xxxxxxx" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>อีเมล</Label>
              <Input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>เลขบัตรประชาชน / พาสปอร์ต</Label>
            <Input placeholder="เลขประจำตัว" value={form.idNumber} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>วันเช็คอิน *</Label>
              <DatePicker value={form.checkInDate} onChange={v => setForm(f => ({ ...f, checkInDate: v }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>วันเช็คเอาท์ *</Label>
              <DatePicker value={form.checkOutDate} min={form.checkInDate} onChange={v => setForm(f => ({ ...f, checkOutDate: v }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>ส่วนลด (บาท)</Label>
              <Input type="number" min={0} step="any" value={form.discountAmount} onChange={e => setForm(f => ({ ...f, discountAmount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>หมายเหตุ</Label>
              <Input placeholder="หมายเหตุเพิ่มเติม" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" disabled={loading}>{loading ? "กำลังเช็คอิน..." : "บันทึกและเช็คอิน"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Maintenance Report Dialog ──────────────
function MaintenanceReportDialog({ open, onClose, onSave, room }: { open: boolean; onClose: () => void; onSave: () => void; room: Room; }) {
  const [form, setForm] = useState({ title: "", description: "", type: "CLEANING" as "CLEANING" | "REPAIR" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createMaintenance({
        roomId: room.id,
        title: form.title,
        description: form.description,
        type: form.type,
      });
      toast.success("สร้างรายการแจ้งซ่อม/ทำความสะอาดสำเร็จ");
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
          <DialogTitle>แจ้งซ่อม / ทำความสะอาดห้องพัก (ห้อง {room.roomNumber})</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>ประเภท *</Label>
            <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CLEANING">ทำความสะอาด (Cleaning)</SelectItem>
                <SelectItem value="REPAIR">แจ้งซ่อมแซม (Repair)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>หัวข้อแจ้งซ่อม / ทำความสะอาด *</Label>
            <Input placeholder="เช่น ล้างแอร์, ไฟเสีย, ทำความสะอาด" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>รายละเอียดเพิ่มเติม</Label>
            <Input placeholder="ระบุอาการปัญหาหรือรายละเอียดงาน..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" disabled={loading}>{loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Rooms Page ─────────────────────────
export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [canManageRooms, setCanManageRooms] = useState(true);

  // Quick Action States
  const [maintenanceRoom, setMaintenanceRoom] = useState<Room | null>(null);
  const [checkInRoom, setCheckInRoom] = useState<Room | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleToggleStatus = async (room: Room) => {
    setActionLoading(room.id);
    try {
      const newStatus = room.status === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";
      await updateRoomStatus(room.id, newStatus);
      toast.success(`เปลี่ยนสถานะห้อง ${room.roomNumber} เป็น ${newStatus === "AVAILABLE" ? "ว่าง" : "ซ่อมบำรุง"} สำเร็จ`);
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(null);
    }
  };

  const handleQuickCheckOut = async (room: Room) => {
    const activeBooking = room.bookings?.[0];
    if (!activeBooking) {
      toast.error("ไม่พบข้อมูลการเข้าพักที่ใช้งานอยู่");
      return;
    }
    setActionLoading(room.id);
    try {
      await checkOutBooking(activeBooking.id);
      toast.success(`Check-out ห้อง ${room.roomNumber} สำเร็จ`);
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(null);
    }
  };

  const handleQuickCheckInReserved = async (room: Room) => {
    const activeBooking = room.bookings?.[0];
    if (!activeBooking) {
      toast.error("ไม่พบข้อมูลการจอง");
      return;
    }
    setActionLoading(room.id);
    try {
      await checkInBooking(activeBooking.id);
      toast.success(`Check-in ห้อง ${room.roomNumber} สำเร็จ`);
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(null);
    }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, rt] = await Promise.all([api.get("/api/rooms"), getRoomTypes()]);
      setRooms(rRes.data.data);
      setRoomTypes(rt);

      if (rRes.data.permissions) {
        setCanManageRooms(rRes.data.permissions.canManageRooms);
      }
    } catch (err) {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteRoom(deleteConfirm.id);
      toast.success(`ลบห้อง ${deleteConfirm.roomNumber} สำเร็จ`);
      setDeleteConfirm(null);
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  };

  const filteredRooms = rooms.filter((room) => {
    const matchSearch =
      !searchQuery ||
      room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.roomType.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      filterStatus === "ALL" || room.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    ALL: rooms.length,
    AVAILABLE: rooms.filter((r) => r.status === "AVAILABLE").length,
    OCCUPIED: rooms.filter((r) => r.status === "OCCUPIED").length,
    RESERVED: rooms.filter((r) => r.status === "RESERVED").length,
    MAINTENANCE: rooms.filter((r) => r.status === "MAINTENANCE").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">จัดการห้องพัก</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {rooms.length} ห้องทั้งหมด
          </p>
        </div>
        {canManageRooms && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTypeForm(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              ประเภทห้อง
            </Button>
            <Button size="sm" onClick={() => { setEditRoom(null); setShowRoomForm(true); }}>
              <Plus className="h-4 w-4 mr-1.5" />
              เพิ่มห้องพัก
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาเลขห้อง หรือประเภทห้อง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["ALL", "AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"] as const).map(
            (status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="h-8"
              >
                {status === "ALL" ? "ทั้งหมด" : statusConfig[status as RoomStatus].label}
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                    filterStatus === status
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {counts[status]}
                </span>
              </Button>
            )
          )}
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-20 mb-3" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">ไม่พบห้องพัก</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRooms.map((room) => {
            const sc = statusConfig[room.status];
            const StatusIcon = sc.icon;
            const activeBooking = room.bookings?.[0];
            return (
              <Card
                key={room.id}
                className="group relative overflow-hidden transition-shadow hover:shadow-md"
              >
                {/* Status strip */}
                <div
                  className={cn(
                    "absolute top-0 left-0 right-0 h-1",
                    sc.dot
                  )}
                />
                <CardContent className="p-5 pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">
                          ห้อง {room.roomNumber}
                        </span>
                        {room.floor && (
                          <span className="text-xs text-muted-foreground">
                            ชั้น {room.floor}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {room.roomType.name}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs shrink-0", sc.color)}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {sc.label}
                    </Badge>
                  </div>

                  <Separator className="my-3" />

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ราคา/คืน</span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(room.pricePerNight)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">รับได้สูงสุด</span>
                      <span>{room.maxGuests} คน</span>
                    </div>
                  </div>

                  {/* Current guest */}
                  {activeBooking && room.status === "OCCUPIED" && (
                    <>
                      <Separator className="my-3" />
                      <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/20 px-3 py-2">
                        <p className="text-xs text-muted-foreground mb-0.5">ผู้เข้าพัก</p>
                        <p className="text-sm font-medium">
                          {activeBooking.guest?.firstName}{" "}
                          {activeBooking.guest?.lastName}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Amenities */}
                  {room.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {room.amenities.slice(0, 3).map((a) => (
                        <span
                          key={a}
                          className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {a}
                        </span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          +{room.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Room Notes / Remark */}
                  {room.notes && (
                    <div className="mt-3 rounded-xl bg-amber-500/5 border border-amber-500/10 px-3 py-2">
                      <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">
                        หมายเหตุ
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {room.notes}
                      </p>
                    </div>
                  )}

                  {/* Quick Actions (การดำเนินงานด่วน) */}
                  <Separator className="my-3" />
                  <div className="space-y-2 mt-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      การจัดการด่วน
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Check-in / Check-out Button */}
                      {room.status === "AVAILABLE" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50"
                          onClick={() => setCheckInRoom(room)}
                          disabled={!!actionLoading}
                        >
                          <DoorOpen className="h-3.5 w-3.5 mr-1" />
                          เช็คอินด่วน
                        </Button>
                      )}
                      {room.status === "RESERVED" && activeBooking && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => handleQuickCheckInReserved(room)}
                          disabled={!!actionLoading}
                        >
                          <DoorOpen className="h-3.5 w-3.5 mr-1" />
                          เช็คอิน
                        </Button>
                      )}
                      {room.status === "OCCUPIED" && activeBooking && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                          onClick={() => handleQuickCheckOut(room)}
                          disabled={!!actionLoading}
                        >
                          <LogOut className="h-3.5 w-3.5 mr-1" />
                          เช็คเอาท์
                        </Button>
                      )}
                      {room.status === "MAINTENANCE" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-amber-200 text-amber-700 bg-amber-50 cursor-default"
                          disabled
                        >
                          ซ่อมบำรุงอยู่
                        </Button>
                      )}

                      {/* Toggle Status Button (Available vs Maintenance) */}
                      {(room.status === "AVAILABLE" || room.status === "MAINTENANCE") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 text-xs",
                            room.status === "AVAILABLE" 
                              ? "border-red-200 text-red-700 hover:bg-red-50" 
                              : "border-green-200 text-green-700 hover:bg-green-50"
                          )}
                          onClick={() => handleToggleStatus(room)}
                          disabled={!!actionLoading}
                        >
                          <Wrench className="h-3.5 w-3.5 mr-1" />
                          {room.status === "AVAILABLE" ? "ส่งซ่อม" : "เปิดใช้งานห้อง"}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          disabled
                        >
                          <Wrench className="h-3.5 w-3.5 mr-1" />
                          ส่งซ่อม
                        </Button>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs border-slate-200 hover:bg-slate-50"
                      onClick={() => setMaintenanceRoom(room)}
                      disabled={!!actionLoading}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      แจ้งซ่อม / รายงานทำความสะอาด
                    </Button>
                  </div>

                  {/* Actions */}
                  {canManageRooms && (
                    <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => {
                          setEditRoom(room);
                          setShowRoomForm(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        แก้ไข
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(room)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Room Form Dialog */}
      <RoomFormDialog
        open={showRoomForm}
        onClose={() => setShowRoomForm(false)}
        onSave={fetchAll}
        roomTypes={roomTypes}
        editRoom={editRoom}
      />

      {/* Room Type Dialog */}
      <RoomTypeDialog
        open={showTypeForm}
        onClose={() => setShowTypeForm(false)}
        onSave={fetchAll}
      />

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบห้องพัก</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            คุณต้องการลบ{" "}
            <span className="font-semibold text-foreground">
              ห้อง {deleteConfirm?.roomNumber}
            </span>{" "}
            ใช่หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "กำลังลบ..." : "ลบห้อง"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Check-In Dialog */}
      {checkInRoom && (
        <QuickCheckInDialog
          open={!!checkInRoom}
          onClose={() => setCheckInRoom(null)}
          onSave={fetchAll}
          room={checkInRoom}
        />
      )}

      {/* Maintenance Report Dialog */}
      {maintenanceRoom && (
        <MaintenanceReportDialog
          open={!!maintenanceRoom}
          onClose={() => setMaintenanceRoom(null)}
          onSave={fetchAll}
          room={maintenanceRoom}
        />
      )}
    </div>
  );
}
