"use client";

import { useEffect, useState, useCallback } from "react";
import { getContracts, createContract, updateContractStatus, Contract, ContractStatus } from "@/services/dormService";
import { getRooms, Room } from "@/services/roomService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FileText, User, Home, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const statusConfig: Record<ContractStatus, { label: string; color: string }> = {
  ACTIVE:     { label: "กำลังเช่า",    color: "bg-green-500/10 text-green-700 border-green-200" },
  EXPIRED:    { label: "หมดสัญญา",   color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  TERMINATED: { label: "ยกเลิกสัญญา", color: "bg-red-500/10 text-red-700 border-red-200" },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

function ContractDialog({ open, onClose, onSave, rooms }: { open: boolean; onClose: () => void; onSave: () => void; rooms: Room[]; }) {
  const [form, setForm] = useState({
    roomId: "", startDate: "", endDate: "",
    firstName: "", lastName: "", phone: "", idNumber: "", address: "",
    depositAmount: "", rentAmount: "", notes: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm({ roomId: "", startDate: "", endDate: "", firstName: "", lastName: "", phone: "", idNumber: "", address: "", depositAmount: "", rentAmount: "", notes: "" });
    }
  }, [open]);

  const availableRooms = rooms.filter((r) => r.status === "AVAILABLE" || r.status === "MAINTENANCE");
  const selectedRoom = availableRooms.find(r => r.id === form.roomId);

  useEffect(() => {
    if (selectedRoom && !form.rentAmount) {
      // Auto-fill base price if empty
      setForm(f => ({ ...f, rentAmount: String(selectedRoom.pricePerNight * 30) })); // assume monthly roughly 30 * daily or basePrice
    }
  }, [form.roomId, selectedRoom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createContract({
        roomId: form.roomId,
        tenant: {
          firstName: form.firstName, lastName: form.lastName, phone: form.phone,
          idNumber: form.idNumber || undefined, address: form.address || undefined
        },
        startDate: form.startDate,
        endDate: form.endDate,
        depositAmount: Number(form.depositAmount) || 0,
        rentAmount: Number(form.rentAmount),
        notes: form.notes || undefined,
      });
      toast.success("สร้างสัญญาเช่าสำเร็จ");
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>เพิ่มสัญญาเช่าใหม่</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Room & Dates */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Home className="h-4 w-4 text-primary" />ข้อมูลสัญญา</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ห้องพัก *</Label>
                <Select value={form.roomId} onValueChange={(v) => setForm((f) => ({ ...f, roomId: v }))} required>
                  <SelectTrigger><SelectValue placeholder="เลือกห้องว่าง" /></SelectTrigger>
                  <SelectContent>
                    {availableRooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>ห้อง {r.roomNumber} ({r.roomType.name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>ค่าเช่ารายเดือน (บาท) *</Label>
                <Input type="number" min={0} value={form.rentAmount} onChange={(e) => setForm((f) => ({ ...f, rentAmount: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>วันเริ่มสัญญา *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>วันสิ้นสุดสัญญา *</Label>
                <Input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ค่ามัดจำ/ประกัน (บาท)</Label>
                <Input type="number" min={0} value={form.depositAmount} onChange={(e) => setForm((f) => ({ ...f, depositAmount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>หมายเหตุ</Label>
                <Input placeholder="รายละเอียดเพิ่มเติม..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          </div>
          <Separator />
          {/* Tenant Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><User className="h-4 w-4 text-primary" />ข้อมูลผู้เช่า</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ชื่อ *</Label>
                <Input placeholder="ชื่อ" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>นามสกุล *</Label>
                <Input placeholder="นามสกุล" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>เบอร์โทร *</Label>
                <Input placeholder="0812345678" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>เลขบัตรประชาชน</Label>
                <Input placeholder="1234567890123" value={form.idNumber} onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ที่อยู่ตามทะเบียนบ้าน</Label>
              <Input placeholder="ที่อยู่..." value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" disabled={loading || !form.roomId}>{loading ? "กำลังบันทึก..." : "เพิ่มสัญญา"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([getContracts(), getRooms()]);
      setContracts(c); setRooms(r);
    } catch { toast.error("ไม่สามารถโหลดข้อมูลได้"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatusChange = async (contract: Contract, status: ContractStatus) => {
    if (!confirm(`ยืนยันการเปลี่ยนสถานะสัญญาห้อง ${contract.room.roomNumber} เป็น ${statusConfig[status].label}?`)) return;
    setActionLoading(contract.id);
    try {
      await updateContractStatus(contract.id, status);
      toast.success("เปลี่ยนสถานะสำเร็จ");
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setActionLoading(null); }
  };

  const filtered = contracts.filter((c) => {
    const matchTab = tab === "ALL" || c.status === tab;
    const matchSearch = !search ||
      `${c.tenant.firstName} ${c.tenant.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      c.room.roomNumber.includes(search) ||
      c.contractNumber.includes(search);
    return matchTab && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">สัญญาเช่า (หอพัก)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contracts.length} สัญญาทั้งหมด</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />ทำสัญญาใหม่
        </Button>
      </div>

      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่อผู้เช่า, เลขห้อง, เลขสัญญา..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {["ALL", "ACTIVE", "EXPIRED", "TERMINATED"].map((s) => (
              <TabsTrigger key={s} value={s}>
                {s === "ALL" ? "ทั้งหมด" : statusConfig[s as ContractStatus].label}
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {s === "ALL" ? contracts.length : contracts.filter((c) => c.status === s).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><AlertCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">ไม่พบข้อมูลสัญญา</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((c) => {
            const sc = statusConfig[c.status];
            const isLoading = actionLoading === c.id;
            return (
              <Card key={c.id} className="overflow-hidden flex flex-col">
                <div className={cn("h-1 w-full", c.status === "ACTIVE" ? "bg-green-500" : c.status === "EXPIRED" ? "bg-yellow-500" : "bg-red-500")} />
                <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold text-lg">ห้อง {c.room.roomNumber}</p>
                          <p className="text-xs text-muted-foreground">เลขที่สัญญา: {c.contractNumber}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={sc.color}>{sc.label}</Badge>
                    </div>
                    
                    <Separator className="my-3" />
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground block text-xs mb-0.5">ผู้เช่า</span>
                        <span className="font-medium">{c.tenant.firstName} {c.tenant.lastName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs mb-0.5">เบอร์โทร</span>
                        <span>{c.tenant.phone}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs mb-0.5">ระยะเวลาสัญญา</span>
                        <span>
                          {format(new Date(c.startDate), "d MMM yy", { locale: th })} - {format(new Date(c.endDate), "d MMM yy", { locale: th })}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs mb-0.5">ค่าเช่า/เดือน</span>
                        <span className="font-semibold text-primary">{formatCurrency(c.rentAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {c.status === "ACTIVE" && (
                    <div className="flex gap-2 pt-2 border-t mt-2">
                      <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleStatusChange(c, "TERMINATED")} disabled={isLoading}>
                        <XCircle className="h-4 w-4 mr-1.5" />ยกเลิกสัญญา
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50" onClick={() => handleStatusChange(c, "EXPIRED")} disabled={isLoading}>
                        หมดสัญญา
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ContractDialog open={showCreate} onClose={() => setShowCreate(false)} onSave={fetchAll} rooms={rooms} />
    </div>
  );
}
