import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PUT /api/maintenance/[id] - อัปเดตสถานะและข้อมูลการแจ้งซ่อม/ทำความสะอาด
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status, description, cost, reportedBy } = body;

    // ตรวจสอบว่ารายการนี้เป็นของโรงแรมนี้จริงหรือไม่
    const existing = await prisma.roomMaintenance.findFirst({
      where: { id, hotelId: member.hotelId },
      include: { room: true }
    });

    if (!existing) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลรายการแจ้งซ่อมนี้", success: false },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {};
    if (description !== undefined) updateData.description = description;
    if (reportedBy !== undefined) updateData.reportedBy = reportedBy;
    if (cost !== undefined) updateData.cost = Number(cost);

    if (status) {
      updateData.status = status;

      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();

        // 1. ถ้าซ่อมเสร็จแล้ว ให้คืนสถานะห้องพักเป็น ว่าง (AVAILABLE) หากห้องนั้นยังเป็นชำรุดอยู่
        if (existing.type === "REPAIR" && existing.room.status === "MAINTENANCE") {
          await prisma.room.update({
            where: { id: existing.roomId },
            data: { status: "AVAILABLE" }
          });
        }

        // 2. ถ้ามีค่าใช้จ่าย (cost > 0) ให้สร้างบันทึกรายจ่าย (Expense) ของโรงแรมอัตโนมัติ
        const finalCost = cost !== undefined ? Number(cost) : existing.cost;
        if (finalCost > 0) {
          const expenseCategory = existing.type === "REPAIR" ? "ค่าซ่อมบำรุง" : "ค่าทำความสะอาด";
          await prisma.expense.create({
            data: {
              hotelId: member.hotelId!,
              category: expenseCategory,
              description: `${expenseCategory}ห้อง ${existing.room.roomNumber}: ${existing.title}`,
              amount: finalCost,
              date: new Date(),
            }
          });
        }
      }
    }

    const updatedRecord = await prisma.roomMaintenance.update({
      where: { id },
      data: updateData,
      include: {
        room: { include: { roomType: true } }
      }
    });

    return NextResponse.json({ data: updatedRecord, success: true });
  } catch (error) {
    console.error("[PUT /api/maintenance/:id]", error);
    return NextResponse.json(
      { message: "ไม่สามารถอัปเดตรายการได้", success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/maintenance/[id] - ลบรายการแจ้งซ่อม/ทำความสะอาด
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    const { id } = await params;

    // ตรวจสอบโรงแรม
    const existing = await prisma.roomMaintenance.findFirst({
      where: { id, hotelId: member.hotelId }
    });

    if (!existing) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลรายการแจ้งซ่อมในโรงแรมของท่าน", success: false },
        { status: 404 }
      );
    }

    // ลบข้อมูล
    await prisma.roomMaintenance.delete({
      where: { id }
    });

    return NextResponse.json({ message: "ลบประวัติรายการสำเร็จ", success: true });
  } catch (error) {
    console.error("[DELETE /api/maintenance/:id]", error);
    return NextResponse.json(
      { message: "ไม่สามารถลบรายการได้", success: false },
      { status: 500 }
    );
  }
}
