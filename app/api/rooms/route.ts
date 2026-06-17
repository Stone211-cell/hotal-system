import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

// GET /api/rooms - ดึงรายการห้องทั้งหมดของโรงแรม
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
    const roomTypeId = searchParams.get("roomTypeId");

    const where: Record<string, unknown> = { hotelId };
    if (status) where.status = status;
    if (roomTypeId) where.roomTypeId = roomTypeId;

    const rooms = await prisma.room.findMany({
      where,
      include: {
        roomType: true,
        bookings: {
          where: {
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
          },
          include: { guest: true },
          orderBy: { checkInDate: "desc" },
          take: 1,
        },
      },
      orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    });

    return NextResponse.json({ data: rooms, success: true });
  } catch (error) {
    console.error("[GET /api/rooms]", error);
    return NextResponse.json(
      { message: "ไม่สามารถดึงข้อมูลห้องได้", success: false },
      { status: 500 }
    );
  }
}

// POST /api/rooms - เพิ่มห้องใหม่
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    // ตรวจสอบสิทธิ์ในการจัดการห้องพัก
    if (!member.permissions.canManageRooms) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์ในการจัดการข้อมูลห้องพัก", success: false },
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
      roomNumber,
      floor,
      roomTypeId,
      pricePerNight,
      description,
      amenities,
      maxGuests,
      notes, // รับฟิลด์หมายเหตุเพิ่มเติม
    } = body;

    if (!roomNumber || !roomTypeId || !pricePerNight) {
      return NextResponse.json(
        { message: "กรุณากรอกข้อมูลที่จำเป็น: เลขห้อง, ประเภทห้อง, ราคา", success: false },
        { status: 400 }
      );
    }

    // ตรวจสอบเลขห้องซ้ำในโรงแรมเดียวกัน
    const existing = await prisma.room.findUnique({
      where: {
        hotelId_roomNumber: {
          hotelId,
          roomNumber,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: `ห้องหมายเลข ${roomNumber} มีอยู่แล้วในระบบของท่าน`, success: false },
        { status: 409 }
      );
    }

    const room = await prisma.room.create({
      data: {
        hotelId,
        roomNumber,
        floor: floor ? Number(floor) : null,
        roomTypeId,
        pricePerNight: Number(pricePerNight),
        description,
        amenities: amenities || [],
        maxGuests: Number(maxGuests) || 2,
        notes: notes || null,
      },
      include: { roomType: true },
    });

    return NextResponse.json({ data: room, success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/rooms]", error);
    return NextResponse.json(
      { message: "ไม่สามารถเพิ่มห้องได้", success: false },
      { status: 500 }
    );
  }
}
