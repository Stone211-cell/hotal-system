import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authHelper";
import { sendLineToAdmin } from "@/lib/line-api";

export const dynamic = "force-dynamic";

// GET /api/maintenance - ดึงข้อมูลแจ้งซ่อมและทำความสะอาดทั้งหมด
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
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const roomId = searchParams.get("roomId");

    // สร้างตัวกรองข้อมูล
    const where: Record<string, any> = { hotelId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (roomId) where.roomId = roomId;

    const list = await prisma.roomMaintenance.findMany({
      where,
      include: {
        room: {
          include: { roomType: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ data: list, success: true });
  } catch (error) {
    console.error("[GET /api/maintenance]", error);
    return NextResponse.json(
      { message: "ไม่สามารถดึงข้อมูลแจ้งซ่อมได้", success: false },
      { status: 500 }
    );
  }
}

// POST /api/maintenance - สร้างรายการแจ้งซ่อม / รายงานทำความสะอาด
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { roomId, title, description, type, reportedBy } = body;

    if (!roomId || !title || !type) {
      return NextResponse.json(
        { message: "กรุณาระบุห้องพัก หัวข้อ และประเภทของรายการ", success: false },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าห้องเป็นของโรงแรมนี้จริงหรือไม่
    const roomExists = await prisma.room.findFirst({
      where: { id: roomId, hotelId }
    });

    if (!roomExists) {
      return NextResponse.json(
        { message: "ไม่พบห้องพักนี้ในระบบของท่าน", success: false },
        { status: 404 }
      );
    }

    // สร้างรายการแจ้งซ่อม/ทำความสะอาด
    const record = await prisma.roomMaintenance.create({
      data: {
        hotelId,
        roomId,
        title,
        description: description || null,
        type,
        status: "PENDING",
        reportedBy: reportedBy || member.email,
        cost: 0,
      },
      include: {
        room: { include: { roomType: true } }
      }
    });

    // หากเป็นประเภทซ่อมแซม (REPAIR) ให้ปรับสถานะห้องพักเป็น MAINTENANCE อัตโนมัติ
    if (type === "REPAIR") {
      await prisma.room.update({
        where: { id: roomId },
        data: { status: "MAINTENANCE" }
      });
    }

    // 🔔 แจ้งเตือนเจ้าของโรงแรมผ่าน LINE
    const typeLabel = type === 'REPAIR' ? '🔧 แจ้งซ่อม' : '🧹 ทำความสะอาด';
    await sendLineToAdmin(
      `${typeLabel} มีรายการใหม่!
` +
      `🚪 ห้อง: ${record.room.roomNumber}
` +
      `📌 หัวข้อ: ${title}` +
      (description ? `
📝 รายละเอียด: ${description}` : '') +
      (reportedBy ? `
👤 แจ้งโดย: ${reportedBy}` : '')
    );

    return NextResponse.json({ data: record, success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/maintenance]", error);
    return NextResponse.json(
      { message: "ไม่สามารถบันทึกรายการแจ้งซ่อมได้", success: false },
      { status: 500 }
    );
  }
}
