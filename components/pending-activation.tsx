"use client";

import { useState } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut, CheckCircle2, Send, Loader2, Building2, ChevronRight, ChevronLeft, Hotel, Info } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";

interface PendingActivationProps {
  email: string;
  firstName?: string;
  lastName?: string;
}

const ROOM_OPTIONS = [
  { label: "2–10 ห้องพัก", value: "2-10", icon: "🏠" },
  { label: "11–20 ห้องพัก", value: "11-20", icon: "🏨" },
  { label: "21–50 ห้องพัก", value: "21-50", icon: "🏢" },
  { label: "มากกว่า 50 ห้อง", value: "50+", icon: "🏙️" },
];

export function PendingActivation({ email, firstName = "", lastName = "" }: PendingActivationProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [roomCount, setRoomCount] = useState("");

  // Step 2 fields
  const [name, setName] = useState(`${firstName} ${lastName}`.trim());
  const [contactEmail, setContactEmail] = useState(email);
  const [hotelName, setHotelName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSelectRoom = (value: string) => {
    setRoomCount(value);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("กรุณาระบุชื่อ-นามสกุล");
      return;
    }
    if (!phone) {
      toast.error("กรุณาระบุเบอร์โทรติดต่อ");
      return;
    }
    if (!contactEmail) {
      toast.error("กรุณาระบุอีเมลติดต่อกลับ");
      return;
    }
    if (!hotelName) {
      toast.error("กรุณาระบุชื่อโรงแรมของท่าน");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/api/feedback", {
        subject: `[สมัครใช้งาน] ${hotelName} — ${roomCount} ห้อง`,
        message: `ชื่อผู้ติดต่อ: ${name}\nอีเมล: ${contactEmail}\nเบอร์โทร: ${phone}\nจำนวนห้องพัก: ${roomCount}\nรายละเอียดเพิ่มเติม: ${message}`,
        email: contactEmail,
      });

      if (res.data.success) {
        setSubmitted(true);
        toast.success("ส่งข้อมูลคำขอสำเร็จแล้ว!");
      } else {
        toast.error(res.data.message || "เกิดข้อผิดพลาดในการส่งข้อมูล");
      }
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">ขั้นตอนที่ {step} จาก 2</span>
          <div className="flex gap-1.5">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 w-12 rounded-full transition-all",
                  s <= step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-lg">
        <Card className="border border-border/40 bg-background/70 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-8 md:p-10 flex flex-col items-center">
            {/* Logo */}
            <div className="h-16 w-16 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mb-5">
              <Hotel className="h-8 w-8 text-primary" />
            </div>

            {/* Badges */}
            <div className="flex items-center gap-3 mb-5">
              <span className="flex items-center gap-1 text-xs text-primary font-medium bg-primary/10 px-3 py-1 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> ทดลองใช้ฟรี 14 วัน
              </span>
              <span className="flex items-center gap-1 text-xs text-primary font-medium bg-primary/10 px-3 py-1 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> ยกเลิกได้ทุกเมื่อ
              </span>
            </div>

            {!submitted ? (
              <>
                {step === 1 ? (
                  /* ===== STEP 1: เลือกจำนวนห้อง ===== */
                  <div className="w-full">
                    <h1 className="text-2xl font-bold tracking-tight mb-2 text-center">
                      ชมสาธิตระบบ Hotel SaaS
                    </h1>
                    <p className="text-muted-foreground text-sm mb-7 text-center leading-relaxed">
                      เพื่อเริ่มต้น โปรดเลือกจำนวนห้องที่คุณบริหาร
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {ROOM_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleSelectRoom(opt.value)}
                          className={cn(
                            "group flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all",
                            "hover:border-primary hover:bg-primary/5 hover:shadow-md",
                            "focus:outline-none focus:ring-2 focus:ring-primary",
                            "border-border bg-background/50"
                          )}
                        >
                          <div className="h-11 w-11 rounded-xl bg-primary text-white flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <span className="text-sm font-semibold">{opt.label}</span>
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ===== STEP 2: กรอกข้อมูล ===== */
                  <div className="w-full">
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
                    >
                      <ChevronLeft className="h-3 w-3" /> กลับไปเลือกจำนวนห้อง
                    </button>

                    <h1 className="text-2xl font-bold tracking-tight mb-1 text-center">
                      ข้อมูลการติดต่อ
                    </h1>
                    <p className="text-muted-foreground text-sm mb-6 text-center">
                      บัญชีของคุณ{" "}
                      <span className="font-semibold text-foreground">{email}</span>{" "}
                      เข้าสู่ระบบสำเร็จแล้ว รอการอนุมัติจากผู้ดูแลระบบ
                    </p>

                    {/* Info badge */}
                    <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-xl p-3 mb-5 text-xs text-yellow-800 dark:text-yellow-200 leading-relaxed shadow-sm">
                      <Info className="h-4 w-4 shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                      <span>กรุณากรอกข้อมูลให้ครบถ้วน ทีมงานจะติดต่อกลับเพื่อเปิดสิทธิ์ใช้งานให้ท่านโดยเร็วที่สุด</span>
                    </div>

                    <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="name" className="text-xs">ชื่อ-นามสกุล *</Label>
                          <Input
                            id="name"
                            placeholder="เช่น สมชาย ใจดี"
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            className="h-10 rounded-xl"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone" className="text-xs">เบอร์โทรศัพท์ *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="089-xxxxxxx"
                            value={phone}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                            className="h-10 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="contact-email" className="text-xs">อีเมลติดต่อกลับ *</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          value={contactEmail}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactEmail(e.target.value)}
                          className="h-10 rounded-xl"
                        />
                        <p className="text-xs text-muted-foreground">ดึงมาจากบัญชีที่ล็อกอิน แก้ไขได้</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="hotel-name" className="text-xs">ชื่อโรงแรม / ที่พัก *</Label>
                        <Input
                          id="hotel-name"
                          placeholder="เช่น โรงแรมสวีทพลาซ่า"
                          value={hotelName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHotelName(e.target.value)}
                          className="h-10 rounded-xl"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="req-message" className="text-xs">ข้อความเพิ่มเติม (ไม่บังคับ)</Label>
                        <Textarea
                          id="req-message"
                          placeholder="สอบถามราคา หรือรายละเอียดเพิ่มเติม..."
                          value={message}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                          className="min-h-[70px] rounded-xl resize-none"
                        />
                      </div>

                      {/* Selected room count badge */}
                      <div className="flex items-center gap-2 text-xs bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                        <Building2 className="h-4 w-4 text-primary shrink-0" />
                        <span>จำนวนห้องที่เลือก: <strong>{roomCount} ห้อง</strong></span>
                        <button type="button" onClick={() => setStep(1)} className="ml-auto text-primary underline hover:no-underline">เปลี่ยน</button>
                      </div>

                      <Button type="submit" disabled={submitting} className="w-full h-11 rounded-xl mt-1">
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
                  </div>
                )}
              </>
            ) : (
              /* ===== SUCCESS STATE ===== */
              <div className="w-full flex flex-col items-center text-center">
                <div className="h-20 w-20 bg-green-100 dark:bg-green-950/30 flex items-center justify-center rounded-full mb-5">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">ส่งคำขอสำเร็จแล้ว!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
                  เราได้รับข้อมูลของท่านแล้ว ทีมงานจะรีบตรวจสอบและเปิดสิทธิ์การใช้งานให้ท่านทางอีเมล <strong>{contactEmail}</strong> โดยเร็วที่สุดครับ
                </p>
                <div className="w-full bg-muted/40 rounded-2xl p-4 text-left text-xs space-y-1.5 mb-6">
                  <p><span className="text-muted-foreground">ชื่อ:</span> {name}</p>
                  <p><span className="text-muted-foreground">โรงแรม:</span> {hotelName}</p>
                  <p><span className="text-muted-foreground">จำนวนห้อง:</span> {roomCount}</p>
                  <p><span className="text-muted-foreground">เบอร์ติดต่อ:</span> {phone}</p>
                </div>
              </div>
            )}

            {/* Logout button */}
            <div className="w-full mt-4">
              <SignOutButton>
                <Button className="w-full h-10 text-sm font-medium rounded-xl" variant="outline">
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
