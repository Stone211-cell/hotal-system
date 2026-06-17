"use client";

import { useEffect, useState, useCallback } from "react";
import { getBills, createBill, payBill, deleteBill, Bill, BillStatus, PaymentMethod } from "@/services/dormService";
import { getContracts, Contract } from "@/services/dormService";
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
import { Plus, Search, FileSpreadsheet, CreditCard, Trash2, Droplets, Zap, Receipt, Home, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, endOfMonth } from "date-fns";
import { th } from "date-fns/locale";
import { BillReceiptModal } from "@/components/print-receipt";

const statusConfig: Record<BillStatus, { label: string; color: string }> = {
  UNPAID:  { label: "ยังไม่ชำระ", color: "bg-red-500/10 text-red-700 border-red-200" },
  PAID:    { label: "ชำระแล้ว",   color: "bg-green-500/10 text-green-700 border-green-200" },
  OVERDUE: { label: "ค้างชำระ",   color: "bg-orange-500/10 text-orange-700 border-orange-200" },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

const TH_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

// ─── Create Bill Dialog ────────────────────
function BillDialog({ open, onClose, onSave, contracts }: { open: boolean; onClose: () => void; onSave: () => void; contracts: Contract[]; }) {
  const [form, setForm] = useState({
    contractId: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()),
    waterCurrentUnit: "", waterPreviousUnit: "", waterAmount: "",
    electricCurrentUnit: "", electricPreviousUnit: "", electricAmount: "",
    otherCharges: "0", otherChargesNote: "", dueDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm({
        contractId: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()),
        waterCurrentUnit: "", waterPreviousUnit: "", waterAmount: "",
        electricCurrentUnit: "", electricPreviousUnit: "", electricAmount: "",
        otherCharges: "0", otherChargesNote: "", dueDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
      });
    }
  }, [open]);

  const activeContracts = contracts.filter(c => c.status === "ACTIVE");
  const selectedContract = activeContracts.find(c => c.id === form.contractId);
  const totalAmount = (selectedContract?.rentAmount || 0) + Number(form.waterAmount || 0) + Number(form.electricAmount || 0) + Number(form.otherCharges || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;
    setLoading(true);
    try {
      await createBill({
        contractId: form.contractId,
        month: Number(form.month),
        year: Number(form.year),
        rentAmount: selectedContract.rentAmount,
        waterCurrentUnit: form.waterCurrentUnit ? Number(form.waterCurrentUnit) : undefined,
        waterPreviousUnit: form.waterPreviousUnit ? Number(form.waterPreviousUnit) : undefined,
        waterAmount: Number(form.waterAmount || 0),
        electricCurrentUnit: form.electricCurrentUnit ? Number(form.electricCurrentUnit) : undefined,
        electricPreviousUnit: form.electricPreviousUnit ? Number(form.electricPreviousUnit) : undefined,
        electricAmount: Number(form.electricAmount || 0),
        otherCharges: Number(form.otherCharges || 0),
        otherChargesNote: form.otherChargesNote || undefined,
        dueDate: form.dueDate,
      });
      toast.success("ออกบิลสำเร็จ");
      onSave(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>ออกบิลค่าเช่า</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Target */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>ห้อง/สัญญา *</Label>
              <Select value={form.contractId} onValueChange={(v) => setForm(f => ({ ...f, contractId: v }))} required>
                <SelectTrigger><SelectValue placeholder="เลือกห้องที่ทำสัญญา" /></SelectTrigger>
                <SelectContent>
                  {activeContracts.map(c => (
                    <SelectItem key={c.id} value={c.id}>ห้อง {c.room.roomNumber} - {c.tenant.firstName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex gap-2 col-span-2 sm:col-span-1">
              <div className="flex-1">
                <Label>เดือน *</Label>
                <Select value={form.month} onValueChange={(v) => setForm(f => ({ ...f, month: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TH_MONTHS.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24">
                <Label>ปี *</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm(f => ({ ...f, year: e.target.value }))} required />
              </div>
            </div>
          </div>

          <Separator />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Water */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Droplets className="h-4 w-4 text-blue-500" />ค่าน้ำประปา</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label className="text-xs">มิเตอร์ก่อนหน้า</Label><Input type="number" value={form.waterPreviousUnit} onChange={e => setForm(f => ({ ...f, waterPreviousUnit: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">มิเตอร์ปัจจุบัน</Label><Input type="number" value={form.waterCurrentUnit} onChange={e => setForm(f => ({ ...f, waterCurrentUnit: e.target.value }))} /></div>
              </div>
              <div className="space-y-1">
                <Label>รวมค่าน้ำ (บาท)</Label>
                <Input type="number" min={0} value={form.waterAmount} onChange={e => setForm(f => ({ ...f, waterAmount: e.target.value }))} />
              </div>
            </div>

            {/* Electric */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-orange-500" />ค่าไฟฟ้า</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label className="text-xs">มิเตอร์ก่อนหน้า</Label><Input type="number" value={form.electricPreviousUnit} onChange={e => setForm(f => ({ ...f, electricPreviousUnit: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">มิเตอร์ปัจจุบัน</Label><Input type="number" value={form.electricCurrentUnit} onChange={e => setForm(f => ({ ...f, electricCurrentUnit: e.target.value }))} /></div>
              </div>
              <div className="space-y-1">
                <Label>รวมค่าไฟ (บาท)</Label>
                <Input type="number" min={0} value={form.electricAmount} onChange={e => setForm(f => ({ ...f, electricAmount: e.target.value }))} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Other & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>ค่าใช้จ่ายอื่นๆ (บาท)</Label><Input type="number" min={0} value={form.otherCharges} onChange={e => setForm(f => ({ ...f, otherCharges: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>หมายเหตุค่าอื่นๆ</Label><Input placeholder="เช่น ค่าส่วนกลาง, อินเทอร์เน็ต" value={form.otherChargesNote} onChange={e => setForm(f => ({ ...f, otherChargesNote: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>กำหนดชำระ *</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} required /></div>
            </div>
            
            <div className="rounded-xl bg-muted/40 p-4 border flex flex-col justify-center">
              <h4 className="text-sm font-semibold mb-3">สรุปยอดบิล</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">ค่าห้องพัก</span><span>{selectedContract ? formatCurrency(selectedContract.rentAmount) : "0"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ค่าน้ำประปา</span><span>{formatCurrency(Number(form.waterAmount) || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ค่าไฟฟ้า</span><span>{formatCurrency(Number(form.electricAmount) || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ค่าอื่นๆ</span><span>{formatCurrency(Number(form.otherCharges) || 0)}</span></div>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between font-bold text-lg text-primary"><span>ยอดรวมทั้งสิ้น</span><span>{formatCurrency(totalAmount)}</span></div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" disabled={loading || !form.contractId}>{loading ? "กำลังออกบิล..." : "ยืนยันการออกบิล"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payment Dialog ──────────────────────────
function PayBillDialog({ bill, onClose, onSave }: { bill: Bill; onClose: () => void; onSave: () => void; }) {
  const [method, setMethod] = useState<PaymentMethod>("TRANSFER");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await payBill(bill.id, method, reference || undefined);
      toast.success("รับชำระเงินสำเร็จ");
      onSave(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>รับชำระเงิน (ห้อง {bill.contract.room.roomNumber})</DialogTitle></DialogHeader>
        <div className="py-2 text-center">
          <p className="text-sm text-muted-foreground mb-1">ยอดชำระบิลประจำเดือน {TH_MONTHS[bill.month-1]} {bill.year}</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(bill.totalAmount)}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>ช่องทางชำระ *</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TRANSFER">โอนเงิน</SelectItem>
                <SelectItem value="CASH">เงินสด</SelectItem>
                <SelectItem value="QR_CODE">QR Code</SelectItem>
                <SelectItem value="CREDIT_CARD">บัตรเครดิต</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>หมายเลขอ้างอิง / สลิป</Label>
            <Input placeholder="เลขอ้างอิงการโอน..." value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" disabled={loading}>{loading ? "กำลังบันทึก..." : "ยืนยันรับชำระ"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [payTarget, setPayTarget] = useState<Bill | null>(null);
  const [printBill, setPrintBill] = useState<Bill | null>(null);
  const [hotelName, setHotelName] = useState("หอพักของฉัน");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([getBills(), getContracts()]);
      setBills(b); setContracts(c);
      
      const dashRes = await fetch("/api/dashboard");
      const dashJson = await dashRes.json();
      if (dashJson.success && dashJson.data.hotelName) {
        setHotelName(dashJson.data.hotelName);
      }
    } catch { toast.error("ไม่สามารถโหลดข้อมูลได้"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบบิลนี้ใช่หรือไม่?")) return;
    try {
      await deleteBill(id);
      toast.success("ลบบิลสำเร็จ");
      fetchAll();
    } catch { toast.error("ลบไม่สำเร็จ"); }
  };

  const filtered = bills.filter((b) => {
    const matchTab = tab === "ALL" || b.status === tab;
    const matchSearch = !search ||
      b.contract.room.roomNumber.includes(search) ||
      b.contract.tenant.firstName.includes(search) ||
      b.billNumber.includes(search);
    return matchTab && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">บิลค่าเช่า</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ระบบหอพัก/อพาร์ทเม้นท์</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />ออกบิลใหม่
        </Button>
      </div>

      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="ค้นหาห้อง, ชื่อผู้เช่า..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {["ALL", "UNPAID", "PAID", "OVERDUE"].map((s) => (
              <TabsTrigger key={s} value={s}>
                {s === "ALL" ? "ทั้งหมด" : statusConfig[s as BillStatus].label}
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {s === "ALL" ? bills.length : bills.filter((b) => b.status === s).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">ไม่พบบิลค่าเช่า</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const sc = statusConfig[b.status];
            return (
              <Card key={b.id} className="overflow-hidden">
                <CardContent className="p-0 flex flex-col sm:flex-row">
                  <div className={cn("w-full sm:w-1 min-h-2 sm:min-h-0", b.status === "PAID" ? "bg-green-500" : b.status === "UNPAID" ? "bg-red-500" : "bg-orange-500")} />
                  <div className="flex-1 p-5 flex flex-col sm:flex-row gap-4 items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">ห้อง {b.contract.room.roomNumber}</span>
                        <Badge variant="outline" className={sc.color}>{sc.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        ผู้เช่า: {b.contract.tenant.firstName} {b.contract.tenant.lastName} · ประจำเดือน {TH_MONTHS[b.month-1]} {b.year}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Home className="h-3 w-3" /> {formatCurrency(b.rentAmount)}</span>
                        {b.waterAmount > 0 && <span className="flex items-center gap-1 text-blue-600/70"><Droplets className="h-3 w-3" /> {formatCurrency(b.waterAmount)}</span>}
                        {b.electricAmount > 0 && <span className="flex items-center gap-1 text-orange-600/70"><Zap className="h-3 w-3" /> {formatCurrency(b.electricAmount)}</span>}
                        {b.otherCharges > 0 && <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> {formatCurrency(b.otherCharges)}</span>}
                      </div>
                    </div>

                    <div className="text-left sm:text-right w-full sm:w-auto">
                      <p className="text-2xl font-bold text-primary">{formatCurrency(b.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ครบกำหนด: <span className={new Date(b.dueDate) < new Date() && b.status !== "PAID" ? "text-red-500 font-medium" : ""}>{format(new Date(b.dueDate), "d MMM yy", { locale: th })}</span>
                      </p>
                      
                      <div className="mt-4 flex sm:justify-end gap-2">
                        {b.status !== "PAID" && (
                          <Button size="sm" variant="outline" className="h-8 border-green-200 text-green-700 hover:bg-green-50" onClick={() => setPayTarget(b)}>
                            <CreditCard className="h-3.5 w-3.5 mr-1.5" />รับชำระเงิน
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-8 border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => setPrintBill(b)}>
                          <Printer className="h-3.5 w-3.5 mr-1.5" />พิมพ์ใบแจ้งหนี้
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-2 text-destructive hover:bg-red-50" onClick={() => handleDelete(b.id)}>
                          <Trash2 className="h-4 w-4" />
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

      <BillDialog open={showCreate} onClose={() => setShowCreate(false)} onSave={fetchAll} contracts={contracts} />
      {payTarget && <PayBillDialog bill={payTarget} onClose={() => setPayTarget(null)} onSave={fetchAll} />}
      {printBill && (
        <BillReceiptModal
          open={!!printBill}
          onClose={() => setPrintBill(null)}
          hotelName={hotelName}
          bill={printBill}
        />
      )}
    </div>
  );
}
