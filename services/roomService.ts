/**
 * services/roomService.ts
 * ─────────────────────────────────────────────
 * รวม function ทุกอย่างที่เกี่ยวกับห้องพักไว้ที่นี่
 * ใช้ axios ยิง API ทุก request
 * ─────────────────────────────────────────────
 */
import api from "@/lib/axios";

export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";

export interface RoomType {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  createdAt: string;
  updatedAt: string;
  _count?: { rooms: number };
}

export interface Room {
  id: string;
  roomNumber: string;
  floor?: number;
  roomTypeId: string;
  roomType: RoomType;
  pricePerNight: number;
  status: RoomStatus;
  description?: string;
  amenities: string[];
  maxGuests: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  bookings?: Booking[];
  contracts?: any[];
}

export interface Booking {
  id: string;
  guest: Guest;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  finalAmount: number;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  idNumber?: string;
  address?: string;
}

export interface CreateRoomInput {
  roomNumber: string;
  floor?: number;
  roomTypeId: string;
  pricePerNight: number;
  description?: string;
  amenities?: string[];
  maxGuests?: number;
  notes?: string;
}

export interface UpdateRoomInput extends Partial<CreateRoomInput> {
  status?: RoomStatus;
}

export interface CreateRoomTypeInput {
  name: string;
  description?: string;
  basePrice: number;
}

// ─── Room Types ─────────────────────────────

/** ดึงประเภทห้องทั้งหมด */
export async function getRoomTypes(): Promise<RoomType[]> {
  const { data } = await api.get<{ data: RoomType[] }>("/api/room-types");
  return data.data;
}

/** เพิ่มประเภทห้องใหม่ */
export async function createRoomType(input: CreateRoomTypeInput): Promise<RoomType> {
  const { data } = await api.post<{ data: RoomType }>("/api/room-types", input);
  return data.data;
}

/** แก้ไขประเภทห้อง */
export async function updateRoomType(id: string, input: Partial<CreateRoomTypeInput>): Promise<RoomType> {
  const { data } = await api.put<{ data: RoomType }>(`/api/room-types/${id}`, input);
  return data.data;
}

/** ลบประเภทห้อง */
export async function deleteRoomType(id: string): Promise<void> {
  await api.delete(`/api/room-types/${id}`);
}

// ─── Rooms ──────────────────────────────────

/** ดึงรายการห้องทั้งหมด (กรองได้) */
export async function getRooms(filters?: {
  status?: RoomStatus;
  roomTypeId?: string;
}): Promise<Room[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.roomTypeId) params.append("roomTypeId", filters.roomTypeId);

  const { data } = await api.get<{ data: Room[] }>(
    `/api/rooms${params.toString() ? `?${params.toString()}` : ""}`
  );
  return data.data;
}

/** ดึงข้อมูลห้องเดียว */
export async function getRoomById(id: string): Promise<Room> {
  const { data } = await api.get<{ data: Room }>(`/api/rooms/${id}`);
  return data.data;
}

/** เพิ่มห้องใหม่ */
export async function createRoom(input: CreateRoomInput): Promise<Room> {
  const { data } = await api.post<{ data: Room }>("/api/rooms", input);
  return data.data;
}

/** แก้ไขห้อง */
export async function updateRoom(id: string, input: UpdateRoomInput): Promise<Room> {
  const { data } = await api.put<{ data: Room }>(`/api/rooms/${id}`, input);
  return data.data;
}

/** ลบห้อง */
export async function deleteRoom(id: string): Promise<void> {
  await api.delete(`/api/rooms/${id}`);
}

/** เปลี่ยนสถานะห้อง */
export async function updateRoomStatus(id: string, status: RoomStatus): Promise<Room> {
  return updateRoom(id, { status });
}
