import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

// GET /api/members - ดึงรายการพนักงานทั้งหมดในโรงแรม
export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    // เฉพาะเจ้าของโรงแรม (OWNER) เท่านั้นที่มีสิทธิ์เข้าจัดการสมาชิกทีม
    if (member.role !== "OWNER") {
      return NextResponse.json(
        { message: "สิทธิ์การเข้าถึงข้อมูลนี้เฉพาะเจ้าของโรงแรม (OWNER) เท่านั้น", hotelName: member.hotelName, success: false },
        { status: 403 }
      );
    }

    const members = await prisma.hotelMember.findMany({
      where: { hotelId: member.hotelId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: members, hotelName: member.hotelName, success: true });
  } catch (error) {
    console.error("[GET /api/members]", error);
    return NextResponse.json(
      { message: "ไม่สามารถดึงข้อมูลทีมงานได้", success: false },
      { status: 500 }
    );
  }
}

// POST /api/members - เพิ่มพนักงานใหม่เข้าสู่โรงแรม
export async function POST(request: NextRequest) {
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
        { message: "เฉพาะเจ้าของโรงแรม (OWNER) เท่านั้นที่เพิ่มพนักงานได้", success: false },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, name, role, canManageRooms, canManageBookings, canViewFinance } = body;

    if (!email) {
      return NextResponse.json(
        { message: "กรุณาระบุอีเมลของพนักงาน", success: false },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าอีเมลพนักงานซ้ำในระบบหรือไม่
    const existing = await prisma.hotelMember.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { message: "อีเมลนี้มีอยู่ในระบบแล้ว (อาจผูกอยู่กับโรงแรมอื่น)", success: false },
        { status: 409 }
      );
    }

    const newMember = await prisma.hotelMember.create({
      data: {
        hotelId: member.hotelId!,
        email: email.toLowerCase().trim(),
        name: name || null,
        role: role === "OWNER" ? "OWNER" : "STAFF",
        isActive: true,
        canManageRooms: !!canManageRooms,
        canManageBookings: canManageBookings !== undefined ? !!canManageBookings : true,
        canViewFinance: !!canViewFinance,
      },
    });

    return NextResponse.json({ data: newMember, success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/members]", error);
    return NextResponse.json(
      { message: "ไม่สามารถเพิ่มพนักงานได้", success: false },
      { status: 500 }
    );
  }
}
