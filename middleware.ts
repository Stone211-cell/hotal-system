import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// กำหนด routes ที่ไม่ต้องล็อกอิน (สาธารณะ)
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/line(.*)",              // หน้า LIFF ทั้งหมด (ผูกบัญชี ฯลฯ)
  "/api/line-webhook(.*)", // LINE Webhook (LINE ส่งมาโดยตรง ไม่มี session)
  "/api/cron(.*)",         // Cron jobs (Vercel เรียกเอง)
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
