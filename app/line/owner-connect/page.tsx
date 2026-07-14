"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    liff: any;
  }
}

export default function OwnerLineConnectPage() {
  const [message, setMessage] = useState("กำลังเชื่อมต่อ LINE...");

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID!;

    if (!liffId) {
      setMessage("ยังไม่ได้ตั้งค่า LIFF ID ในระบบ");
      return;
    }

    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.onload = async () => {
      try {
        await window.liff.init({ liffId });

        if (!window.liff.isLoggedIn()) {
          window.liff.login({ redirectUri: window.location.href });
          return;
        }

        // ดึงโปรไฟล์ LINE ของเจ้าของหอ
        setMessage("กำลังเตรียมข้อมูล...");
        const profile = await window.liff.getProfile();
        const lineUserId: string = profile.userId;

        // เปลี่ยนหน้าไปยังเว็บหลักของเรา โดยบังคับเปิดใน External Browser (Chrome/Safari)
        // เพื่อแก้ปัญหา Google OAuth ถูกบล็อกใน LINE
        const targetUrl = `${window.location.origin}/line/link?lid=${lineUserId}`;
        window.liff.openWindow({ url: targetUrl, external: true });
        
        // ปิดหน้าต่าง LIFF ตัวเดิมทิ้งไป
        window.liff.closeWindow();
      } catch (err: any) {
        console.error("[Owner LIFF] Error:", err);
        setMessage("ไม่สามารถเชื่อมต่อกับ LINE ได้");
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        fontFamily: "'Noto Sans Thai', 'Sarabun', sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <Loader2
          style={{
            width: "48px",
            height: "48px",
            color: "#3b82f6",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "16px", margin: "0" }}>
          {message}
        </p>
      </div>
    </div>
  );
}
