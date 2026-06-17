/**
 * services/bookingService.ts
 * ─────────────────────────────────────────────
 * รวม function ทุกอย่างที่เกี่ยวกับการจองไว้ที่นี่
 * ─────────────────────────────────────────────
 */
import api from "@/lib/axios";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED";
export type PaymentMethod = "CASH" | "TRANSFER" | "CREDIT_CARD" | "QR_CODE";

export interface GuestInput {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  idNumber?: string;
  nationality?: string;
}

export interface CreateBookingInput {
  roomId: string;
  guest: GuestInput;
  checkInDate: string; // ISO date string
  checkOutDate: string;
  pricePerNight: number;
  discountAmount?: number;
  notes?: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  roomId: string;
  room: {
    id: string;
    roomNumber: string;
    floor?: number;
    pricePerNight: number;
    roomType: { name: string };
  };
  guestId: string;
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    idNumber?: string;
  };
  checkInDate: string;
  checkOutDate: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  nights: number;
  pricePerNight: number;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  paidAt: string;
}

export interface CreatePaymentInput {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  note?: string;
}

export interface BookingFilters {
  status?: BookingStatus;
  roomId?: string;
  guestId?: string;
  from?: string;
  to?: string;
}

// ─── Bookings ────────────────────────────────

/** ดึงรายการการจองทั้งหมด */
export async function getBookings(filters?: BookingFilters): Promise<Booking[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.roomId) params.append("roomId", filters.roomId);
  if (filters?.guestId) params.append("guestId", filters.guestId);
  if (filters?.from) params.append("from", filters.from);
  if (filters?.to) params.append("to", filters.to);

  const { data } = await api.get<{ data: Booking[] }>(
    `/api/bookings${params.toString() ? `?${params.toString()}` : ""}`
  );
  return data.data;
}

/** ดึงข้อมูลการจองเดียว */
export async function getBookingById(id: string): Promise<Booking> {
  const { data } = await api.get<{ data: Booking }>(`/api/bookings/${id}`);
  return data.data;
}

/** สร้างการจองใหม่ */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const { data } = await api.post<{ data: Booking }>("/api/bookings", input);
  return data.data;
}

/** Check-in */
export async function checkInBooking(id: string): Promise<Booking> {
  const { data } = await api.put<{ data: Booking }>(`/api/bookings/${id}`, {
    status: "CHECKED_IN",
  });
  return data.data;
}

/** Check-out */
export async function checkOutBooking(id: string): Promise<Booking> {
  const { data } = await api.put<{ data: Booking }>(`/api/bookings/${id}`, {
    status: "CHECKED_OUT",
  });
  return data.data;
}

/** ยกเลิกการจอง */
export async function cancelBooking(id: string): Promise<Booking> {
  const { data } = await api.put<{ data: Booking }>(`/api/bookings/${id}`, {
    status: "CANCELLED",
  });
  return data.data;
}

/** อัพเดทการจอง (ส่วนลด, หมายเหตุ) */
export async function updateBooking(
  id: string,
  input: { discountAmount?: number; notes?: string }
): Promise<Booking> {
  const { data } = await api.put<{ data: Booking }>(`/api/bookings/${id}`, input);
  return data.data;
}

/** ลบการจอง */
export async function deleteBooking(id: string): Promise<void> {
  await api.delete(`/api/bookings/${id}`);
}

// ─── Payments ────────────────────────────────

/** บันทึกการชำระเงิน */
export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  const { data } = await api.post<{ data: Payment }>("/api/payments", input);
  return data.data;
}

/** ดึงรายการชำระเงิน */
export async function getPayments(bookingId?: string): Promise<Payment[]> {
  const url = bookingId ? `/api/payments?bookingId=${bookingId}` : "/api/payments";
  const { data } = await api.get<{ data: Payment[] }>(url);
  return data.data;
}
