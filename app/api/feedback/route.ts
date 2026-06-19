import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

// POST /api/feedback - ส่งข้อคิดเห็น/คำแนะนำหรือแจ้งปัญหาถึง SuperAdmin (เจ้าของระบบ SaaS)
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    const body = await request.json();
    const { subject, message, email: inputEmail } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { message: "กรุณากรอกหัวข้อและข้อความข้อคิดเห็นของท่าน", success: false },
        { status: 400 }
      );
    }

    // ใช้อีเมลจากบัญชีที่เข้าสู่ระบบ หรือใช้อีเมลที่ผู้ใช้กรอกเข้ามา
    const senderEmail = member?.email || inputEmail;
    if (!senderEmail) {
      return NextResponse.json(
        { message: "ไม่พบอีเมลของท่าน กรุณาระบุอีเมลสำหรับติดต่อกลับ", success: false },
        { status: 400 }
      );
    }

    const feedback = await prisma.systemFeedback.create({
      data: {
        userId: member?.userId || null,
        email: senderEmail.toLowerCase(),
        subject,
        message,
      },
    });

    // ส่งอีเมลไปยังแอดมินหลัก
    const adminEmail = process.env.FEEDBACK_ADMIN_EMAIL;
    if (adminEmail && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"Hotel System Feedback" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `[Feedback] ${subject}`,
          text: `มีข้อความ Feedback ใหม่เข้าสู่ระบบ:\n\nจาก: ${senderEmail}\nหัวข้อ: ${subject}\nข้อความ:\n${message}`,
        });
      } catch (err) {
        console.error("[Email Sending Error]", err);
      }
    }

    return NextResponse.json({ data: feedback, success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/feedback]", error);
    return NextResponse.json(
      { message: "ไม่สามารถส่งข้อคิดเห็นได้ในขณะนี้", success: false },
      { status: 500 }
    );
  }
}
