"use client";

import { useEffect, useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";

declare global {
  interface Window {
    liff: any;
  }
}

export default function OwnerLineConnectPage() {
  const [message, setMessage] = useState("กำลังเชื่อมต่อ LINE...");
  const [readyUrl, setReadyUrl] = useState("");

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

        // เตรียม URL สำหรับเปิดในเบราว์เซอร์ภายนอก
        const targetUrl = `${window.location.origin}/line/link?lid=${lineUserId}`;
        setReadyUrl(targetUrl);
        setMessage(""); // ซ่อนข้อความโหลด
        
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

  const handleOpenExternal = () => {
    try {
      if (window.liff && window.liff.openWindow) {
        window.liff.openWindow({ url: readyUrl, external: true });
      } else {
        window.location.href = readyUrl;
      }
    } catch (e) {
      console.error(e);
      window.location.href = readyUrl;
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        fontFamily: "'Noto Sans Thai', 'Sarabun', sans-serif",
      }}
    >
      <div style={{ textAlign: "center", width: "100%", maxWidth: "320px" }}>
        
        {readyUrl ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ 
              background: "rgba(255,255,255,0.1)", 
              padding: "24px", 
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.2)"
            }}>
              <h2 style={{ color: "white", fontSize: "20px", marginBottom: "12px", fontWeight: "bold" }}>
                เชื่อมต่อสำเร็จบางส่วน!
              </h2>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", lineHeight: "1.5", marginBottom: "20px" }}>
                เพื่อความปลอดภัยและการล็อกอินที่สมบูรณ์ (โดยเฉพาะผู้ที่ใช้ Google Login) กรุณากดปุ่มด้านล่างเพื่อเปิดหน้าต่างในเบราว์เซอร์หลักของคุณ
              </p>
              <button 
                onClick={handleOpenExternal}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  background: "#00B900",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(0, 185, 0, 0.3)"
                }}
              >
                <ExternalLink size={20} />
                เปิดในเบราว์เซอร์หลัก
              </button>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
