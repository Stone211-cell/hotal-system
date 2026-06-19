import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface MemberPermissions {
  canManageRooms: boolean;
  canManageBookings: boolean;
  canViewFinance: boolean;
}

export interface CurrentMemberContext {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  memberId?: string;
  hotelId?: string;
  hotelName?: string;
  role?: "OWNER" | "STAFF";
  permissions: MemberPermissions;
  isActive: boolean;
}

/**
 * ดึงข้อมูลผู้ใช้ที่ล็อกอินอยู่พร้อมสิทธิ์ในการเข้าถึงและ ID ของโรงแรม
 */
export async function getCurrentMember(): Promise<CurrentMemberContext | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress;
    if (!email) return null;

    // ตรวจสอบว่าเป็น SuperAdmin ของระบบ SaaS หรือไม่ (ใช้สิทธิ์จาก privateMetadata.role หรือ IsAdmin หรือเป็นอีเมลแรกสุด)
    const isSuperAdmin =
      user.privateMetadata?.role === "super_admin" ||
      user.privateMetadata?.IsAdmin === "true" ||
      user.privateMetadata?.IsAdmin === true;

    if (isSuperAdmin) {
      const cookieStore = await cookies();
      const impersonatedHotelId = cookieStore.get("impersonatedHotelId")?.value;

      if (impersonatedHotelId) {
        // ดึงชื่อโรงแรมเพื่อใช้ใน UI
        const hotel = await prisma.hotel.findUnique({
          where: { id: impersonatedHotelId },
          select: { name: true },
        });

        if (hotel) {
          return {
            userId,
            email,
            isSuperAdmin: true,
            isActive: true,
            hotelId: impersonatedHotelId,
            hotelName: hotel.name,
            role: "OWNER",
            permissions: {
              canManageRooms: true,
              canManageBookings: true,
              canViewFinance: true,
            },
          };
        }
      }

      return {
        userId,
        email,
        isSuperAdmin: true,
        isActive: true,
        permissions: {
          canManageRooms: true,
          canManageBookings: true,
          canViewFinance: true,
        },
      };
    }

    // ตรวจสอบสมาชิกจากฐานข้อมูล เพื่อดูว่าสังกัดโรงแรมไหนและมียศใด
    const normalizedEmail = email.toLowerCase().trim();
    const member = await prisma.hotelMember.findFirst({
      where: { email: normalizedEmail },
      include: { hotel: true },
    });

    if (!member) {
      // ไม่มีข้อมูลสมาชิกในฐานข้อมูล (เพิ่งสมัครและรออนุมัติ)
      return {
        userId,
        email,
        isSuperAdmin: false,
        isActive: false,
        permissions: {
          canManageRooms: false,
          canManageBookings: false,
          canViewFinance: false,
        },
      };
    }

    // อัปเดต Clerk User ID ในฐานข้อมูลหากยังไม่ได้บันทึก
    if (!member.userId) {
      try {
        await prisma.hotelMember.update({
          where: { id: member.id },
          data: { userId },
        });
      } catch (updateErr) {
        console.error("[getCurrentMember] Failed to update userId:", updateErr);
      }
    }

    const isOwner = member.role === "OWNER";

    return {
      userId,
      email,
      isSuperAdmin: false,
      memberId: member.id,
      hotelId: member.hotelId,
      hotelName: member.hotel.name,
      role: member.role,
      isActive: member.isActive,
      permissions: {
        canManageRooms: isOwner ? true : member.canManageRooms,
        canManageBookings: isOwner ? true : member.canManageBookings,
        canViewFinance: isOwner ? true : member.canViewFinance,
      },
    };
  } catch (error) {
    console.error("[getCurrentMember] Error:", error);
    return null;
  }
}
