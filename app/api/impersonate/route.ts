import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";

export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();

    // ต้องเป็น SuperAdmin เท่านั้นถึงจะมีสิทธิ์สวมรอย
    if (!member?.isSuperAdmin) {
      return NextResponse.json(
        { success: false, message: "ไม่มีสิทธิ์ในการจัดการ" },
        { status: 403 }
      );
    }

    const { hotelId, action } = await request.json();

    const response = NextResponse.json({ success: true });

    if (action === "enter") {
      if (!hotelId) {
        return NextResponse.json({ success: false, message: "กรุณาระบุโรงแรม" }, { status: 400 });
      }
      // ตั้งค่า Cookie สำหรับสวมรอย ให้อยู่ได้ 1 วัน
      response.cookies.set("impersonatedHotelId", hotelId, {
        path: "/",
        maxAge: 60 * 60 * 24,
        httpOnly: true,
        sameSite: "lax",
      });
    } else if (action === "exit") {
      // ลบ Cookie ออกเพื่อกลับสู่โหมด SuperAdmin ปกติ
      response.cookies.delete("impersonatedHotelId");
    } else {
      return NextResponse.json({ success: false, message: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
    }

    return response;
  } catch (error) {
    console.error("[POST /api/impersonate]", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาดในการประมวลผล" },
      { status: 500 }
    );
  }
}
