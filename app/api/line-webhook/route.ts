import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { replyLine } from "@/lib/line-api";
import { KEYWORD_REPLIES, DEFAULT_REPLY } from "@/lib/line-keywords";

export const dynamic = "force-dynamic";

// ตรวจสอบ Signature จาก LINE (ป้องกันคนส่งข้อมูลปลอม)
function verifySignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET || "";
  if (!channelSecret) return true; // ถ้ายังไม่ตั้งค่า ให้ผ่านไปก่อน
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

// POST /api/line-webhook - รับ event จาก LINE
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-line-signature") || "";

    // ตรวจสอบว่า request มาจาก LINE จริงๆ
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const events = body.events || [];

    // วนลูปจัดการทุก event ที่เข้ามา
    for (const event of events) {
      // รองรับเฉพาะ event ประเภท message ที่เป็น text เท่านั้น
      if (event.type !== "message" || event.message?.type !== "text") continue;

      const userMessage: string = event.message.text.trim().toLowerCase();
      const replyToken: string = event.replyToken;

      // ค้นหาคีย์เวิร์ดที่ตรงกัน (ค้นหาแบบ includes เพื่อรองรับประโยคยาวๆ)
      const matched = KEYWORD_REPLIES.find((item) =>
        userMessage.includes(item.keyword.toLowerCase())
      );

      const replyText = matched ? matched.reply : DEFAULT_REPLY;

      // ส่งข้อความตอบกลับ
      await replyLine(replyToken, replyText);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[LINE Webhook] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

// GET /api/line-webhook - Verify webhook (LINE ใช้ตรวจสอบ)
export async function GET() {
  return NextResponse.json({ status: "LINE Webhook OK" });
}
