"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Link2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";

type Status = "loading" | "success" | "error";

function LineLinkContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("กำลังตรวจสอบข้อมูล...");

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      // ผู้ใช้ยังไม่ได้ล็อกอิน (ปกติน่าจะโดนกันไว้โดย Clerk Middleware แล้ว แต่เผื่อหลุดมา)
      setStatus("error");
      setMessage("กรุณาล็อกอินเข้าระบบก่อนผูกบัญชี");
      return;
    }

    const lid = searchParams.get("lid");
    if (!lid) {
      setStatus("error");
      setMessage("ไม่พบข้อมูล LINE ID โปรดเข้าสู่หน้านี้ผ่านแอป LINE");
      return;
    }

    const linkAccount = async () => {
      try {
        setMessage("กำลังผูกบัญชี LINE กับผู้ใช้...");
        const res = await fetch("/api/line-owner-connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId: lid }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setStatus("success");
          setMessage("เชื่อมต่อบัญชี LINE สำหรับรับการแจ้งเตือนสำเร็จแล้ว!");
        } else {
          setStatus("error");
          // แสดงข้อความให้ชัดเจนถ้าเป็นกรณีหาบัญชีไม่เจอ
          if (res.status === 404) {
            setMessage("ไม่พบสิทธิ์เจ้าของ/พนักงานของอีเมลนี้ โปรดใช้อีเมลเดิมที่เคยสมัครไว้ (เช่น อีเมล Google ของคุณ)");
          } else {
            setMessage(data.message || "เกิดข้อผิดพลาดในการผูกบัญชี");
          }
        }
      } catch (err: any) {
        setStatus("error");
        setMessage("การเชื่อมต่อล้มเหลว กรุณาลองใหม่อีกครั้ง");
      }
    };

    linkAccount();
  }, [isLoaded, user, searchParams]);

  return (
    <div className="flex min-h-[80vh] w-full flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-blue-500">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
            <Link2 className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-xl">ตั้งค่าแจ้งเตือนผู้ดูแล</CardTitle>
          <CardDescription>ผูกบัญชี LINE กับบัญชีผู้ดูแลระบบของคุณ</CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400">ผูกบัญชีสำเร็จ!</p>
              <p className="text-sm text-center text-muted-foreground">{message}</p>
              
              <Button 
                onClick={() => router.push("/settings")}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700"
              >
                กลับไปหน้าตั้งค่าระบบ
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-2">
                <XCircle className="h-10 w-10" />
              </div>
              <p className="text-lg font-medium text-red-600 dark:text-red-400">เกิดข้อผิดพลาด</p>
              <p className="text-sm text-center text-muted-foreground">{message}</p>
              
              <Button 
                onClick={() => router.push("/settings")}
                variant="outline"
                className="mt-6 w-full"
              >
                กลับไปหน้าตั้งค่า
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LineLinkPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <LineLinkContent />
    </Suspense>
  );
}
