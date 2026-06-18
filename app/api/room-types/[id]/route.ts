import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const member = await getCurrentMember();
    if (!member || (!member.isSuperAdmin && (!member.isActive || !member.permissions.canManageRooms))) {
      return NextResponse.json({ message: "ไม่มีสิทธิ์", success: false }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, basePrice } = body;

    const existingType = await prisma.roomType.findFirst({
      where: { id, hotelId: member.hotelId }
    });

    if (!existingType) {
      return NextResponse.json({ message: "ไม่พบประเภทห้องพัก", success: false }, { status: 404 });
    }

    const updated = await prisma.roomType.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(basePrice !== undefined && { basePrice: Number(basePrice) })
      }
    });

    return NextResponse.json({ data: updated, success: true });
  } catch (error) {
    console.error("[PUT /api/room-types/:id]", error);
    return NextResponse.json({ message: "ไม่สามารถอัปเดตได้", success: false }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const member = await getCurrentMember();
    if (!member || (!member.isSuperAdmin && (!member.isActive || !member.permissions.canManageRooms))) {
      return NextResponse.json({ message: "ไม่มีสิทธิ์", success: false }, { status: 403 });
    }

    const { id } = await params;

    const existingType = await prisma.roomType.findFirst({
      where: { id, hotelId: member.hotelId },
      include: { _count: { select: { rooms: true } } }
    });

    if (!existingType) {
      return NextResponse.json({ message: "ไม่พบประเภทห้องพัก", success: false }, { status: 404 });
    }

    if (existingType._count.rooms > 0) {
      return NextResponse.json(
        { message: "ไม่สามารถลบหมวดหมู่นี้ได้เนื่องจากมีห้องพักใช้งานอยู่", success: false },
        { status: 400 }
      );
    }

    await prisma.roomType.delete({ where: { id } });

    return NextResponse.json({ message: "ลบเสร็จสมบูรณ์", success: true });
  } catch (error) {
    console.error("[DELETE /api/room-types/:id]", error);
    return NextResponse.json({ message: "ไม่สามารถลบได้", success: false }, { status: 500 });
  }
}
