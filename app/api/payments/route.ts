import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

// POST /api/payments - บันทึกการชำระเงิน
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    // ตรวจสอบสิทธิ์การจอง/การชำระเงิน
    if (!member.permissions.canManageBookings) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์ในการจัดการการชำระเงิน", success: false },
        { status: 403 }
      );
    }

    const hotelId = member.hotelId;
    if (!hotelId) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลโรงแรมของท่าน", success: false },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { bookingId, amount, method, reference, note } = body;

    if (!bookingId || !amount || !method) {
      return NextResponse.json(
        { message: "กรุณากรอกข้อมูลการชำระเงินให้ครบ", success: false },
        { status: 400 }
      );
    }

    // ค้นหาการจองเฉพาะในโรงแรมของตัวเอง
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: { payments: true },
    });

    if (!booking) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลการจองในระบบของท่าน", success: false },
        { status: 404 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount: Number(amount),
        method,
        reference: reference || null,
        note: note || null,
      },
    });

    // คำนวณยอดรวมที่ชำระแล้ว
    const totalPaid = booking.payments.reduce((sum: number, p: any) => sum + p.amount, 0) + Number(amount);

    // อัพเดท payment status
    let paymentStatus: "UNPAID" | "PARTIAL" | "PAID" = "UNPAID";
    if (totalPaid >= booking.finalAmount) {
      paymentStatus = "PAID";
    } else if (totalPaid > 0) {
      paymentStatus = "PARTIAL";
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus },
    });

    return NextResponse.json({ data: payment, success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/payments]", error);
    return NextResponse.json(
      { message: "ไม่สามารถบันทึกการชำระเงินได้", success: false },
      { status: 500 }
    );
  }
}

// GET /api/payments
export async function GET(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    const hotelId = member.hotelId;
    if (!hotelId) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลโรงแรมของท่าน", success: false },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    // กรองประวัติชำระเงินให้อยู่เฉพาะในการจองของโรงแรมนี้
    const where: Record<string, any> = {
      booking: { hotelId }
    };
    if (bookingId) where.bookingId = bookingId;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        booking: {
          include: { guest: true, room: true },
        },
      },
      orderBy: { paidAt: "desc" },
    });

    return NextResponse.json({ data: payments, success: true });
  } catch (error) {
    console.error("[GET /api/payments]", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาด", success: false },
      { status: 500 }
    );
  }
}
