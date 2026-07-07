"use client";

import { useEffect, useState } from "react";

// =========================================================
// หน้า LIFF สำหรับเชื่อมต่อบัญชี LINE กับข้อมูลผู้เช่า
// URL: https://liff.line.me/2010629520-Fu9pRVsX?guestId=xxx&hotelId=xxx
//
// ขั้นตอน:
// 1. ดึง guestId และ hotelId จาก URL params
// 2. โหลด LIFF SDK และ login ด้วย LINE
// 3. ดึง lineUserId ของลูกค้าอัตโนมัติ
// 4. ส่งข้อมูลไปบันทึกที่ /api/line-connect
// =========================================================

declare global {
  interface Window {
    liff: any;
  }
}

type Status = "loading" | "success" | "error" | "already_linked";

export default function LineConnectPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("กำลังโหลด...");
  const [guestName, setGuestName] = useState("");

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID!;

    // ดึง params จาก URL
    const params = new URLSearchParams(window.location.search);
    const guestId = params.get("guestId");
    const hotelId = params.get("hotelId");

    if (!guestId || !hotelId) {
      setStatus("error");
      setMessage("ลิงค์ไม่ถูกต้อง กรุณาขอลิงค์ใหม่จากเจ้าหน้าที่");
      return;
    }

    // โหลด LIFF SDK แล้ว init
    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.onload = async () => {
      try {
        await window.liff.init({ liffId });

        // ถ้ายังไม่ได้ login ให้ redirect ไป LINE login
        if (!window.liff.isLoggedIn()) {
          window.liff.login({ redirectUri: window.location.href });
          return;
        }

        // ดึงโปรไฟล์ LINE ของลูกค้า
        const profile = await window.liff.getProfile();
        const lineUserId: string = profile.userId;

        // ส่งข้อมูลไปบันทึก
        const res = await fetch("/api/line-connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId, guestId, hotelId }),
        });

        const data = await res.json();

        if (data.success) {
          setGuestName(`${data.data.firstName} ${data.data.lastName}`);
          setStatus("success");
          setMessage("เชื่อมต่อบัญชี LINE สำเร็จ!");
        } else {
          setStatus("error");
          setMessage(data.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
        }
      } catch (err) {
        console.error("[LIFF] Error:", err);
        setStatus("error");
        setMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    };
    document.head.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-6">
        {/* LINE Logo */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-[#06C755] rounded-2xl flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 100 100" className="w-12 h-12 fill-white">
              <path d="M96 42.5C96 20.8 74.6 3 48 3S0 20.8 0 42.5c0 19.3 17.1 35.5 40.2 38.6 1.6.3 3.7.9 4.2 2.2.5 1.1.3 2.8.2 4l-.7 4c-.2 1.1-.9 4.4 3.9 2.4 4.7-2 25.6-15.1 34.9-25.8C89.4 60.9 96 52.2 96 42.5z" />
              <path
                d="M79 35.6h-3.9c-.6 0-1 .5-1 1v24.2c0 .6.5 1 1 1H79c.6 0 1-.5 1-1V36.6c0-.5-.4-1-1-1zM68.3 35.6h-3.9c-.6 0-1 .5-1 1v14.4L51.2 36.2c0-.1-.1-.1-.1-.2l-.1-.1-.1-.1h-.1l-.1-.1H47c-.6 0-1 .5-1 1v24.2c0 .6.5 1 1 1h3.9c.6 0 1-.5 1-1V46.5l12.2 15.4c.1.2.3.3.5.3h.1l.2.1H68.3c.6 0 1-.5 1-1V36.6c0-.5-.4-1-1-1zM38.4 56.8H27.7V36.6c0-.6-.5-1-1-1h-3.9c-.6 0-1 .5-1 1v24.2c0 .3.1.5.3.7.2.2.4.3.7.3h15.6c.6 0 1-.5 1-1v-3.9c0-.6-.4-1.1-1-1.1zM20.9 42.5h10.6c.6 0 1-.5 1-1v-3.9c0-.6-.5-1-1-1H20.9c-.6 0-1 .5-1 1v3.9c0 .6.4 1 1 1zm0 9.7h10.6c.6 0 1-.5 1-1v-3.9c0-.6-.5-1-1-1H20.9c-.6 0-1 .5-1 1v3.9c0 .5.4 1 1 1z"
                fill="#06C755"
              />
            </svg>
          </div>
        </div>

        {status === "loading" && (
          <>
            <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-600 font-medium">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-5xl">✅</div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">เชื่อมต่อสำเร็จ!</h1>
              {guestName && (
                <p className="text-gray-500 mt-1 text-sm">สวัสดี คุณ{guestName}</p>
              )}
              <p className="text-gray-600 mt-3 text-sm leading-relaxed">
                บัญชี LINE ของคุณเชื่อมต่อกับระบบเรียบร้อยแล้ว
                คุณจะได้รับการแจ้งเตือนบิลรายเดือนผ่าน LINE โดยตรง 🎉
              </p>
            </div>
            <button
              onClick={() => window.liff?.closeWindow()}
              className="w-full bg-[#06C755] text-white py-3 rounded-2xl font-semibold text-base hover:bg-green-600 transition"
            >
              ปิดหน้าต่าง
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-5xl">❌</div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">เกิดข้อผิดพลาด</h1>
              <p className="text-gray-500 mt-2 text-sm">{message}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-semibold text-base hover:bg-gray-200 transition"
            >
              ลองใหม่
            </button>
          </>
        )}
      </div>
    </div>
  );
}
