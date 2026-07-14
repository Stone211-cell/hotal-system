"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Link2 } from "lucide-react";

declare global {
  interface Window {
    liff: any;
  }
}

type Status = "loading" | "success" | "error";

export default function OwnerLineConnectPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("กำลังเชื่อมต่อระบบ LINE...");
  const [ownerName, setOwnerName] = useState("");
  const [profileImage, setProfileImage] = useState("");

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID!;

    if (!liffId) {
      setStatus("error");
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

        const profile = await window.liff.getProfile();
        const lineUserId: string = profile.userId;

        const res = await fetch("/api/line-owner-connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setOwnerName(profile.displayName);
          setProfileImage(profile.pictureUrl || "");
          setStatus("success");
          setMessage("ผูกบัญชี LINE สำหรับรับแจ้งเตือนสำเร็จแล้ว!");
        } else {
          setStatus("error");
          setMessage(data.message || "เกิดข้อผิดพลาดในการผูกบัญชี");
        }
      } catch (err: any) {
        console.error("[Owner LIFF] Error:", err);
        setStatus("error");
        setMessage(err.message || "ไม่สามารถเชื่อมต่อกับ LINE ได้");
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
        boxSizing: "border-box",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px",
          padding: "32px 24px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Link2 style={{ width: "32px", height: "32px", color: "white" }} />
          </div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "700",
              color: "white",
              margin: "0 0 8px",
            }}
          >
            ตั้งค่าแจ้งเตือน LINE
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", margin: "0" }}>
            เชื่อมต่อบัญชี LINE ของคุณเพื่อรับแจ้งเตือนจากระบบ
          </p>
        </div>

        {/* Loading State */}
        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(59,130,246,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Loader2
                style={{
                  width: "32px",
                  height: "32px",
                  color: "#3b82f6",
                  animation: "spin 1s linear infinite",
                }}
              />
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "15px", margin: "0" }}>
              {message}
            </p>
          </div>
        )}

        {/* Success State */}
        {status === "success" && (
          <div style={{ textAlign: "center" }}>
            {profileImage && (
              <img
                src={profileImage}
                alt="LINE Profile"
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  margin: "0 auto 16px",
                  border: "3px solid #10b981",
                  display: "block",
                }}
              />
            )}
            <div
              style={{
                width: "48px",
                height: "48px",
                background: "rgba(16,185,129,0.15)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: profileImage ? "0 auto 12px" : "0 auto 16px",
              }}
            >
              <CheckCircle2 style={{ width: "28px", height: "28px", color: "#10b981" }} />
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#10b981", margin: "0 0 8px" }}>
              เชื่อมต่อสำเร็จ! 🎉
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", margin: "0 0 8px" }}>
              {message}
            </p>
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "13px",
                margin: "0 0 24px",
                background: "rgba(255,255,255,0.05)",
                padding: "8px 16px",
                borderRadius: "12px",
              }}
            >
              LINE: <strong style={{ color: "white" }}>{ownerName}</strong>
            </p>

            <button
              onClick={() => window.liff?.closeWindow()}
              style={{
                width: "100%",
                padding: "14px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "white",
                border: "none",
                borderRadius: "14px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ปิดหน้าต่างนี้
            </button>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                background: "rgba(239,68,68,0.15)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <XCircle style={{ width: "32px", height: "32px", color: "#ef4444" }} />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#ef4444", margin: "0 0 8px" }}>
              เกิดข้อผิดพลาด
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", margin: "0 0 24px" }}>
              {message}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                width: "100%",
                padding: "14px",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ลองอีกครั้ง
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
