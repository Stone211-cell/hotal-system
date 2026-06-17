"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

// ฟังก์ชันจัดฟอร์แมตเงินบาท
const formatCurrency = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

// ฟังก์ชันจัดรูปแบบวันที่สั้น
const formatDateStr = (dateStr?: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// ─── 1. ใบเสร็จรับเงินการจองโรงแรม (Booking Receipt) ──────
interface BookingReceiptProps {
  open: boolean;
  onClose: () => void;
  hotelName?: string;
  booking: {
    bookingNumber: string;
    room: { roomNumber: string; roomType: { name: string } };
    guest: { firstName: string; lastName: string; phone: string; email?: string | null };
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    pricePerNight: number;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    paymentStatus: string;
    payments?: Array<{ amount: number; method: string; paidAt: string; reference?: string | null }>;
  };
}

export function BookingReceiptModal({ open, onClose, hotelName = "โรงแรมของฉัน", booking }: BookingReceiptProps) {
  const totalPaid = booking.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const balanceDue = booking.finalAmount - totalPaid;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center justify-between text-base font-semibold">
            <span>ตัวอย่างใบเสร็จ / ใบสำคัญการจอง</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm" className="h-9 rounded-xl">
                <Printer className="h-4 w-4 mr-2" />
                พิมพ์เอกสาร
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* ส่วนพิมพ์เอกสาร (Print Area) */}
        <div className="p-8 border-y overflow-y-auto max-h-[70vh]">
          {/* สไตล์สำหรับการควบคุมหน้าพิมพ์ */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #print-area-booking, #print-area-booking * {
                visibility: visible !important;
              }
              #print-area-booking {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                color: black !important;
                padding: 20px !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div id="print-area-booking" className="space-y-6 text-foreground bg-background text-sm leading-relaxed">
            {/* ส่วนหัวใบเสร็จ */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h1 className="text-xl font-bold text-foreground">{hotelName}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">ระบบจองห้องพักโรงแรมแบบครบวงจร</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold text-primary">ใบรับเงิน / ใบจองห้องพัก</h2>
                <p className="text-xs text-muted-foreground mt-1">เลขที่: {booking.bookingNumber}</p>
                <p className="text-xs text-muted-foreground">วันที่พิมพ์: {new Date().toLocaleDateString("th-TH")}</p>
              </div>
            </div>

            {/* ข้อมูลลูกค้าและผู้เช่า */}
            <div className="grid grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">ข้อมูลลูกค้า</p>
                <p className="font-semibold text-foreground mt-1">คุณ {booking.guest.firstName} {booking.guest.lastName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">โทร: {booking.guest.phone}</p>
                {booking.guest.email && <p className="text-xs text-muted-foreground">อีเมล: {booking.guest.email}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">ข้อมูลการเข้าพัก</p>
                <p className="font-semibold text-foreground mt-1">ห้องพักเลขที่: {booking.room.roomNumber}</p>
                <p className="text-xs text-muted-foreground mt-0.5">ประเภทห้อง: {booking.room.roomType.name}</p>
                <p className="text-xs text-muted-foreground">ระยะเวลา: {formatDateStr(booking.checkInDate)} ถึง {formatDateStr(booking.checkOutDate)} ({booking.nights} คืน)</p>
              </div>
            </div>

            {/* ตารางคำนวณเงิน */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">รายการชำระเงิน</p>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-muted/40 font-semibold border-b text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">รายละเอียด</th>
                      <th className="px-4 py-2 text-right">จำนวนคืน</th>
                      <th className="px-4 py-2 text-right">ราคา/คืน</th>
                      <th className="px-4 py-2 text-right">ยอดรวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    <tr>
                      <td className="px-4 py-3">
                        <p className="font-semibold">ค่าห้องพักพักค้างคืน</p>
                        <p className="text-[10px] text-muted-foreground">ห้อง {booking.room.roomNumber} ({booking.room.roomType.name})</p>
                      </td>
                      <td className="px-4 py-3 text-right">{booking.nights} คืน</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(booking.pricePerNight)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(booking.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ส่วนสรุปเงิน */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ราคารวมพื้นฐาน:</span>
                  <span>{formatCurrency(booking.totalAmount)}</span>
                </div>
                {booking.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>ส่วนลดพิเศษ:</span>
                    <span>-{formatCurrency(booking.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1.5 text-sm font-bold">
                  <span>ยอดสุทธิที่ต้องจ่าย:</span>
                  <span className="text-primary">{formatCurrency(booking.finalAmount)}</span>
                </div>
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>ชำระเงินแล้ว:</span>
                  <span>{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed pt-1.5 text-xs font-bold text-foreground">
                  <span>ยอดคงเหลือค้างจ่าย:</span>
                  <span className={balanceDue > 0 ? "text-red-500 font-bold" : "text-muted-foreground"}>
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>

            {/* บันทึกการจ่ายประวัติย่อย */}
            {booking.payments && booking.payments.length > 0 && (
              <div className="space-y-1.5 border-t pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">ประวัติการชำระเงินย่อย</p>
                <div className="space-y-1">
                  {booking.payments.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        - ช่องทาง: {p.method === "CASH" ? "เงินสด" : p.method === "TRANSFER" ? "เงินโอน" : p.method === "CREDIT_CARD" ? "บัตรเครดิต" : "QR Code"} 
                        {p.reference ? ` (อ้างอิง: ${p.reference})` : ""}
                      </span>
                      <span>วันที่ชำระ: {new Date(p.paidAt).toLocaleString("th-TH")} ({formatCurrency(p.amount)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ส่วนท้ายใบจอง */}
            <div className="border-t pt-6 text-center text-[10px] text-muted-foreground space-y-1">
              <p>ขอขอบคุณที่ไว้วางใจเลือกเข้าพักกับเรา</p>
              <p>ในกรณีแจ้งยกเลิกกรุณาแจ้งล่วงหน้าอย่างน้อย 24 ชั่วโมงก่อนเช็คอิน</p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted/10 no-print">
          <Button onClick={onClose} variant="outline" className="rounded-xl h-10">
            ปิดหน้าต่าง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 2. ใบแจ้งหนี้/ใบเสร็จค่าเช่ารายเดือนหอพัก (Bill Receipt) ─
interface BillReceiptProps {
  open: boolean;
  onClose: () => void;
  hotelName?: string;
  bill: {
    billNumber: string;
    month: number;
    year: number;
    rentAmount: number;
    waterCurrentUnit?: number | null;
    waterPreviousUnit?: number | null;
    waterAmount: number;
    electricCurrentUnit?: number | null;
    electricPreviousUnit?: number | null;
    electricAmount: number;
    otherCharges: number;
    otherChargesNote?: string | null;
    totalAmount: number;
    dueDate: string;
    status: string;
    paidAt?: string | null;
    paymentMethod?: string | null;
    reference?: string | null;
    contract: {
      contractNumber: string;
      room: { roomNumber: string };
      tenant: { firstName: string; lastName: string; phone: string };
    };
  };
}

export function BillReceiptModal({ open, onClose, hotelName = "หอพักของฉัน", bill }: BillReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center justify-between text-base font-semibold">
            <span>ตัวอย่างบิลรายเดือนหอพัก / ใบแจ้งหนี้</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm" className="h-9 rounded-xl">
                <Printer className="h-4 w-4 mr-2" />
                พิมพ์บิลเช่า
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* ส่วนพิมพ์เอกสาร (Print Area) */}
        <div className="p-8 border-y overflow-y-auto max-h-[70vh]">
          {/* สไตล์สำหรับการควบคุมหน้าพิมพ์ */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #print-area-bill, #print-area-bill * {
                visibility: visible !important;
              }
              #print-area-bill {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                color: black !important;
                padding: 20px !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div id="print-area-bill" className="space-y-6 text-foreground bg-background text-sm leading-relaxed">
            {/* ส่วนหัวใบแจ้งหนี้ */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h1 className="text-xl font-bold text-foreground">{hotelName}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">ใบเรียกเก็บเงินและใบรับเงินรายเดือน</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold text-primary">ใบเสร็จรับเงิน / ใบแจ้งหนี้</h2>
                <p className="text-xs text-muted-foreground mt-1">เลขที่บิล: {bill.billNumber}</p>
                <p className="text-xs text-muted-foreground">ประจำงวด: {bill.month}/{bill.year}</p>
              </div>
            </div>

            {/* ข้อมูลสัญญาและผู้เช่า */}
            <div className="grid grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">ข้อมูลผู้เช่าห้องพัก</p>
                <p className="font-semibold text-foreground mt-1">คุณ {bill.contract.tenant.firstName} {bill.contract.tenant.lastName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">เบอร์ติดต่อ: {bill.contract.tenant.phone}</p>
                <p className="text-xs text-muted-foreground">เลขที่สัญญาเช่า: {bill.contract.contractNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">ห้องพัก</p>
                <p className="font-semibold text-foreground mt-1">ห้องพักหมายเลข: {bill.contract.room.roomNumber}</p>
                <p className="text-xs text-muted-foreground mt-0.5">ครบกำหนดชำระ: {formatDateStr(bill.dueDate)}</p>
                <p className="text-xs text-muted-foreground">
                  สถานะบิล: 
                  <span className={bill.status === "PAID" ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                    {bill.status === "PAID" ? " ชำระเงินเรียบร้อยแล้ว" : " ค้างชำระเงิน"}
                  </span>
                </p>
              </div>
            </div>

            {/* รายละเอียดค่าน้ำ ค่าไฟ ค่าเช่า */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">รายการแจกแจงค่าใช้จ่าย</p>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-muted/40 font-semibold border-b text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">ลำดับ / รายละเอียดค่าใช้จ่าย</th>
                      <th className="px-4 py-2 text-right">หน่วยเก่า</th>
                      <th className="px-4 py-2 text-right">หน่วยใหม่</th>
                      <th className="px-4 py-2 text-right">จำนวนที่ใช้</th>
                      <th className="px-4 py-2 text-right">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {/* ค่าเช่าห้อง */}
                    <tr>
                      <td className="px-4 py-3 font-semibold">1. ค่าเช่าห้องพักรายเดือน</td>
                      <td className="px-4 py-3 text-right">-</td>
                      <td className="px-4 py-3 text-right">-</td>
                      <td className="px-4 py-3 text-right">-</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(bill.rentAmount)}</td>
                    </tr>
                    
                    {/* ค่าน้ำประปา */}
                    <tr>
                      <td className="px-4 py-3 font-semibold">2. ค่าน้ำประปา</td>
                      <td className="px-4 py-3 text-right">{bill.waterPreviousUnit ?? "-"}</td>
                      <td className="px-4 py-3 text-right">{bill.waterCurrentUnit ?? "-"}</td>
                      <td className="px-4 py-3 text-right">
                        {bill.waterCurrentUnit !== null && bill.waterPreviousUnit !== null 
                          ? Number(bill.waterCurrentUnit) - Number(bill.waterPreviousUnit)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(bill.waterAmount)}</td>
                    </tr>

                    {/* ค่าไฟฟ้า */}
                    <tr>
                      <td className="px-4 py-3 font-semibold">3. ค่าไฟฟ้า</td>
                      <td className="px-4 py-3 text-right">{bill.electricPreviousUnit ?? "-"}</td>
                      <td className="px-4 py-3 text-right">{bill.electricCurrentUnit ?? "-"}</td>
                      <td className="px-4 py-3 text-right">
                        {bill.electricCurrentUnit !== null && bill.electricPreviousUnit !== null 
                          ? Number(bill.electricCurrentUnit) - Number(bill.electricPreviousUnit)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(bill.electricAmount)}</td>
                    </tr>

                    {/* ค่าธรรมเนียมอื่นๆ */}
                    {bill.otherCharges > 0 && (
                      <tr>
                        <td className="px-4 py-3 font-semibold">
                          4. ค่าธรรมเนียมอื่น ๆ {bill.otherChargesNote ? `(${bill.otherChargesNote})` : ""}
                        </td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(bill.otherCharges)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* สรุปยอดเงิน */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-xs">
                <div className="flex justify-between border-t pt-1.5 text-sm font-bold">
                  <span>ยอดชำระเงินรวมทั้งหมด:</span>
                  <span className="text-primary">{formatCurrency(bill.totalAmount)}</span>
                </div>
                {bill.status === "PAID" && (
                  <>
                    <div className="flex justify-between text-green-600 font-semibold mt-1">
                      <span>รับเงินเรียบร้อยแล้ว:</span>
                      <span>{formatCurrency(bill.totalAmount)}</span>
                    </div>
                    {bill.paidAt && (
                      <p className="text-[10px] text-muted-foreground text-right mt-1">
                        วันที่จ่าย: {new Date(bill.paidAt).toLocaleString("th-TH")} (ช่องทาง: {bill.paymentMethod})
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ส่วนลงชื่อผู้รับเงินและเงื่อนไข */}
            <div className="grid grid-cols-2 gap-6 border-t pt-6 text-xs text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">เงื่อนไขการชำระเงิน:</p>
                <p className="text-[10px] mt-1 leading-relaxed">
                  1. กรุณาชำระเงินภายในวันที่ครบกำหนดตามระบุ หากเกินกำหนดอาจมีค่าปรับตามระบุในสัญญา<br />
                  2. เมื่อโอนเงินแล้วกรุณาแนบหลักฐานสลิปการโอนผ่านทางช่องแชทหรือแจ้งผู้ดูแลระบบโดยเร็ว
                </p>
              </div>
              <div className="flex flex-col items-center justify-end text-center">
                <div className="w-32 border-b h-10 border-dashed" />
                <p className="mt-2 text-[10px] font-medium text-foreground">ผู้รับเงิน / ผู้แจ้งเก็บ</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted/10 no-print">
          <Button onClick={onClose} variant="outline" className="rounded-xl h-10">
            ปิดหน้าต่าง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
