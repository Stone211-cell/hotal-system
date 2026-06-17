"use client";

import { useState } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, LogOut, CheckCircle2, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

interface PendingActivationProps {
  email: string;
}

export function PendingActivation({ email }: PendingActivationProps) {
  const [hotelName, setHotelName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelName) {
      toast.error("กรุณาระบุชื่อโรงแรมของท่าน");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `สมัครใช้งานระบบใหม่: ${hotelName}`,
          message: `เบอร์โทรติดต่อ: ${phone}\nรายละเอียดเพิ่มเติม: ${message}`,
          email,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        toast.success("ส่งข้อมูลคำขอสำเร็จแล้ว!");
      } else {
        toast.error(data.message || "เกิดข้อผิดพลาดในการส่งข้อมูล");
      }
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-tr from-muted/40 via-background to-muted/40 p-4">
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg">
        <Card className="border border-border/40 bg-background/50 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden transition-all hover:shadow-primary/5">
          <CardContent className="p-8 md:p-10 flex flex-col items-center">
            {/* Header Icon */}
            <div className="h-16 w-16 bg-primary/10 text-primary flex items-center justify-center rounded-full mb-6">
              <ShieldAlert className="h-8 w-8 text-primary" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight mb-2 text-center">
              ยินดีต้อนรับสู่ Hotel SaaS Portal
            </h1>

            <p className="text-muted-foreground text-sm mb-6 text-center leading-relaxed">
              บัญชีของคุณ <span className="font-semibold text-foreground">{email}</span> เข้าสู่ระบบสำเร็จแล้ว แต่ยังไม่ได้รับการเปิดสิทธิ์การใช้งานจากผู้ดูแลระบบ
            </p>

            {submitted ? (
              <div className="w-full bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 p-6 rounded-2xl mb-6 flex flex-col items-center text-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <h3 className="font-semibold text-sm">ส่งคำขอสมัครใช้งานสำเร็จแล้ว!</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  เราได้รับข้อมูลโรงแรมของท่านแล้ว ทีมงานผู้ดูแลระบบจะรีบตรวจสอบและเปิดสิทธิ์การใช้งานให้คุณทางอีเมลโดยเร็วที่สุด
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="w-full space-y-4 border rounded-2xl p-5 bg-background/30 backdrop-blur mb-6">
                <h3 className="text-sm font-semibold mb-2">ส่งคำขอเปิดสิทธิ์ใช้งานระบบ:</h3>
                
                <div className="space-y-1.5">
                  <Label htmlFor="hotel-name" className="text-xs">ชื่อโรงแรม / โครงการ *</Label>
                  <Input
                    id="hotel-name"
                    placeholder="เช่น โรงแรมสวีทพลาซ่า"
                    value={hotelName}
                    onChange={(e: any) => setHotelName(e.target.value)}
                    required
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone-number" className="text-xs">เบอร์โทรศัพท์ติดต่อกลับ *</Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    placeholder="เช่น 089-xxxxxxx"
                    value={phone}
                    onChange={(e: any) => setPhone(e.target.value)}
                    required
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="req-message" className="text-xs">ข้อความถึงผู้ดูแลระบบ (ระบุรายละเอียดสิทธิ์ที่ต้องการ)</Label>
                  <Textarea
                    id="req-message"
                    placeholder="ระบุจำนวนห้อง หรือรายละเอียดเพิ่มเติมที่คุณต้องการสอบถาม..."
                    value={message}
                    onChange={(e: any) => setMessage(e.target.value)}
                    className="min-h-[80px] rounded-xl resize-none"
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full h-10 rounded-xl mt-2">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังส่งข้อมูล...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      ส่งข้อมูลคำขอเปิดใช้งาน
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Logout button */}
            <div className="w-full">
              <SignOutButton>
                <Button className="w-full h-11 text-sm font-medium rounded-xl" variant="outline">
                  <LogOut className="mr-2 h-4 w-4" />
                  ออกจากระบบ / เข้าสู่ระบบด้วยบัญชีอื่น
                </Button>
              </SignOutButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
