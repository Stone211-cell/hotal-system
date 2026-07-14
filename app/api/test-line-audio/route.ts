import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { sendLineAudioToGuest, sendLineToGuest } from "@/lib/line-api";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Configure Cloudinary inline for testing purposes, or use env variables if available
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "t6l3szmz",
  api_key: process.env.CLOUDINARY_API_KEY || "188138577389244",
  api_secret: process.env.CLOUDINARY_API_SECRET || "GZF9BBKAzlzDprm3xbr9L2WtNGE",
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { message: "ต้องระบุข้อความ", success: false },
        { status: 400 }
      );
    }

    // ดึง lineUserId ของเจ้าของหอพัก
    const member = await prisma.hotelMember.findFirst({ where: { userId } });
    if (!member || !member.lineUserId) {
      return NextResponse.json(
        { message: "คุณยังไม่ได้ผูกบัญชี LINE สำหรับรับแจ้งเตือน", success: false },
        { status: 400 }
      );
    }
    const lineUserId = member.lineUserId;

    if (text.length > 200) {
      return NextResponse.json(
        { message: "ข้อความต้องมีความยาวไม่เกิน 200 ตัวอักษร", success: false },
        { status: 400 }
      );
    }

    // 1. Generate Google Translate TTS URL
    // client=tw-ob specifies the endpoint for better quality
    const encodedText = encodeURIComponent(text);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=th&client=tw-ob`;

    // 2. Upload to Cloudinary and convert to m4a
    const uploadResult = await cloudinary.uploader.upload(ttsUrl, {
      resource_type: "video", // Cloudinary treats audio as video
      format: "m4a",
      public_id: `test_audio_${Date.now()}`,
    });

    const m4aUrl = uploadResult.secure_url;
    // duration comes in seconds as a float, we need milliseconds as integer
    const durationMs = Math.max(Math.round((uploadResult.duration || 1) * 1000), 1000);

    // 3. Send text message first
    await sendLineToGuest(lineUserId, `[ทดสอบระบบเสียง AI]\nข้อความ: "${text}"\nกำลังส่งคลิปเสียงตามไปนะครับ...`);

    // 4. Send the actual voice message
    await sendLineAudioToGuest(lineUserId, m4aUrl, durationMs);

    return NextResponse.json({
      success: true,
      message: "ส่งคลิปเสียงสำเร็จ!",
      data: {
        text,
        m4aUrl,
        durationMs
      }
    });
  } catch (error: any) {
    console.error("[POST /api/test-line-audio]", error);
    return NextResponse.json(
      { message: error.message || "เกิดข้อผิดพลาดในการส่งเสียง", success: false },
      { status: 500 }
    );
  }
}
