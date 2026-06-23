"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import { Plus, Search, FileText, User, Home, AlertCircle, XCircle, Edit } from "lucide-react";
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

import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { updateContract } from "@/services/dormService";

function ContractDialog({ open, onClose, onSave, rooms, editData, contracts }: { open: boolean; onClose: () => void; onSave: () => void; rooms: Room[]; editData?: Contract | null; contracts: Contract[] }) {
  const [form, setForm] = useState({
    roomId: "", startDate: "", endDate: "", paymentDueDay: "5",
    firstName: "", lastName: "", phone: "", idNumber: "", address: "",
    depositAmount: "", rentAmount: "", notes: "",
  });
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [saveHistory, setSaveHistory] = useState(false);

  useEffect(() => {
    if (open && editData) {
      setForm({
        roomId: editData.roomId,
        startDate: format(new Date(editData.startDate), "yyyy-MM-dd"),
        endDate: format(new Date(editData.endDate), "yyyy-MM-dd"),
        paymentDueDay: String(editData.paymentDueDay),
        firstName: editData.tenant.firstName,
        lastName: editData.tenant.lastName,
        phone: editData.tenant.phone,
        idNumber: editData.tenant.idNumber || "",
        address: editData.tenant.address || "",
        depositAmount: String(editData.depositAmount),
        rentAmount: String(editData.rentAmount),
        notes: editData.notes || "",
      });
      setSaveHistory(true); // Default to save history when editing
    } else if (!open) {
      setForm({ roomId: "", startDate: "", endDate: "", paymentDueDay: "5", firstName: "", lastName: "", phone: "", idNumber: "", address: "", depositAmount: "", rentAmount: "", notes: "" });
      setSaveHistory(false);
    }
  }, [open, editData]);

  // If editing, the room is already assigned, so we just use all rooms (or include the current room)
  const activeContractRoomIds = contracts.filter(c => c.status === "ACTIVE").map(c => c.roomId);
  const availableRooms = editData 
    ? rooms 
    : rooms.filter((r) => (r.status === "AVAILABLE" || r.status === "MAINTENANCE") && !activeContractRoomIds.includes(r.id));
  const selectedRoom = availableRooms.find(r => r.id === form.roomId);

  useEffect(() => {
    if (selectedRoom && !form.rentAmount && !editData) {
      // Auto-fill base price if empty and not editing
      setForm(f => ({ ...f, rentAmount: String(selectedRoom.pricePerNight * 30) }));
    }
  }, [form.roomId, selectedRoom, editData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const payload = {
        roomId: form.roomId,
        tenant: {
          firstName: form.firstName, lastName: form.lastName, phone: form.phone,
          idNumber: form.idNumber || undefined, address: form.address || undefined
        },
        startDate: form.startDate,
        endDate: form.endDate,
        paymentDueDay: Number(form.paymentDueDay) || 5,
        depositAmount: Number(form.depositAmount) || 0,
        rentAmount: Number(form.rentAmount),
        notes: form.notes || undefined,
      };

      if (editData) {
        if (saveHistory) {
          // Create new contract, set old to EXPIRED
          await updateContractStatus(editData.id, "EXPIRED", "Renewed/Updated to new revision");
          await createContract(payload);
        } else {
          // Update in place
          await updateContract(editData.id, payload);
        }
        toast.success("อัปเดตสัญญาเช่าสำเร็จ");
      } else {
        await createContract(payload);
        toast.success("สร้างสัญญาเช่าสำเร็จ");
      }
      onClose();
      onSave();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };


  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editData ? "แก้ไขสัญญาเช่า" : "เพิ่มสัญญาเช่าใหม่"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          
          {editData && (
            <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/20">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-primary">บันทึกเป็นประวัติสัญญาเก่า (เก็บไว้ดูย้อนหลัง)</Label>
                <p className="text-xs text-muted-foreground">หากเปิด สัญญาเดิมจะหมดอายุและสร้างสัญญาใหม่แทน</p>
              </div>
              <Switch checked={saveHistory} onCheckedChange={setSaveHistory} />
            </div>
          )}

          {/* Room & Dates */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Home className="h-4 w-4 text-primary" />ข้อมูลสัญญา</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ห้องพัก *</Label>
                <Select value={form.roomId} onValueChange={(v) => setForm((f) => ({ ...f, roomId: v }))} required disabled={!!editData}>
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
                <Input type="number" min={0} step="any" value={form.rentAmount} onChange={(e) => setForm((f) => ({ ...f, rentAmount: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>วันเริ่มสัญญา *</Label>
                <DatePicker value={form.startDate} onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>วันสิ้นสุดสัญญา *</Label>
                <DatePicker value={form.endDate} min={form.startDate} onChange={(v) => setForm((f) => ({ ...f, endDate: v }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>วันกำหนดชำระรายเดือน *</Label>
                <Input type="number" min={1} max={31} value={form.paymentDueDay} onChange={(e) => setForm((f) => ({ ...f, paymentDueDay: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>ค่ามัดจำ/ประกัน (บาท)</Label>
                <Input type="number" min={0} step="any" value={form.depositAmount} onChange={(e) => setForm((f) => ({ ...f, depositAmount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>หมายเหตุ</Label>
              <Input placeholder="รายละเอียดเพิ่มเติม..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
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
            <Button type="submit" disabled={loading || !form.roomId}>{loading ? "กำลังบันทึก..." : editData ? "บันทึกการแก้ไข" : "เพิ่มสัญญา"}</Button>
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
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAll = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [c, r] = await Promise.all([getContracts(), getRooms()]);
      setContracts(c); setRooms(r);
    } catch { toast.error("ไม่สามารถโหลดข้อมูลได้"); }
    finally { if (showLoading) setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(true); }, [fetchAll]);

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

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
        <h3 className="font-semibold text-primary mb-1 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> แนะนำการใช้งานระบบสัญญาเช่า
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          ระบบ <strong>สัญญาเช่า</strong> ออกแบบมาสำหรับผู้เข้าพักระยะยาว (หอพัก/อพาร์ทเม้นท์)<br />
          เมื่อคุณเพิ่มสัญญาเช่าใหม่ ระบบจะจัดให้ห้องนั้นมีสถานะ <strong>กำลังเช่า (ACTIVE)</strong> ทันที<br />
          และในวันที่กำหนดชำระรายเดือน ระบบจะสามารถนำข้อมูลนี้ไปสร้างบิลเรียกเก็บเงินได้อย่างถูกต้อง<br />
          <span className="text-xs opacity-80 mt-1 block">* ห้องที่อยู่ระหว่างการจองหรือเช่าอยู่แล้ว จะไม่แสดงให้เลือกซ้ำ</span>
        </p>
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
                    <div className="flex flex-wrap sm:flex-nowrap gap-2 pt-2 border-t mt-2">
                      <Button size="sm" variant="outline" className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setEditContract(c)} disabled={isLoading}>
                        <Edit className="h-4 w-4 mr-1.5" />แก้ไข
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleStatusChange(c, "TERMINATED")} disabled={isLoading}>
                        <XCircle className="h-4 w-4 mr-1.5" />ยกเลิก
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

      <ContractDialog open={showCreate || !!editContract} onClose={() => { setShowCreate(false); setEditContract(null); }} onSave={fetchAll} rooms={rooms} editData={editContract} contracts={contracts} />
    </div>
  );
}
