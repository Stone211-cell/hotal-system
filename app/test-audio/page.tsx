"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Volume2, Loader2, Send } from "lucide-react";

export default function TestAudioPage() {
  const [lineUserId, setLineUserId] = useState("");
  const [text, setText] = useState("สวัสดีค่ะ บิลค่าเช่าเดือนนี้ยอดรวม 4,500 บาท ครบกำหนดวันที่ 5 นะคะ");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);

  const handleTest = async () => {
    if (!text) {
      alert("กรุณากรอกข้อความ");
      return;
    }

    if (text.length > 200) {
      alert("ข้อความต้องยาวไม่เกิน 200 ตัวอักษร");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/test-line-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ success: false, message: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-emerald-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl">ทดสอบระบบเสียง AI (LINE)</CardTitle>
              <CardDescription>ทดสอบส่งคลิปเสียงเข้าบัญชี LINE ของคุณ</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm border border-blue-200 dark:border-blue-800">
            ℹ️ ระบบจะส่งเสียงแจ้งเตือนไปยังบัญชี LINE ของคุณที่ได้ทำการผูกไว้ในหน้าตั้งค่าแล้วเท่านั้น
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ข้อความที่ต้องการให้ AI พูด</label>
            <Textarea 
              placeholder="พิมพ์ข้อความภาษาไทยที่นี่..." 
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={200}
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>* รองรับภาษาไทย (จำกัด 200 ตัวอักษร)</span>
              <span className={text.length > 200 ? "text-red-500 font-bold" : ""}>
                {text.length}/200
              </span>
            </div>
          </div>

          {result && (
            <div className={`p-4 rounded-lg text-sm border ${result.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
              <p className="font-semibold">{result.success ? "✅ สำเร็จ!" : "❌ ผิดพลาด"}</p>
              <p>{result.message}</p>
              {result.success && result.data && (
                <div className="mt-2 pt-2 border-t border-emerald-200/50 text-xs">
                  <p className="truncate"><strong>URL (m4a):</strong> {result.data.m4aUrl}</p>
                  <p><strong>Duration:</strong> {result.data.durationMs} ms</p>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
            size="lg"
            onClick={handleTest}
            disabled={isLoading || !text}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                กำลังส่งข้อมูล...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                ส่งทดสอบเข้า LINE
              </>
            )}
          </Button>

          <div className="relative my-4 w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-950 px-2 text-muted-foreground">หรือ</span>
            </div>
          </div>

          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
            size="lg"
            variant="outline"
            onClick={async () => {
              setIsLoading(true);
              try {
                const res = await fetch("/api/cron/monthly-report", {
                  headers: { "Authorization": "Bearer hotel-cron-secret-2025" }
                });
                const data = await res.json();
                setResult(data);
              } catch (err: any) {
                setResult({ success: false, message: "Error testing report" });
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "📊 ทดสอบส่ง Smart Report ของเดือนนี้"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
