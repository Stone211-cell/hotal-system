import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PUT /api/superadmin/[id] - แก้ไขข้อมูลบิล / การเช่าของโรงแรม
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isSuperAdmin) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์เข้าถึงข้อมูลหลังบ้านระบบ SaaS", success: false },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, logoUrl, subscriptionStatus, rentAmount, overdueMonths, nextBillingDate } = body;

    const existingHotel = await prisma.hotel.findUnique({
      where: { id }
    });

    if (!existingHotel) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลโรงแรมนี้ในระบบ", success: false },
        { status: 404 }
      );
    }

    const updated = await prisma.hotel.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(subscriptionStatus !== undefined && { subscriptionStatus }),
        ...(rentAmount !== undefined && { rentAmount: Number(rentAmount) }),
        ...(overdueMonths !== undefined && { overdueMonths: Number(overdueMonths) }),
        ...(nextBillingDate !== undefined && {
          nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : null
        })
      }
    });

    return NextResponse.json({ data: updated, success: true });
  } catch (error) {
    console.error("[PUT /api/superadmin/:id]", error);
    return NextResponse.json(
      { message: "ไม่สามารถอัปเดตข้อมูลโรงแรมได้", success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/superadmin/[id] - ลบโรงแรมออกจากระบบทั้งหมด (Cascading delete)
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isSuperAdmin) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์เข้าถึงข้อมูลหลังบ้านระบบ SaaS", success: false },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingHotel = await prisma.hotel.findUnique({
      where: { id }
    });

    if (!existingHotel) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลโรงแรมนี้ในระบบ", success: false },
        { status: 404 }
      );
    }

    await prisma.hotel.delete({
      where: { id }
    });

    return NextResponse.json({ message: "ลบโรงแรมและข้อมูลทั้งหมดเสร็จสมบูรณ์", success: true });
  } catch (error) {
    console.error("[DELETE /api/superadmin/:id]", error);
    return NextResponse.json(
      { message: "ไม่สามารถลบโรงแรมได้", success: false },
      { status: 500 }
    );
  }
}
