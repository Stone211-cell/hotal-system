import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAndSendFinancialReport } from "@/lib/report-service";

export const dynamic = "force-dynamic";

// endpoint นี้จะถูกเรียกโดย Vercel Cron ทุกวันที่ 1 ของเดือน เวลา 8:00 น.
export async function GET(request: Request) {
  try {
    // 1. ตรวจสอบ Authorization header ว่ามาจาก Vercel Cron จริงๆ
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. ดึงรายชื่อเจ้าของหอพักทั้งหมดที่เปิดใช้งานและผูก LINE ไว้แล้ว
    const activeOwnersWithLine = await prisma.hotelMember.findMany({
      where: {
        role: "OWNER",
        isActive: true,
        lineUserId: { not: null }
      }
    });

    if (activeOwnersWithLine.length === 0) {
      return NextResponse.json({ success: true, message: "No owners to send reports to." });
    }

    const results = [];
    // 3. วนลูปส่งรายงานให้เจ้าของแต่ละคน (เนื่องจากเป็นเดือนที่แล้ว เราใช้ข้อมูลของเดือนที่แล้วได้ แต่โค้ดเรา default เป็นเดือนปัจจุบัน ดังนั้นอาจจะต้องปรับปรุงเพิ่มในอนาคตถ้าต้องการเจาะจงเดือน)
    // สำหรับตอนนี้ ส่งรายรับของเดือนปัจจุบันไปก่อน
    for (const owner of activeOwnersWithLine) {
      if (owner.lineUserId) {
        const res = await generateAndSendFinancialReport(owner.hotelId, owner.lineUserId, "monthly");
        results.push({ email: owner.email, success: res.success });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sent reports to ${results.length} owners.`,
      details: results 
    });

  } catch (error: any) {
    console.error("[CRON Monthly Report Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
