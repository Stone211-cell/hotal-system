import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/contracts/[id]
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
    const contract = await prisma.contract.findFirst({
      where: { id, hotelId: member.hotelId },
      include: {
        room: { include: { roomType: true } },
        tenant: true,
        bills: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ message: "ไม่พบสัญญาเช่า", success: false }, { status: 404 });
    }

    return NextResponse.json({ data: contract, success: true });
  } catch (error) {
    console.error("[GET /api/contracts/:id]", error);
    return NextResponse.json({ message: "เกิดข้อผิดพลาด", success: false }, { status: 500 });
  }
}

// PUT /api/contracts/[id] - ยกเลิกหรือหมดสัญญา
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    // ตรวจสอบสิทธิ์
    if (!member.permissions.canManageBookings) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์ในการแก้ไขสัญญาเช่า", success: false },
        { status: 403 }
      );
    }

    const { id } = await params;

    // ตรวจสอบว่าสัญญาเช่านี้เป็นของโรงแรมผู้ใช้นี้จริงหรือไม่
    const existingContract = await prisma.contract.findFirst({
      where: { id, hotelId: member.hotelId }
    });

    if (!existingContract) {
      return NextResponse.json(
        { message: "ไม่พบสัญญาเช่าในระบบของท่าน", success: false },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, notes } = body;

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: { room: true },
    });

    // หากสถานะเปลี่ยนเป็นหมดสัญญาหรือยกเลิก คืนสถานะห้องเป็นว่าง
    if (status === "EXPIRED" || status === "TERMINATED") {
      await prisma.room.update({
        where: { id: contract.roomId },
        data: { status: "AVAILABLE" },
      });
    }

    return NextResponse.json({ data: contract, success: true });
  } catch (error) {
    console.error("[PUT /api/contracts/:id]", error);
    return NextResponse.json({ message: "ไม่สามารถแก้ไขสัญญาได้", success: false }, { status: 500 });
  }
}
