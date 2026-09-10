import type { DebtRecord, DueDay } from "./types";

export function remaining(d: DebtRecord): number {
  return Math.max(0, d.total - d.current);
}

export function customerDue(
  debts: DebtRecord[],
  customer: string,
  day: DueDay,
): DebtRecord[] {
  return debts.filter(
    (d) => d.customer === customer && d.dueDay === day && d.current < d.total,
  );
}

export const SEED_DEBTS: DebtRecord[] = [
  {
    id: "seed-1",
    customer: "ใจดี",
    item: "iPad Air",
    type: "เงินผ่อน",
    amount: 2500,
    total: 12,
    current: 3,
    dueDay: 1,
    dateCreated: new Date(2026, 6, 1).toISOString(),
  },
  {
    id: "seed-2",
    customer: "ใจดี",
    item: "ทองรูปพรรณ 1 บาท",
    type: "เงินผ่อน",
    amount: 4500,
    total: 10,
    current: 2,
    dueDay: 1,
    dateCreated: new Date(2026, 5, 15).toISOString(),
  },
  {
    id: "seed-3",
    customer: "สมชาย",
    item: "iPhone 15",
    type: "เงินผ่อน",
    amount: 3500,
    total: 12,
    current: 5,
    dueDay: 20,
    dateCreated: new Date(2026, 4, 20).toISOString(),
  },
  {
    id: "seed-4",
    customer: "สมหญิง",
    item: "เงินสดกด",
    type: "เงินสด",
    amount: 3000,
    total: 6,
    current: 1,
    dueDay: 25,
    dateCreated: new Date(2026, 7, 1).toISOString(),
  },
  {
    id: "seed-5",
    customer: "ใจดี",
    item: "MacBook Pro",
    type: "เงินผ่อน",
    amount: 5000,
    total: 24,
    current: 0,
    dueDay: 1,
    dateCreated: new Date(2026, 7, 1).toISOString(),
  },
];