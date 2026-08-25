import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { customerDue, remaining } from "@/lib/seed";
import { formatBaht } from "@/lib/utils";
import type { DueDay } from "@/lib/types";

const DUE_DAYS: DueDay[] = [1, 20, 25];

const LABELS: Record<DueDay, { th: string; en: string }> = {
  1: { th: "งวดวันที่ 1", en: "Due Day 1" },
  20: { th: "งวดวันที่ 20", en: "Due Day 20" },
  25: { th: "งวดวันที่ 25", en: "Due Day 25" },
};

export default function Dashboard() {
  const debts = useAppStore((s) => s.debts);

  const groups = useMemo(() => {
    return DUE_DAYS.map((day) => {
      const items = debts.filter((d) => d.dueDay === day && d.current < d.total);
      const customers = Array.from(new Set(items.map((i) => i.customer)));
      const total = customers.reduce(
        (sum, c) => sum + customerDue(debts, c, day).reduce((a, b) => a + b.amount, 0),
        0,
      );
      return { day, items, customers, total };
    });
  }, [debts]);

  const grandTotal = groups.reduce((sum, g) => sum + g.total, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-7">
      <section className="mb-6">
        <h1 className="font-display text-3xl tracking-tight text-ink">
          งวดปัจจุบัน
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dashboard · ภาพรวมลูกหนี้ที่ต้องเก็บเงินวันนี้
        </p>
        <div className="mt-4 flex flex-wrap items-baseline gap-3 rounded-2xl border border-line bg-card px-5 py-4 shadow-sm">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Total Outstanding
          </span>
          <span className="font-display text-3xl font-semibold tabular-nums text-ink">
            ฿{formatBaht(grandTotal)}
          </span>
          <span className="text-sm text-muted-foreground">
            ทั้งหมด · this period
          </span>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {groups.map((g) => (
          <div
            key={g.day}
            className="rounded-2xl border border-line bg-card p-5 shadow-sm"
          >
            <header className="mb-3 flex items-baseline justify-between">
              <div>
                <h2 className="font-display text-lg text-ink">
                  {LABELS[g.day].th}
                </h2>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {LABELS[g.day].en}
                </p>
              </div>
              <span className="font-display text-xl tabular-nums text-gold">
                ฿{formatBaht(g.total)}
              </span>
            </header>

            {g.customers.length === 0 ? (
              <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                ไม่มีรายการ · No bills
              </p>
            ) : (
              <ul className="space-y-1.5">
                {g.customers.map((c) => {
                  const items = customerDue(debts, c, g.day);
                  const sum = items.reduce((a, b) => a + b.amount, 0);
                  return (
                    <li key={c}>
                      <Link
                        to={`/bill?customer=${encodeURIComponent(c)}&day=${g.day}`}
                        className="group flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-muted"
                      >
                        <div>
                          <div className="font-medium text-ink">คุณ{c}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {items.length} รายการ · {items.length} items · คงเหลือ{" "}
                            {items.reduce((a, b) => a + remaining(b), 0)} งวด
                          </div>
                        </div>
                        <div className="font-display text-base tabular-nums text-ink group-hover:text-gold">
                          ฿{formatBaht(sum)}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}