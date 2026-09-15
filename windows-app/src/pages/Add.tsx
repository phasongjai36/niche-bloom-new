import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import type { DebtType, DueDay } from "@/lib/types";

export default function Add() {
  const navigate = useNavigate();
  const addDebt = useAppStore((s) => s.addDebt);
  const [customer, setCustomer] = useState("");
  const [item, setItem] = useState("");
  const [type, setType] = useState<DebtType>("เงินผ่อน");
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState("12");
  const [dueDay, setDueDay] = useState<DueDay>(1);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    const tot = Number(total);
    if (!customer.trim() || !item.trim() || !amt || !tot) return;
    addDebt({
      customer: customer.trim(),
      item: item.trim(),
      type,
      amount: amt,
      total: tot,
      current: 0,
      dueDay,
    });
    void navigate("/");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-5 md:px-6 md:py-7">
      <button
        type="button"
        onClick={() => history.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="size-4" /> กลับ · Back
      </button>
      <div className="rounded-3xl border border-line bg-card p-6 shadow-sm">
        <h1 className="font-display text-2xl">เพิ่มรายการหนี้ใหม่</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new installment or cash-advance contract
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <Field label="ลูกหนี้ · Customer">
            <input
              required
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-gold/40"
              placeholder="ชื่อลูกหนี้ / Customer name"
            />
          </Field>
          <Field label="ประเภท · Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DebtType)}
              className="h-11 w-full rounded-xl border border-line bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="เงินผ่อน">เงินผ่อน (Installment)</option>
              <option value="เงินสด">เงินสด (Cash Advance)</option>
            </select>
          </Field>
          <Field label="รายการ / สินค้า · Item">
            <input
              required
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-gold/40"
              placeholder="เช่น iPad, cash, ทอง"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ยอดต่องวด (บาท)">
              <input
                required
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-gold/40"
              />
            </Field>
            <Field label="งวดทั้งหมด · Total Installments">
              <input
                required
                type="number"
                min={1}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-gold/40"
              />
            </Field>
          </div>
          <Field label="วันครบกำหนด · Due Day">
            <select
              value={dueDay}
              onChange={(e) => setDueDay(Number(e.target.value) as DueDay)}
              className="h-11 w-full rounded-xl border border-line bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value={1}>วันที่ 1 ของทุกเดือน · Day 1</option>
              <option value={20}>วันที่ 20 ของทุกเดือน · Day 20</option>
              <option value={25}>วันที่ 25 ของทุกเดือน · Day 25</option>
            </select>
          </Field>
          <Button type="submit" variant="primary" className="w-full rounded-xl" size="lg">
            บันทึกรายการหนี้ · Save
          </Button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}