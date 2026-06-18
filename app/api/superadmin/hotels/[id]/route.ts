import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await getCurrentMember();
    // Only SuperAdmin can modify hotel billing/status
    if (!member || !member.isSuperAdmin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const hotelId = resolvedParams.id;
    if (!hotelId) {
      return NextResponse.json({ success: false, message: "Missing hotel ID" }, { status: 400 });
    }

    const body = await req.json();
    const { rentAmount, isPaidThisMonth, subscriptionStatus, name } = body;

    const dataToUpdate: any = {};
    if (rentAmount !== undefined) dataToUpdate.rentAmount = parseFloat(rentAmount);
    if (isPaidThisMonth !== undefined) dataToUpdate.isPaidThisMonth = Boolean(isPaidThisMonth);
    if (subscriptionStatus !== undefined) dataToUpdate.subscriptionStatus = subscriptionStatus;
    if (name !== undefined) dataToUpdate.name = name;

    const updatedHotel = await prisma.hotel.update({
      where: { id: hotelId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, hotel: updatedHotel });
  } catch (error: any) {
    console.error("Update hotel error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update hotel" },
      { status: 500 }
    );
  }
}
