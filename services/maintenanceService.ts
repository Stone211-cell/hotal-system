/**
 * services/maintenanceService.ts
 * ─────────────────────────────────────────────
 * สำหรับส่งคำขอจัดการบันทึกแจ้งซ่อมและรายงานทำความสะอาด
 * ใช้ axios ในการเรียก API ทั้งหมด
 * ─────────────────────────────────────────────
 */
import api from "@/lib/axios";

export type MaintenanceType = "CLEANING" | "REPAIR";
export type MaintenanceStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";

export interface Room {
  id: string;
  roomNumber: string;
  floor?: number | null;
  roomType: {
    id: string;
    name: string;
  };
}

export interface RoomMaintenance {
  id: string;
  hotelId: string;
  roomId: string;
  room: Room;
  title: string;
  description?: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  cost: number;
  reportedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceInput {
  roomId: string;
  title: string;
  description?: string;
  type: MaintenanceType;
  reportedBy?: string;
}

export interface UpdateMaintenanceInput {
  status?: MaintenanceStatus;
  description?: string;
  cost?: number;
  reportedBy?: string;
}

/**
 * ดึงรายการซ่อมแซมและทำความสะอาดทั้งหมด (กรองตามสถานะ, ประเภท หรือห้อง ได้)
 */
export async function getMaintenances(filters?: {
  status?: MaintenanceStatus;
  type?: MaintenanceType;
  roomId?: string;
}): Promise<RoomMaintenance[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.type) params.append("type", filters.type);
  if (filters?.roomId) params.append("roomId", filters.roomId);

  const url = `/api/maintenance${params.toString() ? `?${params.toString()}` : ""}`;
  const { data } = await api.get<{ data: RoomMaintenance[] }>(url);
  return data.data;
}

/**
 * สร้างรายการแจ้งซ่อมหรือทำความสะอาดห้องพัก
 */
export async function createMaintenance(input: CreateMaintenanceInput): Promise<RoomMaintenance> {
  const { data } = await api.post<{ data: RoomMaintenance }>("/api/maintenance", input);
  return data.data;
}

/**
 * อัปเดตรายการซ่อมหรือทำความสะอาด (เช่น ยืนยันซ่อมเสร็จ, เปลี่ยนแปลงค่าซ่อม)
 */
export async function updateMaintenance(
  id: string,
  input: UpdateMaintenanceInput
): Promise<RoomMaintenance> {
  const { data } = await api.put<{ data: RoomMaintenance }>(`/api/maintenance/${id}`, input);
  return data.data;
}

/**
 * ลบประวัติรายการซ่อม
 */
export async function deleteMaintenance(id: string): Promise<void> {
  await api.delete(`/api/maintenance/${id}`);
}
