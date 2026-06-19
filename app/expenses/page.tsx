"use client";

import { useEffect, useState, useCallback } from "react";
import { getExpenses, createExpense, Expense } from "@/services/dashboardService";
import { getPayments } from "@/services/bookingService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Wallet, Receipt } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { th } from "date-fns/locale";

const EXPENSE_CATEGORIES = ["ค่าซ่อมบำรุง", "ค่าแม่บ้าน", "ค่าน้ำ/ไฟ", "ค่าอาหาร", "ค่าสาธารณูปโภค", "ค่าวัสดุ", "อื่นๆ"];
const INCOME_CATEGORIES = ["ค่าปรับ", "ค่าเช่าอุปกรณ์", "ค่าบริการเพิ่มเติม", "อื่นๆ"];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

const METHOD_LABEL: Record<string, string> = {
  CASH: "เงินสด", TRANSFER: "โอนเงิน", QR_CODE: "QR Code", CREDIT_CARD: "บัตรเครดิต",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<{ amount: number; paidAt: string; method: string; booking: { guest: { firstName: string; lastName: string }; room: { roomNumber: string } } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"income" | "expense">("income");
  const [period, setPeriod] = useState(0); // 0 = this month, 1 = last month, etc.
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "EXPENSE", category: "", customCategory: "", description: "", amount: "", date: format(new Date(), "yyyy-MM-dd") });
  const [saving, setSaving] = useState(false);

  const getDateRange = (p: number) => {
    const base = subMonths(new Date(), p);
    return { from: startOfMonth(base), to: endOfMonth(base) };
  };

  const { from, to } = getDateRange(period);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [e, pay] = await Promise.all([
        getExpenses({ from: from.toISOString(), to: to.toISOString() }),
        getPayments(),
      ]);
      setExpenses(e);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPayments(pay as any);
    } catch { toast.error("ไม่สามารถโหลดข้อมูลได้"); }
    finally { setLoading(false); }
  }, [from.toISOString(), to.toISOString()]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalCategory = form.category === "อื่นๆ" ? form.customCategory : form.category;
      if (!finalCategory) {
        toast.error("กรุณาระบุประเภท");
        return;
      }
      await createExpense({ type: form.type, category: finalCategory, description: form.description, amount: Number(form.amount), date: form.date });
      toast.success("บันทึกข้อมูลสำเร็จ");
      setShowForm(false);
      setForm({ type: "EXPENSE", category: "", customCategory: "", description: "", amount: "", date: format(new Date(), "yyyy-MM-dd") });
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setSaving(false); }
  };

  const filteredPayments = payments.filter((p) => {
    const d = new Date(p.paidAt);
    return d >= from && d <= to;
  });

  // Combine manual incomes into totalIncome
  const manualIncomes = expenses.filter(e => e.type === "INCOME");
  const actualExpenses = expenses.filter(e => e.type !== "INCOME");

  const totalIncome = filteredPayments.reduce((s, p) => s + p.amount, 0) + manualIncomes.reduce((s, e) => s + e.amount, 0);
  const totalExpense = actualExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">รายรับ-รายจ่าย</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(from, "MMMM yyyy", { locale: th })}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">เดือนนี้</SelectItem>
              <SelectItem value="1">เดือนที่แล้ว</SelectItem>
              <SelectItem value="2">2 เดือนก่อน</SelectItem>
              <SelectItem value="3">3 เดือนก่อน</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1.5" />บันทึกรายการ (อื่นๆ)
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">รายรับรวม</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalIncome)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{filteredPayments.length} รายการ</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-green-500/15 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">รายจ่ายรวม</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpense)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{actualExpenses.length} รายการ</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-red-500/15 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card className={netProfit >= 0 ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/10" : "border-orange-200 bg-orange-50/50"}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">กำไรสุทธิ</p>
              <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? "text-blue-600" : "text-orange-600"}`}>{formatCurrency(netProfit)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">รายรับ - รายจ่าย</p>
            </div>
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${netProfit >= 0 ? "bg-blue-500/15" : "bg-orange-500/15"}`}>
              <Wallet className={`h-5 w-5 ${netProfit >= 0 ? "text-blue-600" : "text-orange-600"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Income | Expense */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "income" | "expense")}>
        <TabsList>
          <TabsTrigger value="income">รายรับ ({filteredPayments.length + manualIncomes.length})</TabsTrigger>
          <TabsTrigger value="expense">รายจ่าย ({actualExpenses.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>)}</div>
      ) : tab === "income" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" />รายรับจากการจอง</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPayments.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">ไม่มีรายรับในช่วงนี้</div>
            ) : (
              <div className="divide-y">
                {filteredPayments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium">
                        {p.booking ? `${p.booking.guest.firstName} ${p.booking.guest.lastName}` : "—"} · ห้อง {p.booking?.room.roomNumber || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(p.paidAt), "d MMM yyyy HH:mm", { locale: th })} · {METHOD_LABEL[p.method] || p.method}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">+{formatCurrency(p.amount)}</span>
                  </div>
                ))}
                {manualIncomes.map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{e.description}</p>
                        <Badge variant="outline" className="text-xs h-5 border-green-200 text-green-700">{e.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(e.date), "d MMM yyyy", { locale: th })} · บันทึกด้วยตนเอง
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">+{formatCurrency(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Receipt className="h-4 w-4 text-red-600" />รายจ่าย</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {actualExpenses.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">ไม่มีรายจ่ายในช่วงนี้</div>
            ) : (
              <div className="divide-y">
                {actualExpenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{e.description}</p>
                        <Badge variant="outline" className="text-xs h-5">{e.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(e.date), "d MMM yyyy", { locale: th })}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-600">-{formatCurrency(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Expense Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>บันทึกรายการอื่นๆ</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>ประเภทธุรกรรม *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v, category: "", customCategory: "" }))} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">รายจ่าย</SelectItem>
                  <SelectItem value="INCOME">รายรับอื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>หมวดหมู่ *</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))} required>
                <SelectTrigger><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger>
                <SelectContent>
                  {(form.type === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.category === "อื่นๆ" && (
              <div className="space-y-1.5">
                <Label>ระบุหมวดหมู่เพิ่มเติม *</Label>
                <Input placeholder="ระบุประเภทด้วยตนเอง..." value={form.customCategory} onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))} required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>รายละเอียด *</Label>
              <Input placeholder="รายละเอียดรายจ่าย..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>จำนวนเงิน (บาท) *</Label>
                <Input type="number" min={1} step="any" placeholder="500" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>วันที่ทำรายการ *</Label>
                <DatePicker value={form.date} onChange={(v) => v && setForm((f) => ({ ...f, date: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกรายจ่าย"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
