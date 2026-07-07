import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineToGuest, sendLineToAdmin } from "@/lib/line-api";

export const dynamic = "force-dynamic";

// GET /api/cron/send-bills
// ระบบนี้จะถูกเรียกอัตโนมัติทุกวันตอน 08:00 น. (ไทย) โดย Vercel Cron
// หรือเรียกเองได้ผ่าน Postman/ทดสอบโดยส่ง Header: x-cron-secret: hotel-cron-secret-2025
export async function GET(request: NextRequest) {
  // ตรวจสอบว่าเรียกจากระบบที่ถูกต้อง
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // วันที่กำหนดแจ้งเตือนล่วงหน้า (3 วันก่อนถึงกำหนด)
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + 3);

    // ดึงบิลที่ยังค้างชำระและกำหนดชำระอยู่ภายใน 3 วันข้างหน้า หรือ เลยกำหนดแล้ว
    const unpaidBills = await prisma.bill.findMany({
      where: {
        status: { in: ["UNPAID", "OVERDUE"] },
        dueDate: { lte: reminderDate },
      },
      include: {
        contract: {
          include: {
            tenant: true,   // ข้อมูลลูกค้า (Guest) รวม lineUserId
            room: true,
            hotel: true,
          },
        },
      },
    });

    let sentCount = 0;
    let skippedCount = 0;

    for (const bill of unpaidBills) {
      const tenant = bill.contract.tenant;
      const room = bill.contract.room;
      const hotel = bill.contract.hotel;
      const dueDate = bill.dueDate.toLocaleDateString("th-TH");
      const isOverdue = bill.status === "OVERDUE";

      const message =
        `${isOverdue ? "⚠️ บิลค้างชำระ!" : "📋 แจ้งเตือนค่าเช่า"}\n` +
        `\n` +
        `👤 คุณ${tenant.firstName} ${tenant.lastName}\n` +
        `🏠 ห้อง ${room.roomNumber} — ${hotel.name}\n` +
        `📅 กำหนดชำระ: ${dueDate}\n` +
        `💰 ยอดรวม: ${bill.totalAmount.toLocaleString()} บาท\n` +
        `\n` +
        (isOverdue
          ? `❗ บิลนี้เลยกำหนดชำระแล้ว กรุณาชำระโดยด่วนครับ`
          : `กรุณาชำระก่อนวันที่กำหนดครับ 🙏`);

      if (tenant.lineUserId) {
        // ส่งไปหาลูกค้าโดยตรง
        await sendLineToGuest(tenant.lineUserId, message);
        sentCount++;
      } else {
        // ลูกค้ายังไม่ได้เชื่อม LINE — แจ้ง Admin แทน
        await sendLineToAdmin(
          `📋 เตือน: ${tenant.firstName} ${tenant.lastName} (ห้อง ${room.roomNumber}) ` +
          `ค้างชำระ ${bill.totalAmount.toLocaleString()} บาท กำหนด ${dueDate}\n` +
          `⚠️ ลูกค้ายังไม่ได้เชื่อม LINE`
        );
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: unpaidBills.length,
        sentToLine: sentCount,
        notifiedAdmin: skippedCount,
      },
    });
  } catch (error) {
    console.error("[Cron send-bills] Error:", error);
    return NextResponse.json({ message: "Internal Server Error", success: false }, { status: 500 });
  }
}
