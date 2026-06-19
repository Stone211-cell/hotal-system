import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

// GET /api/expenses
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

    // ตรวจสอบสิทธิ์ในการดูภาพรวมการเงิน
    if (!member.permissions.canViewFinance) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์ในการเข้าถึงข้อมูลการเงิน", success: false },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const category = searchParams.get("category");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = { hotelId };
    if (category) where.category = category;
    if (type) where.type = type;
    if (from || to) {
      where.date = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        booking: {
          include: { guest: true, room: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ data: expenses, success: true });
  } catch (error) {
    console.error("[GET /api/expenses]", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาด", success: false },
      { status: 500 }
    );
  }
}

// POST /api/expenses - บันทึกรายจ่าย
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    // ตรวจสอบสิทธิ์ในการบันทึกรายจ่าย
    if (!member.permissions.canViewFinance) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์ในการบันทึกข้อมูลการเงิน", success: false },
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
    const { bookingId, category, description, amount, date, type } = body;

    if (!category || !description || !amount) {
      return NextResponse.json(
        { message: "กรุณากรอกข้อมูลให้ครบ", success: false },
        { status: 400 }
      );
    }

    // ตรวจสอบความถูกต้องของ bookingId ว่าเป็นของโรงแรมนี้จริงหรือไม่ (ถ้ามี)
    if (bookingId) {
      const bookingExists = await prisma.booking.findFirst({
        where: { id: bookingId, hotelId }
      });
      if (!bookingExists) {
        return NextResponse.json(
          { message: "ไม่พบข้อมูลการจองนี้ในโรงแรมของท่าน", success: false },
          { status: 404 }
        );
      }
    }

    const expense = await prisma.expense.create({
      data: {
        hotelId,
        bookingId: bookingId || null,
        type: type || "EXPENSE",
        category,
        description,
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json({ data: expense, success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/expenses]", error);
    return NextResponse.json(
      { message: "ไม่สามารถบันทึกรายจ่ายได้", success: false },
      { status: 500 }
    );
  }
}
