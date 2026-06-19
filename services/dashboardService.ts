/**
 * services/dashboardService.ts
 * ─────────────────────────────────────────────
 * รวม function สรุปข้อมูลสำหรับ Dashboard
 * ─────────────────────────────────────────────
 */
import api from "@/lib/axios";

export type Period = "day" | "month" | "year";

export interface DashboardData {
  isSuperAdmin?: boolean;
  member?: {
    role: "OWNER" | "STAFF";
    permissions: {
      canManageRooms: boolean;
      canManageBookings: boolean;
      canViewFinance: boolean;
    };
  };
  rooms: {
    total: number;
    available: number;
    occupied: number;
    maintenance: number;
    occupancyRate: number;
  };
  finance: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    period: { from: string; to: string };
  };
  bookings: {
    total: number;
    recent: RecentBooking[];
    checkedInToday: number;
    checkingOutToday: number;
  };
}

export interface RecentBooking {
  id: string;
  bookingNumber: string;
  room: { roomNumber: string; roomType: { name: string } };
  guest: { firstName: string; lastName: string };
  checkInDate: string;
  checkOutDate: string;
  status: string;
  finalAmount: number;
  paymentStatus: string;
}

export interface Expense {
  id: string;
  bookingId?: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  createdAt: string;
}

export interface CreateExpenseInput {
  bookingId?: string;
  type?: string;
  category: string;
  description: string;
  amount: number;
  date?: string;
}

/** ดึงรายจ่าย */
export async function getDashboard(
  period: Period = "month",
  date?: string
): Promise<DashboardData> {
  const params = new URLSearchParams({ period });
  if (date) params.append("date", date);
  const { data } = await api.get<{ data: DashboardData }>(
    `/api/dashboard?${params.toString()}`
  );
  return data.data;
}

/** ดึงรายจ่าย */
export async function getExpenses(filters?: {
  from?: string;
  to?: string;
  category?: string;
  type?: string;
}): Promise<Expense[]> {
  const params = new URLSearchParams();
  if (filters?.from) params.append("from", filters.from);
  if (filters?.to) params.append("to", filters.to);
  if (filters?.category) params.append("category", filters.category);
  if (filters?.type) params.append("type", filters.type);

  const { data } = await api.get<{ data: Expense[] }>(
    `/api/expenses${params.toString() ? `?${params.toString()}` : ""}`
  );
  return data.data;
}

/** บันทึกรายจ่าย */
export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const { data } = await api.post<{ data: Expense }>("/api/expenses", input);
  return data.data;
}
