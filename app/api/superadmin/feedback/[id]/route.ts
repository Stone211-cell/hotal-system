import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await getCurrentMember();
    // Only SuperAdmin can modify/delete feedbacks
    if (!member || !member.isSuperAdmin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const feedbackId = resolvedParams.id;
    if (!feedbackId) {
      return NextResponse.json({ success: false, message: "Missing feedback ID" }, { status: 400 });
    }

    await prisma.systemFeedback.delete({
      where: { id: feedbackId },
    });

    return NextResponse.json({ success: true, message: "Feedback deleted" });
  } catch (error: any) {
    console.error("Delete feedback error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete feedback" },
      { status: 500 }
    );
  }
}
