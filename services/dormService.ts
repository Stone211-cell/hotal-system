/**
 * services/dormService.ts
 * ─────────────────────────────────────────────
 * รวม function การจัดการหอพัก (สัญญา, บิล)
 * ─────────────────────────────────────────────
 */
import api from "@/lib/axios";
import { Room, Guest } from "./roomService"; // Reuse some types

export type ContractStatus = "ACTIVE" | "EXPIRED" | "TERMINATED";
export type BillStatus = "UNPAID" | "PAID" | "OVERDUE";
export type PaymentMethod = "CASH" | "TRANSFER" | "CREDIT_CARD" | "QR_CODE";

export interface Contract {
  id: string;
  contractNumber: string;
  roomId: string;
  room: Room;
  tenantId: string;
  tenant: Guest;
  startDate: string;
  endDate: string;
  paymentDueDay: number;
  depositAmount: number;
  rentAmount: number;
  status: ContractStatus;
  notes?: string;
  createdAt: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  contractId: string;
  contract: Contract;
  month: number;
  year: number;
  rentAmount: number;
  waterCurrentUnit?: number;
  waterPreviousUnit?: number;
  waterAmount: number;
  electricCurrentUnit?: number;
  electricPreviousUnit?: number;
  electricAmount: number;
  otherCharges: number;
  otherChargesNote?: string;
  totalAmount: number;
  dueDate: string;
  status: BillStatus;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  createdAt: string;
}

export interface CreateContractInput {
  roomId: string;
  tenant: {
    id?: string;
    firstName: string;
    lastName: string;
    phone: string;
    idNumber?: string;
    address?: string;
  };
  startDate: string;
  endDate: string;
  paymentDueDay: number;
  depositAmount: number;
  rentAmount: number;
  notes?: string;
}

export interface CreateBillInput {
  contractId: string;
  month: number;
  year: number;
  rentAmount: number;
  waterCurrentUnit?: number;
  waterPreviousUnit?: number;
  waterAmount: number;
  electricCurrentUnit?: number;
  electricPreviousUnit?: number;
  electricAmount: number;
  otherCharges?: number;
  otherChargesNote?: string;
  dueDate: string;
}

// ─── Contracts ────────────────────────────────
export async function getContracts(filters?: { status?: ContractStatus; roomId?: string }): Promise<Contract[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.roomId) params.append("roomId", filters.roomId);
  const { data } = await api.get<{ data: Contract[] }>(`/api/contracts${params.toString() ? `?${params.toString()}` : ""}`);
  return data.data;
}

export async function createContract(input: CreateContractInput): Promise<Contract> {
  const { data } = await api.post<{ data: Contract }>("/api/contracts", input);
  return data.data;
}

export async function updateContract(id: string, input: CreateContractInput & { saveHistory?: boolean }): Promise<Contract> {
  const { data } = await api.put<{ data: Contract }>(`/api/contracts/${id}`, input);
  return data.data;
}

export async function updateContractStatus(id: string, status: ContractStatus, notes?: string): Promise<Contract> {
  const { data } = await api.put<{ data: Contract }>(`/api/contracts/${id}`, { status, notes });
  return data.data;
}

// ─── Bills ────────────────────────────────────
export async function getBills(filters?: { contractId?: string; status?: BillStatus }): Promise<Bill[]> {
  const params = new URLSearchParams();
  if (filters?.contractId) params.append("contractId", filters.contractId);
  if (filters?.status) params.append("status", filters.status);
  const { data } = await api.get<{ data: Bill[] }>(`/api/bills${params.toString() ? `?${params.toString()}` : ""}`);
  return data.data;
}

export async function createBill(input: CreateBillInput): Promise<Bill> {
  const { data } = await api.post<{ data: Bill }>("/api/bills", input);
  return data.data;
}

export async function payBill(id: string, paymentMethod: PaymentMethod, reference?: string): Promise<Bill> {
  const { data } = await api.put<{ data: Bill }>(`/api/bills/${id}`, {
    status: "PAID",
    paymentMethod,
    reference,
    paidAt: new Date().toISOString(),
  });
  return data.data;
}

export async function deleteBill(id: string): Promise<void> {
  await api.delete(`/api/bills/${id}`);
}
