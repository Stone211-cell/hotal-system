import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

// GET /api/room-types
export async function GET() {
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

    const roomTypes = await prisma.roomType.findMany({
      where: { hotelId },
      include: { _count: { select: { rooms: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: roomTypes, success: true });
  } catch (error) {
    console.error("[GET /api/room-types]", error);
    return NextResponse.json(
      { message: "ไม่สามารถดึงข้อมูลประเภทห้องได้", success: false },
      { status: 500 }
    );
  }
}

// POST /api/room-types
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    // เช็คสิทธิ์ว่าเพิ่มประเภทห้องได้หรือไม่
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
    const { name, description, basePrice } = body;

    if (!name || !basePrice) {
      return NextResponse.json(
        { message: "กรุณากรอกชื่อประเภทและราคาพื้นฐาน", success: false },
        { status: 400 }
      );
    }

    const roomType = await prisma.roomType.create({
      data: { 
        hotelId,
        name, 
        description, 
        basePrice: Number(basePrice) 
      },
    });

    return NextResponse.json({ data: roomType, success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/room-types]", error);
    return NextResponse.json(
      { message: "ไม่สามารถเพิ่มประเภทห้องได้", success: false },
      { status: 500 }
    );
  }
}
