import { Link } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { formatBaht } from "@/lib/utils";

export default function Closed() {
  const debts = useAppStore((s) => s.debts);
  const closed = debts.filter((d) => d.current >= d.total);
  const totalPaid = closed.reduce((sum, d) => sum + d.amount * d.total, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-7">
      <section className="mb-6">
        <h1 className="font-display text-3xl tracking-tight text-ink">
          ปิดแล้ว
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Closed contracts · สัญญาที่ชำระครบทุกงวดแล้ว
        </p>
        <div className="mt-4 flex flex-wrap items-baseline gap-3 rounded-2xl border border-line bg-card px-5 py-4 shadow-sm">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Total Collected
          </span>
          <span className="font-display text-3xl font-semibold tabular-nums text-ink">
            ฿{formatBaht(totalPaid)}
          </span>
          <span className="text-sm text-muted-foreground">
            {closed.length} สัญญา · contracts
          </span>
        </div>
      </section>

      {closed.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-8 text-center text-muted-foreground">
          ยังไม่มีรายการปิด · No closed contracts yet
        </div>
      ) : (
        <ul className="space-y-2">
          {closed.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 shadow-sm"
            >
              <div>
                <div className="font-medium text-ink">
                  คุณ{d.customer} · {d.item}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  ปิดครบ {d.total}/{d.total} งวด · ประเภท {d.type}
                </div>
              </div>
              <div className="font-display tabular-nums text-ink">
                ฿{formatBaht(d.amount * d.total)}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:text-ink">
          ← กลับไป Dashboard · Back to dashboard
        </Link>
      </div>
    </main>
  );
}