import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from "date-fns";
import axios from "axios";

const LINE_API = "https://api.line.me/v2/bot/message/push";
const LINE_REPLY_API = "https://api.line.me/v2/bot/message/reply";
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "t6l3szmz",
  api_key: process.env.CLOUDINARY_API_KEY || "188138577389244",
  api_secret: process.env.CLOUDINARY_API_SECRET || "GZF9BBKAzlzDprm3xbr9L2WtNGE",
});

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${TOKEN}`,
};

export async function generateAndSendFinancialReport(
  hotelId: string, 
  lineUserId: string, 
  reportType: "monthly" | "weekly" | "daily" | "all" = "monthly",
  replyToken?: string
) {
  try {
    const now = new Date();
    let startDate: Date, endDate: Date;
    let title = "";

    if (reportType === "monthly") {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      title = `สรุปยอดประจำเดือน ${format(now, "MM/yyyy")}`;
    } else if (reportType === "weekly") {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      title = `สรุปยอดประจำสัปดาห์`;
    } else if (reportType === "daily") {
      // สำหรับรายวัน ใช้เวลา 00:00:00 ถึง 23:59:59 ของวันนี้
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
      title = `สรุปยอดประจำวันที่ ${format(startDate, "dd/MM/yyyy")}`;
    } else {
      // ทั้งหมด (all) ใช้ตั้งแต่อดีตจนถึงปัจจุบัน
      startDate = new Date(2000, 0, 1);
      endDate = new Date(2100, 0, 1);
      title = `สรุปยอดรายรับ-รายจ่ายทั้งหมด`;
    }

    // 1. คำนวณรายรับ (จาก Bill ที่จ่ายแล้ว)
    const paidBills = await prisma.bill.findMany({
      where: {
        contract: { hotelId },
        status: "PAID",
        paidAt: { gte: startDate, lte: endDate }
      }
    });
    
    // รายรับจากการจอง (Booking)
    const payments = await prisma.payment.findMany({
      where: {
        booking: { hotelId },
        paidAt: { gte: startDate, lte: endDate }
      }
    });

    const totalIncome = 
      paidBills.reduce((sum, bill) => sum + bill.totalAmount, 0) +
      payments.reduce((sum, pay) => sum + pay.amount, 0);

    // 2. คำนวณรายจ่าย (จาก Expense)
    const expenses = await prisma.expense.findMany({
      where: {
        hotelId,
        date: { gte: startDate, lte: endDate }
      }
    });
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const netProfit = totalIncome - totalExpense;

    // 3. สร้างกราฟรูปภาพ (QuickChart)
    const chartConfig = {
      type: "bar",
      data: {
        labels: ["รายรับ", "รายจ่าย", "กำไรสุทธิ"],
        datasets: [{
          label: title,
          data: [totalIncome, totalExpense, netProfit],
          backgroundColor: [
            "rgba(52, 211, 153, 0.8)", // Green
            "rgba(248, 113, 113, 0.8)", // Red
            "rgba(96, 165, 250, 0.8)"  // Blue
          ]
        }]
      },
      options: {
        plugins: {
          datalabels: { anchor: "end", align: "top", font: { weight: "bold", size: 14 } }
        }
      }
    };
    
    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=600&h=400&bkg=white`;

    // 4. สร้างเสียง AI
    const voiceText = `สวัสดีค่ะ นี่คือรายงาน ${title} รายรับรวม ${totalIncome.toLocaleString()} บาท รายจ่าย ${totalExpense.toLocaleString()} บาท กำไรสุทธิ ${netProfit.toLocaleString()} บาทค่ะ`;
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(voiceText)}&tl=th&client=tw-ob`;
    
    const uploadResult = await cloudinary.uploader.upload(ttsUrl, {
      resource_type: "video",
      format: "m4a",
      public_id: `report_audio_${hotelId}_${Date.now()}`,
    });
    const m4aUrl = uploadResult.secure_url;
    const durationMs = Math.max(Math.round((uploadResult.duration || 1) * 1000), 1000);

    // 5. เตรียม Flex Message
    const textMessage = `📊 *${title}*\n\n✅ รายรับ: ฿${totalIncome.toLocaleString()}\n❌ รายจ่าย: ฿${totalExpense.toLocaleString()}\n💰 กำไรสุทธิ: ฿${netProfit.toLocaleString()}`;
    
    const messages = [
      {
        type: "image",
        originalContentUrl: chartUrl,
        previewImageUrl: chartUrl
      },
      {
        type: "text",
        text: textMessage
      },
      {
        type: "audio",
        originalContentUrl: m4aUrl,
        duration: durationMs
      }
    ];

    // 6. ส่งเข้า LINE (ถ้ามี replyToken ให้ใช้ Reply API เพื่อตอบกลับแชท, ถ้าไม่มีให้ Push)
    if (replyToken) {
      await axios.post(LINE_REPLY_API, { replyToken, messages }, { headers });
    } else {
      await axios.post(LINE_API, { to: lineUserId, messages }, { headers });
    }

    return { success: true, textMessage, chartUrl, m4aUrl };

  } catch (error) {
    console.error("[Report Service Error]:", error);
    return { success: false, error };
  }
}
