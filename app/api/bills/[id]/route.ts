import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PUT /api/bills/[id] - บันทึกการชำระเงิน หรือ อัพเดทบิล
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    // ตรวจสอบสิทธิ์ในการจัดการการเงิน/สัญญา
    if (!member.permissions.canManageBookings) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์ในการจัดการบิลค่าเช่า", success: false },
        { status: 403 }
      );
    }

    const { id } = await params;

    // ตรวจสอบว่าบิลนี้ของโรงแรมผู้ใช้นี้จริงหรือไม่
    const existingBill = await prisma.bill.findFirst({
      where: {
        id,
        contract: { hotelId: member.hotelId }
      }
    });

    if (!existingBill) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลบิลนี้ในโรงแรมของท่าน", success: false },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, paymentMethod, reference, paidAt } = body;

    const bill = await prisma.bill.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(paymentMethod && { paymentMethod }),
        ...(reference !== undefined && { reference }),
        ...(paidAt && { paidAt: new Date(paidAt) }),
        ...(status === "PAID" && !paidAt && { paidAt: new Date() }), // auto set paidAt if not provided but status is PAID
      },
      include: {
        contract: { include: { room: true, tenant: true } },
      },
    });

    return NextResponse.json({ data: bill, success: true });
  } catch (error) {
    console.error("[PUT /api/bills/:id]", error);
    return NextResponse.json({ message: "ไม่สามารถอัพเดทบิลได้", success: false }, { status: 500 });
  }
}

// DELETE /api/bills/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
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
        { message: "คุณไม่มีสิทธิ์ในการจัดการบิลค่าเช่า", success: false },
        { status: 403 }
      );
    }

    const { id } = await params;

    // ตรวจสอบว่าบิลนี้ของโรงแรมผู้ใช้นี้จริงหรือไม่
    const existingBill = await prisma.bill.findFirst({
      where: {
        id,
        contract: { hotelId: member.hotelId }
      }
    });

    if (!existingBill) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลบิลนี้ในโรงแรมของท่าน", success: false },
        { status: 404 }
      );
    }

    await prisma.bill.delete({ where: { id } });
    return NextResponse.json({ message: "ลบบิลสำเร็จ", success: true });
  } catch (error) {
    console.error("[DELETE /api/bills/:id]", error);
    return NextResponse.json({ message: "ไม่สามารถลบบิลได้", success: false }, { status: 500 });
  }
}
