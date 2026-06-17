import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PUT /api/members/[id] - แก้ไขข้อมูลพนักงานหรือสลับสิทธิ์การเข้าถึง
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    if (member.role !== "OWNER") {
      return NextResponse.json(
        { message: "เฉพาะเจ้าของโรงแรม (OWNER) เท่านั้นที่มีสิทธิ์แก้ไขข้อมูลพนักงาน", success: false },
        { status: 403 }
      );
    }

    const { id } = await params;

    // ตรวจสอบว่าพนักงานคนนี้อยู่ในโรงแรมนี้จริงๆ
    const targetMember = await prisma.hotelMember.findFirst({
      where: { id, hotelId: member.hotelId }
    });

    if (!targetMember) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลพนักงานในโรงแรมของท่าน", success: false },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, role, isActive, canManageRooms, canManageBookings, canViewFinance } = body;

    // หากเป็นตัวของ Admin เอง ห้ามปิดการใช้งาน (isActive) หรือดาวน์เกรดบทบาทตัวเอง
    if (targetMember.email.toLowerCase() === member.email.toLowerCase()) {
      if (isActive === false || role === "STAFF") {
        return NextResponse.json(
          { message: "ท่านไม่สามารถปิดการใช้งานหรือลดระดับสิทธิ์ของตัวเองได้", success: false },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.hotelMember.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(canManageRooms !== undefined && { canManageRooms }),
        ...(canManageBookings !== undefined && { canManageBookings }),
        ...(canViewFinance !== undefined && { canViewFinance }),
      }
    });

    return NextResponse.json({ data: updated, success: true });
  } catch (error) {
    console.error("[PUT /api/members/:id]", error);
    return NextResponse.json(
      { message: "ไม่สามารถอัปเดตข้อมูลพนักงานได้", success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/members/[id] - ลบพนักงานออกจากระบบ
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    if (member.role !== "OWNER") {
      return NextResponse.json(
        { message: "เฉพาะเจ้าของโรงแรม (OWNER) เท่านั้นที่มีสิทธิ์ลบพนักงานออก", success: false },
        { status: 403 }
      );
    }

    const { id } = await params;

    // ตรวจสอบว่าพนักงานคนนี้อยู่ในโรงแรมนี้จริงๆ
    const targetMember = await prisma.hotelMember.findFirst({
      where: { id, hotelId: member.hotelId }
    });

    if (!targetMember) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลพนักงานในโรงแรมของท่าน", success: false },
        { status: 404 }
      );
    }

    // ห้ามลบตัวเองออก
    if (targetMember.email.toLowerCase() === member.email.toLowerCase()) {
      return NextResponse.json(
        { message: "ท่านไม่สามารถลบตัวเองออกจากระบบได้", success: false },
        { status: 400 }
      );
    }

    await prisma.hotelMember.delete({ where: { id } });

    return NextResponse.json({ message: "ลบพนักงานออกจากระบบสำเร็จ", success: true });
  } catch (error) {
    console.error("[DELETE /api/members/:id]", error);
    return NextResponse.json(
      { message: "ไม่สามารถลบพนักงานได้", success: false },
      { status: 500 }
    );
  }
}
