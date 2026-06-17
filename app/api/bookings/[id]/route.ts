import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/bookings/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    const { id } = await params;
    const booking = await prisma.booking.findFirst({
      where: { id, hotelId: member.hotelId },
      include: {
        room: { include: { roomType: true } },
        guest: true,
        payments: true,
        expenses: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { message: "ไม่พบการจอง", success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: booking, success: true });
  } catch (error) {
    console.error("[GET /api/bookings/:id]", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาด", success: false },
      { status: 500 }
    );
  }
}

// PUT /api/bookings/[id] - อัพเดทสถานะการจอง (check-in, check-out, cancel)
export async function PUT(request: NextRequest, { params }: Params) {
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

    const { id } = await params;
    const body = await request.json();
    const { status, notes, discountAmount } = body;

    const currentBooking = await prisma.booking.findFirst({
      where: { id, hotelId: member.hotelId },
      include: { room: true },
    });

    if (!currentBooking) {
      return NextResponse.json(
        { message: "ไม่พบการจองในระบบของท่าน", success: false },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (notes !== undefined) updateData.notes = notes;
    if (discountAmount !== undefined) {
      updateData.discountAmount = Number(discountAmount);
      updateData.finalAmount =
        currentBooking.totalAmount - Number(discountAmount);
    }

    if (status) {
      updateData.status = status;

      // จัดการสถานะห้องตาม action (ตรวจสอบห้องในโรงแรมด้วย)
      if (status === "CHECKED_IN") {
        updateData.actualCheckIn = new Date();
        await prisma.room.update({
          where: { id: currentBooking.roomId },
          data: { status: "OCCUPIED" },
        });
      } else if (status === "CHECKED_OUT") {
        updateData.actualCheckOut = new Date();
        await prisma.room.update({
          where: { id: currentBooking.roomId },
          data: { status: "AVAILABLE" },
        });
      } else if (status === "CANCELLED") {
        await prisma.room.update({
          where: { id: currentBooking.roomId },
          data: { status: "AVAILABLE" },
        });
      }
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        room: { include: { roomType: true } },
        guest: true,
        payments: true,
      },
    });

    return NextResponse.json({ data: booking, success: true });
  } catch (error) {
    console.error("[PUT /api/bookings/:id]", error);
    return NextResponse.json(
      { message: "ไม่สามารถอัพเดทการจองได้", success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/bookings/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
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

    const { id } = await params;

    const booking = await prisma.booking.findFirst({ 
      where: { id, hotelId: member.hotelId } 
    });

    if (!booking) {
      return NextResponse.json(
        { message: "ไม่พบการจองในระบบของท่าน", success: false },
        { status: 404 }
      );
    }

    if (booking.status === "CHECKED_IN") {
      return NextResponse.json(
        { message: "ไม่สามารถลบการจองที่กำลัง check-in อยู่", success: false },
        { status: 409 }
      );
    }

    // คืนสถานะห้องเป็นว่าง
    await prisma.room.update({
      where: { id: booking.roomId },
      data: { status: "AVAILABLE" },
    });

    await prisma.booking.delete({ where: { id } });
    return NextResponse.json({ message: "ยกเลิกการจองสำเร็จ", success: true });
  } catch (error) {
    console.error("[DELETE /api/bookings/:id]", error);
    return NextResponse.json(
      { message: "ไม่สามารถลบการจองได้", success: false },
      { status: 500 }
    );
  }
}
