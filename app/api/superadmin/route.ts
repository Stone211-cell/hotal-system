import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

// GET /api/superadmin - ดึงรายการข้อมูลรวมของ SaaS (โรงแรมทั้งหมด, ข้อคิดเห็นทั้งหมด)
export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isSuperAdmin) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์เข้าถึงข้อมูลหลังบ้านระบบ SaaS", success: false },
        { status: 403 }
      );
    }

    // ดึงโรงแรมทั้งหมดพร้อมสถิติห้องพักและอีเมลเจ้าของหลัก
    const hotels = await prisma.hotel.findMany({
      include: {
        _count: { select: { rooms: true } },
        members: {
          where: { role: "OWNER" },
          select: { email: true, name: true, userId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ดึงประวัติข้อคิดเห็นทั้งหมดจากระบบ
    const feedbacks = await prisma.systemFeedback.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: {
        hotels,
        feedbacks,
      },
      success: true,
    });
  } catch (error) {
    console.error("[GET /api/superadmin]", error);
    return NextResponse.json(
      { message: "ไม่สามารถดึงข้อมูลระบบได้", success: false },
      { status: 500 }
    );
  }
}

// POST /api/superadmin - สร้างโรงแรมใหม่ (และผูกบัญชีแอดมินคนแรก)
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isSuperAdmin) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการสร้างโรงแรมใหม่ในฐานะผู้ดูแลระบบระบบ", success: false },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      ownerEmail,
      ownerName,
      rentAmount,
      subscriptionStatus,
      overdueMonths,
      logoUrl,
    } = body;

    if (!name || !ownerEmail) {
      return NextResponse.json(
        { message: "กรุณาระบุชื่อโรงแรมและอีเมลสำหรับเปิดสิทธิ์ของเจ้าของโรงแรม", success: false },
        { status: 400 }
      );
    }

    // ตรวจสอบสิทธิ์ว่าเจ้าของอีเมลนี้เคยลงทะเบียนโรงแรมอื่นไปแล้วหรือไม่
    const existingMember = await prisma.hotelMember.findUnique({
      where: { email: ownerEmail.toLowerCase().trim() },
    });

    if (existingMember) {
      return NextResponse.json(
        { message: "อีเมลเจ้าของโรงแรมนี้ถูกใช้เปิดสิทธิ์โรงแรมอื่นอยู่ในระบบแล้ว", success: false },
        { status: 409 }
      );
    }

    // ทำรายการแบบ Transaction
    const hotel = await prisma.$transaction(async (tx: any) => {
      const h = await tx.hotel.create({
        data: {
          name,
          description: description || null,
          logoUrl: logoUrl || null,
          rentAmount: Number(rentAmount) || 0,
          subscriptionStatus: subscriptionStatus || "TRIAL",
          overdueMonths: overdueMonths ? Number(overdueMonths) : 0,
        },
      });

      await tx.hotelMember.create({
        data: {
          hotelId: h.id,
          email: ownerEmail.toLowerCase().trim(),
          name: ownerName || "Owner",
          role: "OWNER",
          isActive: true,
          canManageRooms: true,
          canManageBookings: true,
          canViewFinance: true,
        },
      });

      return h;
    });

    return NextResponse.json({ data: hotel, success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/superadmin]", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดในการสร้างโรงแรมใหม่", success: false },
      { status: 500 }
    );
  }
}
