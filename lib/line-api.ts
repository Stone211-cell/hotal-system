import axios from "axios";

const LINE_API = "https://api.line.me/v2/bot/message/push";
const LINE_REPLY_API = "https://api.line.me/v2/bot/message/reply";
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${TOKEN}`,
};

/**
 * ส่งข้อความไปหาเจ้าของโรงแรม (Admin) เท่านั้น
 * ใช้สำหรับแจ้งเตือนเมื่อมีการจองใหม่, แจ้งซ่อม, ชำระเงิน ฯลฯ
 */
export async function sendLineToAdmin(message: string): Promise<void> {
  const adminUserId = process.env.LINE_ADMIN_USER_ID;
  if (!adminUserId || !TOKEN) return;

  try {
    await axios.post(
      LINE_API,
      {
        to: adminUserId,
        messages: [{ type: "text", text: message }],
      },
      { headers }
    );
  } catch (err: any) {
    console.error("[LINE Admin Notify] Error:", err?.response?.data || err.message);
  }
}

/**
 * ส่งข้อความไปหาลูกค้า/ผู้เช่าโดยตรง (ต้องมี lineUserId แล้วเท่านั้น)
 * ใช้สำหรับแจ้งบิลรายเดือน ฯลฯ
 */
export async function sendLineToGuest(lineUserId: string, message: string): Promise<void> {
  if (!lineUserId || !TOKEN) return;

  try {
    await axios.post(
      LINE_API,
      {
        to: lineUserId,
        messages: [{ type: "text", text: message }],
      },
      { headers }
    );
  } catch (err: any) {
    console.error("[LINE Guest Notify] Error:", err?.response?.data || err.message);
  }
}

/**
 * ส่งข้อความเสียงไปหาลูกค้า/ผู้เช่าโดยตรง
 * originalContentUrl ต้องเป็น URL ของไฟล์ .m4a และเป็น https
 */
export async function sendLineAudioToGuest(lineUserId: string, originalContentUrl: string, durationMs: number = 60000): Promise<void> {
  if (!lineUserId || !TOKEN) return;

  try {
    await axios.post(
      LINE_API,
      {
        to: lineUserId,
        messages: [
          { 
            type: "audio", 
            originalContentUrl: originalContentUrl,
            duration: durationMs
          }
        ],
      },
      { headers }
    );
  } catch (err: any) {
    console.error("[LINE Guest Audio Notify] Error:", err?.response?.data || err.message);
  }
}

/**
 * ตอบกลับข้อความ (ใช้ใน Webhook)
 * replyToken ได้มาจาก LINE Webhook event
 */
export async function replyLine(replyToken: string, message: string): Promise<void> {
  if (!TOKEN) return;

  try {
    await axios.post(
      LINE_REPLY_API,
      {
        replyToken,
        messages: [{ type: "text", text: message }],
      },
      { headers }
    );
  } catch (err: any) {
    console.error("[LINE Reply] Error:", err?.response?.data || err.message);
  }
}
