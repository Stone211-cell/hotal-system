import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/line-connect
// รับ lineUserId และ guestId แล้วบันทึกลงฐานข้อมูล
// เรียกใช้จากหน้า LIFF page หลังจากที่ LINE Login สำเร็จ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lineUserId, guestId, hotelId } = body;

    if (!lineUserId || !guestId || !hotelId) {
      return NextResponse.json(
        { message: "ข้อมูลไม่ครบ", success: false },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า Guest นี้มีอยู่ในระบบและอยู่ในโรงแรมที่ถูกต้อง
    const guest = await prisma.guest.findFirst({
      where: { id: guestId, hotelId },
    });

    if (!guest) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลลูกค้าในระบบ", success: false },
        { status: 404 }
      );
    }

    // บันทึก lineUserId ลงในฐานข้อมูล
    const updated = await prisma.guest.update({
      where: { id: guestId },
      data: { lineUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        lineUserId: true,
      },
    });

    return NextResponse.json({
      message: "เชื่อมต่อบัญชี LINE สำเร็จ!",
      data: updated,
      success: true,
    });
  } catch (error) {
    console.error("[POST /api/line-connect] Error:", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง", success: false },
      { status: 500 }
    );
  }
}
