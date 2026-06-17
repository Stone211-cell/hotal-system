import { clerkMiddleware } from "@clerk/nextjs/server";

// ให้ Clerk ทำงานเพื่ออ่านค่า Session แต่ไม่ต้องบังคับรีไดเรกต์ (auth.protect)
// เพื่อให้เราสามารถจัดหน้าต่างล็อกอิน/ไม่มีสิทธิ์เองได้อย่างอิสระ
export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
