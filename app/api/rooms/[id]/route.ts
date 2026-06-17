import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/rooms/[id]
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
    const room = await prisma.room.findFirst({
      where: { id, hotelId: member.hotelId },
      include: {
        roomType: true,
        bookings: {
          include: { guest: true, payments: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { message: "ไม่พบห้องพัก", success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: room, success: true });
  } catch (error) {
    console.error("[GET /api/rooms/:id]", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาด", success: false },
      { status: 500 }
    );
  }
}

// PUT /api/rooms/[id] - แก้ไขห้อง
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    // ตรวจสอบสิทธิ์แก้ไขห้อง
    if (!member.permissions.canManageRooms) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์ในการจัดการข้อมูลห้องพัก", success: false },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    // ตรวจสอบว่าห้องนี้เป็นของโรงแรมผู้ใช้นี้จริงหรือไม่
    const existingRoom = await prisma.room.findFirst({
      where: { id, hotelId: member.hotelId }
    });

    if (!existingRoom) {
      return NextResponse.json(
        { message: "ไม่พบห้องพักในโรงแรมของท่าน", success: false },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      roomNumber,
      floor,
      roomTypeId,
      pricePerNight,
      status,
      description,
      amenities,
      maxGuests,
      notes, // รับฟิลด์หมายเหตุเพิ่มเติม
    } = body;

    // ตรวจสอบเลขห้องซ้ำในโรงแรมเดียวกันหากมีการแก้ไขเลขห้อง
    if (roomNumber && roomNumber !== existingRoom.roomNumber) {
      const roomNumberDup = await prisma.room.findUnique({
        where: {
          hotelId_roomNumber: {
            hotelId: member.hotelId!,
            roomNumber,
          }
        }
      });
      if (roomNumberDup) {
        return NextResponse.json(
          { message: `ห้องหมายเลข ${roomNumber} มีอยู่แล้วในระบบของท่าน`, success: false },
          { status: 409 }
        );
      }
    }

    const room = await prisma.room.update({
      where: { id },
      data: {
        ...(roomNumber && { roomNumber }),
        ...(floor !== undefined && { floor: floor ? Number(floor) : null }),
        ...(roomTypeId && { roomTypeId }),
        ...(pricePerNight && { pricePerNight: Number(pricePerNight) }),
        ...(status && { status }),
        ...(description !== undefined && { description }),
        ...(amenities && { amenities }),
        ...(maxGuests && { maxGuests: Number(maxGuests) }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: { roomType: true },
    });

    return NextResponse.json({ data: room, success: true });
  } catch (error) {
    console.error("[PUT /api/rooms/:id]", error);
    return NextResponse.json(
      { message: "ไม่สามารถแก้ไขห้องได้", success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    // ตรวจสอบสิทธิ์ลบห้องพัก
    if (!member.permissions.canManageRooms) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์ในการจัดการข้อมูลห้องพัก", success: false },
        { status: 403 }
      );
    }

    const { id } = await params;

    // ตรวจสอบว่าห้องนี้เป็นของโรงแรมผู้ใช้นี้จริงหรือไม่
    const existingRoom = await prisma.room.findFirst({
      where: { id, hotelId: member.hotelId }
    });

    if (!existingRoom) {
      return NextResponse.json(
        { message: "ไม่พบห้องพักในโรงแรมของท่าน", success: false },
        { status: 404 }
      );
    }

    // ตรวจสอบว่ามีการจองที่ active อยู่ไหม
    const activeBooking = await prisma.booking.findFirst({
      where: {
        roomId: id,
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
    });

    if (activeBooking) {
      return NextResponse.json(
        { message: "ไม่สามารถลบห้องที่มีการจองอยู่", success: false },
        { status: 409 }
      );
    }

    await prisma.room.delete({ where: { id } });
    return NextResponse.json({ message: "ลบห้องสำเร็จ", success: true });
  } catch (error) {
    console.error("[DELETE /api/rooms/:id]", error);
    return NextResponse.json(
      { message: "ไม่สามารถลบห้องได้", success: false },
      { status: 500 }
    );
  }
}
