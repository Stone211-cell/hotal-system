import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { getCurrentMember } from "@/lib/authHelper";

export const dynamic = "force-dynamic";

// GET /api/dashboard - ดึงข้อมูลสรุปสำหรับหน้าหลัก
export async function GET(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member || !member.isActive) {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล", success: false },
        { status: 401 }
      );
    }

    const hotelId = member.hotelId;
    if (!hotelId) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลโรงแรมของท่าน", success: false },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // day | month | year
    const dateParam = searchParams.get("date");

    const date = dateParam ? new Date(dateParam) : new Date();
    let from: Date;
    let to: Date;

    if (period === "day") {
      from = startOfDay(date);
      to = endOfDay(date);
    } else if (period === "month") {
      from = startOfMonth(date);
      to = endOfMonth(date);
    } else {
      from = new Date(date.getFullYear(), 0, 1);
      to = new Date(date.getFullYear(), 11, 31, 23, 59, 59);
    }

    // สรุปห้องพักเฉพาะของโรงแรมนี้
    const [totalRooms, availableRooms, occupiedRooms, hotel] = await Promise.all([
      prisma.room.count({ where: { hotelId } }),
      prisma.room.count({ where: { hotelId, status: "AVAILABLE" } }),
      prisma.room.count({ where: { hotelId, status: "OCCUPIED" } }),
      prisma.hotel.findUnique({ where: { id: hotelId }, select: { name: true } }),
    ]);

    // รายรับและรายจ่ายในช่วงเวลา (ดูได้เฉพาะคนที่มีสิทธิ์ดูการเงิน)
    let totalIncome = 0;
    let totalExpense = 0;

    if (member.permissions.canViewFinance) {
      // รายรับ (payment ที่ชำระในช่วงเวลา)
      const payments = await prisma.payment.findMany({
        where: {
          booking: { hotelId },
          paidAt: { gte: from, lte: to },
        },
      });
      totalIncome = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

      // รายจ่ายในช่วงเวลา
      const expenses = await prisma.expense.findMany({
        where: {
          hotelId,
          date: { gte: from, lte: to },
        },
      });
      totalExpense = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    }

    // การจองในช่วงเวลาเฉพาะของโรงแรมนี้
    const bookings = await prisma.booking.findMany({
      where: {
        hotelId,
        createdAt: { gte: from, lte: to },
      },
      include: {
        room: { include: { roomType: true } },
        guest: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const totalBookings = await prisma.booking.count({
      where: { hotelId, createdAt: { gte: from, lte: to } },
    });

    const checkedInToday = await prisma.booking.count({
      where: {
        hotelId,
        status: "CHECKED_IN",
        actualCheckIn: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
      },
    });

    const checkingOutToday = await prisma.booking.count({
      where: {
        hotelId,
        status: "CHECKED_IN",
        checkOutDate: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
      },
    });

    // Occupancy rate
    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return NextResponse.json({
      data: {
        hotelName: hotel?.name || "โรงแรมของฉัน",
        member: {
          role: member.role,
          permissions: member.permissions,
        },
        rooms: {
          total: totalRooms,
          available: availableRooms,
          occupied: occupiedRooms,
          maintenance: totalRooms - availableRooms - occupiedRooms,
          occupancyRate,
        },
        finance: {
          totalIncome,
          totalExpense,
          netProfit: totalIncome - totalExpense,
          period: { from, to },
        },
        bookings: {
          total: totalBookings,
          recent: bookings,
          checkedInToday,
          checkingOutToday,
        },
      },
      success: true,
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json(
      { message: "ไม่สามารถดึงข้อมูล dashboard ได้", success: false },
      { status: 500 }
    );
  }
}
