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
          if (userMessage.includes("รายรับรายเดือน") || userMessage.includes("รายเดือน") || userMessage.includes("สรุปยอดเดือน")) {
            const member = await prisma.hotelMember.findFirst({ where: { lineUserId } });
            if (member && member.hotelId) {
              await generateAndSendFinancialReport(member.hotelId, lineUserId, "monthly", replyToken);
              continue;
            }
          } else if (userMessage.includes("รายอาทิตย์") || userMessage.includes("รายสัปดาห์") || userMessage.includes("สรุปยอดสัปดาห์")) {
            const member = await prisma.hotelMember.findFirst({ where: { lineUserId } });
            if (member && member.hotelId) {
              await generateAndSendFinancialReport(member.hotelId, lineUserId, "weekly", replyToken);
              continue;
            }
          } else if (userMessage.includes("รายรับรายวัน") || userMessage.includes("รายวัน") || userMessage.includes("ยอดวันนี้")) {
            const member = await prisma.hotelMember.findFirst({ where: { lineUserId } });
            if (member && member.hotelId) {
              await generateAndSendFinancialReport(member.hotelId, lineUserId, "daily", replyToken);
              continue;
            }
          } else if (userMessage.includes("รายรับทั้งหมด") || userMessage.includes("ยอดทั้งหมด") || userMessage.includes("สรุปยอดทั้งหมด")) {
            const member = await prisma.hotelMember.findFirst({ where: { lineUserId } });
            if (member && member.hotelId) {
              await generateAndSendFinancialReport(member.hotelId, lineUserId, "all", replyToken);
              continue;
            }
          }

          // ตรวจสอบคำสั่ง "ผูกบัญชี [รหัส]"
          if (userMessage.startsWith("ผูกบัญชี ")) {
            const code = userMessage.replace("ผูกบัญชี ", "").trim().toLowerCase();
            if (code.length === 6) {
              // ค้นหาบัญชีที่ลงท้ายด้วยรหัส 6 หลัก (case insensitive สำหรับ CUID ปกติเป็นตัวพิมพ์เล็ก)
              const members = await prisma.hotelMember.findMany();
              const matchedMember = members.find(m => m.id.slice(-6).toLowerCase() === code);
              
              if (matchedMember) {
                await prisma.hotelMember.update({
                  where: { id: matchedMember.id },
                  data: { lineUserId: lineUserId }
                });
                await replyLine(replyToken, "✅ ผูกบัญชี LINE สำเร็จแล้ว!\n\nจากนี้ไประบบจะส่งรายงานรายเดือน และการแจ้งเตือนต่างๆ ให้คุณผ่านช่องทางนี้ครับ");
                continue;
              } else {
                await replyLine(replyToken, "❌ รหัสผูกบัญชีไม่ถูกต้อง หรือหาบัญชีไม่พบ\n\nโปรดตรวจสอบรหัสจากหน้า 'ตั้งค่า' บนเว็บไซต์อีกครั้งครับ");
                continue;
              }
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
