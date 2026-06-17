"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getBookings, createBooking, checkInBooking, checkOutBooking,
  cancelBooking, createPayment, Booking, BookingStatus, PaymentMethod,
} from "@/services/bookingService";
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
import { Plus, Search, CalendarCheck, DoorOpen, LogOut, XCircle, CreditCard, AlertCircle, User, BedDouble, Clock, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import { BookingReceiptModal } from "@/components/print-receipt";

const statusConfig: Record<BookingStatus, { label: string; color: string }> = {
  PENDING:    { label: "รอยืนยัน",   color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  CONFIRMED:  { label: "ยืนยันแล้ว", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  CHECKED_IN: { label: "เข้าพักแล้ว",color: "bg-green-500/10 text-green-700 border-green-200" },
  CHECKED_OUT:{ label: "ออกแล้ว",    color: "bg-gray-500/10 text-gray-600 border-gray-200" },
  CANCELLED:  { label: "ยกเลิก",     color: "bg-red-500/10 text-red-700 border-red-200" },
};

const payConfig: Record<string, { label: string; color: string }> = {
  UNPAID:  { label: "ยังไม่ชำระ",     color: "bg-red-500/10 text-red-700 border-red-200" },
  PARTIAL: { label: "ชำระบางส่วน",    color: "bg-orange-500/10 text-orange-700 border-orange-200" },
  PAID:    { label: "ชำระแล้ว",       color: "bg-green-500/10 text-green-700 border-green-200" },
  REFUNDED:{ label: "คืนเงินแล้ว",   color: "bg-gray-500/10 text-gray-600 border-gray-200" },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

// ─── Create Booking Dialog ───────────────────
function CreateBookingDialog({ open, onClose, onSave, rooms }: {
  open: boolean; onClose: () => void; onSave: () => void; rooms: Room[];
}) {
  const [form, setForm] = useState({
    roomId: "", checkInDate: "", checkOutDate: "",
    firstName: "", lastName: "", phone: "", email: "", idNumber: "",
    discountAmount: "0", notes: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setForm({ roomId: "", checkInDate: "", checkOutDate: "", firstName: "", lastName: "", phone: "", email: "", idNumber: "", discountAmount: "0", notes: "" });
  }, [open]);

  const selectedRoom = rooms.find((r) => r.id === form.roomId);
  const nights = form.checkInDate && form.checkOutDate
    ? Math.max(0, differenceInDays(new Date(form.checkOutDate), new Date(form.checkInDate))) : 0;
  const total = selectedRoom ? nights * selectedRoom.pricePerNight : 0;
  const final = total - Number(form.discountAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setLoading(true);
    try {
      await createBooking({
        roomId: form.roomId,
        guest: { firstName: form.firstName, lastName: form.lastName, phone: form.phone, email: form.email || undefined, idNumber: form.idNumber || undefined },
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        pricePerNight: selectedRoom.pricePerNight,
        discountAmount: Number(form.discountAmount) || 0,
        notes: form.notes || undefined,
      });
      toast.success("สร้างการจองสำเร็จ");
      onSave(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  };

  const availableRooms = rooms.filter((r) => r.status === "AVAILABLE" || r.status === "RESERVED");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>สร้างการจองใหม่</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Room & Dates */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><BedDouble className="h-4 w-4 text-primary" />ข้อมูลห้องพัก</h3>
            <div className="space-y-1.5">
              <Label htmlFor="bk-room">ห้องพัก *</Label>
              <Select value={form.roomId} onValueChange={(v) => setForm((f) => ({ ...f, roomId: v }))} required>
                <SelectTrigger id="bk-room"><SelectValue placeholder="เลือกห้องพัก" /></SelectTrigger>
                <SelectContent>
                  {availableRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      ห้อง {r.roomNumber} — {r.roomType.name} ({formatCurrency(r.pricePerNight)}/คืน)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bk-checkin">วันเข้าพัก *</Label>
                <Input id="bk-checkin" type="date" value={form.checkInDate} onChange={(e) => setForm((f) => ({ ...f, checkInDate: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-checkout">วันออก *</Label>
                <Input id="bk-checkout" type="date" value={form.checkOutDate} min={form.checkInDate} onChange={(e) => setForm((f) => ({ ...f, checkOutDate: e.target.value }))} required />
              </div>
            </div>
            {nights > 0 && selectedRoom && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">จำนวนคืน</span><span className="font-medium">{nights} คืน</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ราคารวม</span><span>{formatCurrency(total)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ส่วนลด</span><span>-{formatCurrency(Number(form.discountAmount) || 0)}</span></div>
                <Separator className="my-1" />
                <div className="flex justify-between font-semibold"><span>ยอดสุทธิ</span><span className="text-primary">{formatCurrency(final)}</span></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bk-discount">ส่วนลด (บาท)</Label>
                <Input id="bk-discount" type="number" min={0} value={form.discountAmount} onChange={(e) => setForm((f) => ({ ...f, discountAmount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-notes">หมายเหตุ</Label>
                <Input id="bk-notes" placeholder="หมายเหตุการจอง..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Guest Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><User className="h-4 w-4 text-primary" />ข้อมูลผู้เข้าพัก</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bk-fname">ชื่อ *</Label>
                <Input id="bk-fname" placeholder="ชื่อ" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-lname">นามสกุล *</Label>
                <Input id="bk-lname" placeholder="นามสกุล" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bk-phone">เบอร์โทร *</Label>
                <Input id="bk-phone" placeholder="0812345678" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-email">อีเมล</Label>
                <Input id="bk-email" type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-idnum">เลขบัตรประชาชน / พาสปอร์ต</Label>
              <Input id="bk-idnum" placeholder="1234567890123" value={form.idNumber} onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" disabled={loading || !form.roomId || nights <= 0}>
              {loading ? "กำลังบันทึก..." : "สร้างการจอง"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payment Dialog ──────────────────────────
function PaymentDialog({ booking, onClose, onSave }: { booking: Booking; onClose: () => void; onSave: () => void; }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  const totalPaid = (booking.payments || []).reduce((s, p) => s + p.amount, 0);
  const remaining = booking.finalAmount - totalPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createPayment({ bookingId: booking.id, amount: Number(amount), method, reference: reference || undefined });
      toast.success("บันทึกการชำระเงินสำเร็จ");
      onSave(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>บันทึกการชำระเงิน</DialogTitle></DialogHeader>
        <div className="space-y-1 text-sm py-1">
          <div className="flex justify-between"><span className="text-muted-foreground">ยอดรวม</span><span className="font-medium">{formatCurrency(booking.finalAmount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">ชำระแล้ว</span><span className="text-green-600">{formatCurrency(totalPaid)}</span></div>
          <div className="flex justify-between font-semibold"><span>ค้างชำระ</span><span className="text-red-600">{formatCurrency(remaining)}</span></div>
        </div>
        <Separator />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>จำนวนเงิน (บาท) *</Label>
            <Input type="number" min={1} max={remaining} placeholder={String(remaining)} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>ช่องทางชำระ *</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">เงินสด</SelectItem>
                <SelectItem value="TRANSFER">โอนเงิน</SelectItem>
                <SelectItem value="QR_CODE">QR Code</SelectItem>
                <SelectItem value="CREDIT_CARD">บัตรเครดิต</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>หมายเลขอ้างอิง</Label>
            <Input placeholder="เลขอ้างอิง / slip number" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : "บันทึกการชำระ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Bookings Page ──────────────────────
export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [printBooking, setPrintBooking] = useState<Booking | null>(null);
  const [payBooking, setPayBooking] = useState<Booking | null>(null);
  const [hotelName, setHotelName] = useState("โรงแรมของฉัน");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [b, r] = await Promise.all([getBookings(), getRooms()]);
      setBookings(b); setRooms(r);
      
      const dashRes = await fetch("/api/dashboard");
      const dashJson = await dashRes.json();
      if (dashJson.success && dashJson.data.hotelName) {
        setHotelName(dashJson.data.hotelName);
      }
    } catch { toast.error("ไม่สามารถโหลดข้อมูลได้"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAction = async (action: "checkin" | "checkout" | "cancel", booking: Booking) => {
    setActionLoading(booking.id);
    try {
      if (action === "checkin") { await checkInBooking(booking.id); toast.success(`Check-in ห้อง ${booking.room.roomNumber} สำเร็จ`); }
      else if (action === "checkout") { await checkOutBooking(booking.id); toast.success(`Check-out ห้อง ${booking.room.roomNumber} สำเร็จ`); }
      else { await cancelBooking(booking.id); toast.success("ยกเลิกการจองสำเร็จ"); }
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setActionLoading(null); }
  };

  const allStatuses = ["ALL", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "PENDING"];
  const filtered = bookings.filter((b) => {
    const matchTab = tab === "ALL" || b.status === tab;
    const matchSearch = !search ||
      `${b.guest.firstName} ${b.guest.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      b.room.roomNumber.includes(search) ||
      b.bookingNumber.includes(search);
    return matchTab && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">รายการจอง</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{bookings.length} รายการทั้งหมด</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />สร้างการจอง
        </Button>
      </div>

      {/* Search + Tabs */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่อแขก, เลขห้อง, เลขการจอง..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {allStatuses.map((s) => (
              <TabsTrigger key={s} value={s} className="h-8 text-xs">
                {s === "ALL" ? "ทั้งหมด" : statusConfig[s as BookingStatus]?.label || s}
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {s === "ALL" ? bookings.length : bookings.filter((b) => b.status === s).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Booking Cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><AlertCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">ไม่พบรายการจอง</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => {
            const sc = statusConfig[booking.status];
            const pc = payConfig[booking.paymentStatus] || payConfig.UNPAID;
            const isLoading = actionLoading === booking.id;
            const totalPaid = (booking.payments || []).reduce((s, p) => s + p.amount, 0);
            return (
              <Card key={booking.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Left status bar */}
                    <div className={cn("w-full sm:w-1 min-h-2 sm:min-h-0 rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none",
                      booking.status === "CHECKED_IN" ? "bg-green-500" : booking.status === "CONFIRMED" ? "bg-blue-500" : booking.status === "CANCELLED" ? "bg-red-500" : "bg-gray-300"
                    )} />
                    <div className="flex-1 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        {/* Guest + Room */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{booking.guest.firstName} {booking.guest.lastName}</span>
                            <Badge variant="outline" className={cn("text-xs", sc.color)}>{sc.label}</Badge>
                            <Badge variant="outline" className={cn("text-xs", pc.color)}>{pc.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ห้อง {booking.room.roomNumber} ({booking.room.roomType.name}) · {booking.nights} คืน
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(booking.checkInDate), "d MMM", { locale: th })} → {format(new Date(booking.checkOutDate), "d MMM yyyy", { locale: th })}
                          </p>
                          <p className="text-xs text-muted-foreground">📞 {booking.guest.phone}</p>
                        </div>

                        {/* Amount */}
                        <div className="text-left sm:text-right space-y-0.5">
                          <p className="text-lg font-bold text-primary">{formatCurrency(booking.finalAmount)}</p>
                          {booking.discountAmount > 0 && <p className="text-xs text-muted-foreground">ลด {formatCurrency(booking.discountAmount)}</p>}
                          <p className="text-xs text-muted-foreground">ชำระแล้ว {formatCurrency(totalPaid)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {booking.status === "CONFIRMED" && (
                          <Button size="sm" variant="outline" className="h-8 text-green-700 border-green-200 hover:bg-green-50" onClick={() => handleAction("checkin", booking)} disabled={isLoading}>
                            <DoorOpen className="h-3.5 w-3.5 mr-1.5" />Check-in
                          </Button>
                        )}
                        {booking.status === "CHECKED_IN" && (
                          <Button size="sm" variant="outline" className="h-8 text-blue-700 border-blue-200 hover:bg-blue-50" onClick={() => handleAction("checkout", booking)} disabled={isLoading}>
                            <LogOut className="h-3.5 w-3.5 mr-1.5" />Check-out
                          </Button>
                        )}
                        {booking.paymentStatus !== "PAID" && booking.status !== "CANCELLED" && booking.status !== "CHECKED_OUT" && (
                          <Button size="sm" variant="outline" className="h-8" onClick={() => setPayBooking(booking)} disabled={isLoading}>
                            <CreditCard className="h-3.5 w-3.5 mr-1.5" />รับชำระเงิน
                          </Button>
                        )}
                        {booking.status !== "CANCELLED" && (
                          <Button size="sm" variant="outline" className="h-8 text-slate-700 border-slate-200 hover:bg-slate-50" onClick={() => setPrintBooking(booking)} disabled={isLoading}>
                            <Printer className="h-3.5 w-3.5 mr-1.5" />พิมพ์ใบเสร็จ
                          </Button>
                        )}
                        {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
                          <Button size="sm" variant="outline" className="h-8 text-destructive border-destructive/20 hover:bg-red-50" onClick={() => handleAction("cancel", booking)} disabled={isLoading}>
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />ยกเลิก
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateBookingDialog open={showCreate} onClose={() => setShowCreate(false)} onSave={fetchAll} rooms={rooms} />
      {payBooking && <PaymentDialog booking={payBooking} onClose={() => setPayBooking(null)} onSave={fetchAll} />}
      {printBooking && (
        <BookingReceiptModal
          open={!!printBooking}
          onClose={() => setPrintBooking(null)}
          hotelName={hotelName}
          booking={printBooking}
        />
      )}
    </div>
  );
}
