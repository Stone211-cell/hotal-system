import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

// GET /api/contracts
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

    const where: Record<string, unknown> = { hotelId };
    if (status) where.status = status;
    if (roomId) where.roomId = roomId;

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        room: { include: { roomType: true } },
        tenant: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: contracts, success: true });
  } catch (error) {
    console.error("[GET /api/contracts]", error);
    return NextResponse.json(
      { message: "ไม่สามารถดึงข้อมูลสัญญาเช่าได้", success: false },
      { status: 500 }
    );
  }
}

// POST /api/contracts - สร้างสัญญาเช่าใหม่
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    // ตรวจสอบสิทธิ์ในการทำรายการจอง/สัญญา
    if (!member.permissions.canManageBookings) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์ในการจัดการสัญญาเช่า", success: false },
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
      tenant, // { id, firstName, lastName, phone, idNumber, address }
      startDate,
      endDate,
      depositAmount,
      rentAmount,
      notes,
    } = body;

    if (!roomId || !tenant || !startDate || !endDate || !rentAmount) {
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

    // ตรวจสอบว่าห้องมีการทำสัญญา ACTIVE อยู่หรือไม่
    const activeContract = await prisma.contract.findFirst({
      where: {
        roomId,
        hotelId,
        status: "ACTIVE",
      },
    });

    if (activeContract) {
      return NextResponse.json(
        { message: "ห้องนี้มีสัญญาเช่าที่ยังใช้งานอยู่", success: false },
        { status: 409 }
      );
    }

    // หาหรือสร้างผู้เช่าเฉพาะของโรงแรมนี้
    let tenantRecord = null;
    if (tenant.id) {
      tenantRecord = await prisma.guest.findFirst({
        where: { id: tenant.id, hotelId }
      });
    }

    if (!tenantRecord) {
      tenantRecord = await prisma.guest.create({
        data: {
          hotelId,
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          phone: tenant.phone,
          idNumber: tenant.idNumber || null,
          address: tenant.address || null,
        },
      });
    }

    const contract = await prisma.contract.create({
      data: {
        hotelId,
        roomId,
        tenantId: tenantRecord.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        depositAmount: Number(depositAmount) || 0,
        rentAmount: Number(rentAmount),
        notes: notes || null,
        status: "ACTIVE",
      },
      include: {
        room: true,
        tenant: true,
      },
    });

    // อัพเดทสถานะห้องให้มีคนอยู่ (OCCUPIED)
    await prisma.room.update({
      where: { id: roomId },
      data: { status: "OCCUPIED" },
    });

    return NextResponse.json({ data: contract, success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/contracts]", error);
    return NextResponse.json(
      { message: "ไม่สามารถสร้างสัญญาเช่าได้", success: false },
      { status: 500 }
    );
  }
}
