import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";
import { sendLineToAdmin } from "@/lib/line-api";

export const dynamic = "force-dynamic";

// GET /api/bookings
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
    const status = searchParams.get("status");
    const roomId = searchParams.get("roomId");
    const guestId = searchParams.get("guestId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = { hotelId };
    if (status) where.status = status;
    if (roomId) where.roomId = roomId;
    if (guestId) where.guestId = guestId;
    if (from || to) {
      where.checkInDate = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: { include: { roomType: true } },
        guest: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: bookings, permissions: member.permissions, hotelName: member.hotelName, success: true });
  } catch (error) {
    console.error("[GET /api/bookings]", error);
    return NextResponse.json(
      { message: "ไม่สามารถดึงข้อมูลการจองได้", success: false },
      { status: 500 }
    );
  }
}

// POST /api/bookings - สร้างการจองใหม่
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    // ตรวจสอบสิทธิ์ในการทำรายการจอง
    if (!member.permissions.canManageBookings) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์ในการจัดการการจองห้องพัก", success: false },
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
    const {
      roomId,
      guest,
      checkInDate,
      checkOutDate,
      pricePerNight,
      discountAmount,
      notes,
    } = body;

    if (!roomId || !guest || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { message: "กรุณากรอกข้อมูลที่จำเป็น", success: false },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าห้องนี้เป็นของโรงแรมผู้ใช้นี้จริงหรือไม่
    const roomExists = await prisma.room.findFirst({
      where: { id: roomId, hotelId }
    });
    if (!roomExists) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลห้องพักในโรงแรมของท่าน", success: false },
        { status: 404 }
      );
    }

    // ตรวจสอบว่าห้องว่างในช่วงเวลานั้นไหม
    const conflictBooking = await prisma.booking.findFirst({
      where: {
        roomId,
        hotelId,
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
        AND: [
          { checkInDate: { lt: new Date(checkOutDate) } },
          { checkOutDate: { gt: new Date(checkInDate) } },
        ],
      },
    });

    if (conflictBooking) {
      return NextResponse.json(
        { message: "ห้องนี้ถูกจองในช่วงเวลาดังกล่าวแล้ว", success: false },
        { status: 409 }
      );
    }

    // คำนวณราคา
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalAmount = nights * Number(pricePerNight);
    const discount = Number(discountAmount) || 0;
    const finalAmount = totalAmount - discount;

    // หาหรือสร้างผู้เข้าพักเฉพาะของโรงแรมนี้
    let guestRecord = null;
    if (guest.id) {
      guestRecord = await prisma.guest.findFirst({
        where: { id: guest.id, hotelId }
      });
    }

    if (!guestRecord) {
      guestRecord = await prisma.guest.create({
        data: {
          hotelId,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email || null,
          phone: guest.phone,
          idNumber: guest.idNumber || null,
          nationality: guest.nationality || "Thai",
          address: guest.address || null,
        },
      });
    }

    const booking = await prisma.booking.create({
      data: {
        hotelId,
        roomId,
        guestId: guestRecord.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        nights,
        pricePerNight: Number(pricePerNight),
        totalAmount,
        discountAmount: discount,
        finalAmount,
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        notes: notes || null,
      },
      include: {
        room: { include: { roomType: true } },
        guest: true,
      },
    });

    // อัพเดทสถานะห้องเป็น RESERVED
    await prisma.room.update({
      where: { id: roomId },
      data: { status: "RESERVED" },
    });

    // 🔔 แจ้งเตือนเจ้าของโรงแรมผ่าน LINE
    const checkInStr = booking.checkInDate.toLocaleDateString("th-TH");
    const checkOutStr = booking.checkOutDate.toLocaleDateString("th-TH");
    await sendLineToAdmin(
      `🛎️ มีการจองใหม่!
` +
      `👤 ลูกค้า: ${booking.guest.firstName} ${booking.guest.lastName}
` +
      `🚪 ห้อง: ${booking.room.roomNumber}
` +
      `📅 เช็คอิน: ${checkInStr}
` +
      `📅 เช็คเอาท์: ${checkOutStr}
` +
      `💰 ยอดรวม: ${booking.finalAmount.toLocaleString()} บาท`
    );

    return NextResponse.json({ data: booking, success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/bookings]", error);
    return NextResponse.json(
      { message: "ไม่สามารถสร้างการจองได้", success: false },
      { status: 500 }
    );
  }
}
