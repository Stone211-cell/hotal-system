import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { replyLine } from "@/lib/line-api";
import { KEYWORD_REPLIES, DEFAULT_REPLY } from "@/lib/line-keywords";
import { generateAndSendFinancialReport } from "@/lib/report-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function verifySignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET || "";
  if (!channelSecret) return true;
  const hash = crypto.createHmac("sha256", channelSecret).update(body).digest("base64");
  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-line-signature") || "";

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (body.events && body.events.length > 0) {
      for (const event of body.events) {
        if (event.type === "message" && event.message.type === "text") {
          const userMessage = event.message.text.trim();
          const replyToken = event.replyToken;
          const lineUserId = event.source.userId;

          // ตรวจสอบคำสั่งเรียกดูรายงาน (เฉพาะเจ้าของหอพักเท่านั้น)
          if (userMessage.includes("รายรับรายเดือน") || userMessage.includes("รายเดือน") || userMessage.includes("สรุปยอด")) {
            // ค้นหาว่าเป็นเจ้าของหอพักไหน
            const member = await prisma.hotelMember.findFirst({ where: { lineUserId } });
            if (member && member.hotelId) {
              await generateAndSendFinancialReport(member.hotelId, lineUserId, "monthly", replyToken);
              continue;
            }
          }

          if (userMessage.includes("รายอาทิตย์") || userMessage.includes("รายสัปดาห์")) {
            const member = await prisma.hotelMember.findFirst({ where: { lineUserId } });
            if (member && member.hotelId) {
              await generateAndSendFinancialReport(member.hotelId, lineUserId, "weekly", replyToken);
              continue;
            }
          }

          // ถ้าไม่ใช่คำสั่งรายงาน ให้ตอบกลับตาม Keyword ปกติ
          let replyText = DEFAULT_REPLY;
          for (const item of KEYWORD_REPLIES) {
            if (userMessage.includes(item.keyword)) {
              replyText = item.reply;
              break;
            }
          }
          await replyLine(replyToken, replyText);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[LINE Webhook] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "LINE Webhook OK" });
}
