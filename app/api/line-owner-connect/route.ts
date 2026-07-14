import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { lineUserId } = body;

    if (!lineUserId) {
      return NextResponse.json({ success: false, message: "Missing lineUserId" }, { status: 400 });
    }

    // อัปเดตข้อมูล lineUserId ให้กับ HotelMember ที่ตรงกับ Clerk userId
    const member = await prisma.hotelMember.findFirst({
      where: { userId }
    });

    if (!member) {
      return NextResponse.json({ success: false, message: "ไม่พบบัญชีพนักงาน/เจ้าของในระบบ" }, { status: 404 });
    }

    const updatedMember = await prisma.hotelMember.update({
      where: { id: member.id },
      data: { lineUserId }
    });

    return NextResponse.json({
      success: true,
      message: "ผูกบัญชี LINE เรียบร้อยแล้ว",
      data: updatedMember
    });
  } catch (error: any) {
    console.error("[LINE Owner Connect Error]:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
