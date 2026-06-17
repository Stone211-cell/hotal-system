import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

// GET /api/bills
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
    const contractId = searchParams.get("contractId");
    const status = searchParams.get("status");

    // กรองบิลที่อยู่ในสัญญาเช่าของโรงแรมนี้เท่านั้น
    const where: Record<string, any> = {
      contract: { hotelId }
    };
    if (contractId) where.contractId = contractId;
    if (status) where.status = status;

    const bills = await prisma.bill.findMany({
      where,
      include: {
        contract: {
          include: { room: true, tenant: true },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json({ data: bills, success: true });
  } catch (error) {
    console.error("[GET /api/bills]", error);
    return NextResponse.json({ message: "ไม่สามารถดึงข้อมูลบิลได้", success: false }, { status: 500 });
  }
}

// POST /api/bills - สร้างบิลรายเดือน
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    // ตรวจสอบสิทธิ์ (ผู้จัดการจอง/สัญญา หรือ แอดมินการเงิน)
    if (!member.permissions.canManageBookings) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์ในการจัดการออกบิล", success: false },
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
      contractId, month, year, rentAmount,
      waterCurrentUnit, waterPreviousUnit, waterAmount,
      electricCurrentUnit, electricPreviousUnit, electricAmount,
      otherCharges, otherChargesNote, dueDate
    } = body;

    if (!contractId || !month || !year || rentAmount === undefined) {
      return NextResponse.json({ message: "ข้อมูลไม่ครบถ้วน", success: false }, { status: 400 });
    }

    // ตรวจสอบว่าสัญญาเช่าเป็นของโรงแรมนี้จริงหรือไม่
    const contractExists = await prisma.contract.findFirst({
      where: { id: contractId, hotelId }
    });
    if (!contractExists) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลสัญญาเช่าในระบบของท่าน", success: false },
        { status: 404 }
      );
    }

    // Check if bill already exists for this month/year
    const existing = await prisma.bill.findFirst({
      where: { contractId, month: Number(month), year: Number(year) }
    });

    if (existing) {
      return NextResponse.json({ message: `บิลของเดือน ${month}/${year} ถูกสร้างไปแล้ว`, success: false }, { status: 409 });
    }

    const totalAmount = Number(rentAmount) + Number(waterAmount || 0) + Number(electricAmount || 0) + Number(otherCharges || 0);

    const bill = await prisma.bill.create({
      data: {
        contractId,
        month: Number(month),
        year: Number(year),
        rentAmount: Number(rentAmount),
        waterCurrentUnit: waterCurrentUnit ? Number(waterCurrentUnit) : null,
        waterPreviousUnit: waterPreviousUnit ? Number(waterPreviousUnit) : null,
        waterAmount: Number(waterAmount || 0),
        electricCurrentUnit: electricCurrentUnit ? Number(electricCurrentUnit) : null,
        electricPreviousUnit: electricPreviousUnit ? Number(electricPreviousUnit) : null,
        electricAmount: Number(electricAmount || 0),
        otherCharges: Number(otherCharges || 0),
        otherChargesNote: otherChargesNote || null,
        totalAmount,
        dueDate: new Date(dueDate),
        status: "UNPAID",
      },
      include: {
        contract: { include: { room: true, tenant: true } },
      },
    });

    return NextResponse.json({ data: bill, success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/bills]", error);
    return NextResponse.json({ message: "ไม่สามารถสร้างบิลได้", success: false }, { status: 500 });
  }
}
