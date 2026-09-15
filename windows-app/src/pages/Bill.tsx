import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Printer } from "lucide-react";
import { PromptPayQr } from "@/components/promptpay-qr";
import { Button } from "@/components/ui/button";
import { remaining, customerDue } from "@/lib/seed";
import { useAppStore } from "@/lib/store";
import { MERCHANT, type DueDay } from "@/lib/types";
import { formatBaht } from "@/lib/utils";

function billNumber(customer: string) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const tag = customer
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0)
    .toString(36)
    .toUpperCase()
    .slice(0, 4);
  return `NB-${ymd}-${tag}`;
}

function FloralWatermark() {
  return (
    <svg viewBox="0 0 400 600" className="h-full w-full" fill="none">
      <path
        d="M40 520c40-80 120-90 160-40 40-70 120-60 160 10"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="200" cy="120" r="48" stroke="currentColor" />
      <circle cx="200" cy="120" r="22" stroke="currentColor" />
    </svg>
  );
}

export default function Bill() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const customer = params.get("customer") ?? "";
  const day = (([1, 20, 25].includes(Number(params.get("day"))) ? Number(params.get("day")) : 1) as DueDay);

  const debts = useAppStore((s) => s.debts);
  const promptpay = useAppStore((s) => s.promptpay);
  const confirmBill = useAppStore((s) => s.confirmBill);
  const items = customerDue(debts, customer, day);
  const total = items.reduce((s, d) => s + d.amount, 0);
  const dateStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const code = `CNB${String((customer.charCodeAt(0) || 0) % 1000).padStart(3, "0")}`;

  async function copyLink() {
    const url = `${window.location.origin}/bill?customer=${encodeURIComponent(customer)}&day=${day}`;
    await navigator.clipboard.writeText(url);
  }

  async function share() {
    const url = `${window.location.origin}/bill?customer=${encodeURIComponent(customer)}&day=${day}`;
    const text = `บิล NICHE BLOOM — คุณ${customer} ยอด ฿${formatBaht(total)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "NICHE BLOOM", text, url });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
  }

  function confirm() {
    if (items.length === 0) return;
    const ok = window.confirm(
      `ยืนยันว่าได้รับเงิน ฿${formatBaht(total)} จากคุณ${customer} แล้ว? ระบบจะอัปเดตงวดให้อัตโนมัติ`,
    );
    if (!ok) return;
    confirmBill(
      customer,
      day,
      items.map((d) => d.id),
    );
    void navigate("/");
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-5 md:px-6 md:py-7">
      <Link
        to="/"
        className="no-print mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="size-4" /> กลับ Dashboard · Back
      </Link>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-8 text-center text-muted-foreground">
          ไม่มีรายการค้างของ คุณ{customer} ในวันที่ {day}
          <br />
          <span className="text-xs">No outstanding bills for {customer} on day {day}</span>
        </div>
      ) : (
        <>
          <article className="relative overflow-hidden rounded-sm border border-line bg-card px-6 py-8 shadow-xl md:px-10">
            <div className="pointer-events-none absolute inset-0 opacity-[0.04] text-ink" aria-hidden>
              <FloralWatermark />
            </div>
            <header className="relative text-center">
              <div className="mx-auto mb-2 flex size-14 items-center justify-center overflow-hidden rounded-full border-2 border-gold/50 bg-card">
                <img src="/logo-minimal.jpg" alt="NB" className="size-full object-cover" />
              </div>
              <h1 className="font-display text-3xl tracking-[0.28em] text-ink">
                {MERCHANT.brand}
              </h1>
              <p className="mt-1 text-[10px] tracking-[0.28em] text-muted-foreground">
                {MERCHANT.tagline} · {MERCHANT.city}
              </p>
            </header>

            <div className="relative mt-8 flex justify-between text-sm">
              <div>
                <div className="text-xs text-muted-foreground">
                  เลขที่ใบเสร็จ · Receipt No.
                </div>
                <div className="font-medium">{billNumber(customer)}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  ลูกค้า · Customer
                </div>
                <div className="font-medium">คุณ{customer}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">วันที่ · Date</div>
                <div className="font-medium">{dateStr}</div>
                <div className="mt-2 text-xs text-muted-foreground">รหัส · Code</div>
                <div className="font-medium">{code}</div>
              </div>
            </div>

            <table className="relative mt-6 w-full text-sm">
              <thead>
                <tr className="border-b border-gold/40 text-left text-muted-foreground">
                  <th className="py-2 font-medium">รายการ / Item</th>
                  <th className="py-2 text-right font-medium">ต่องวด</th>
                  <th className="hidden py-2 text-center font-medium sm:table-cell">งวด</th>
                  <th className="hidden py-2 text-center font-medium sm:table-cell">คงเหลือ</th>
                  <th className="py-2 text-right font-medium">ยอดชำระ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id} className="border-b border-line">
                    <td className="py-2.5">{d.item}</td>
                    <td className="py-2.5 text-right tabular-nums">฿{formatBaht(d.amount)}</td>
                    <td className="hidden py-2.5 text-center tabular-nums sm:table-cell">
                      {d.current}/{d.total}
                    </td>
                    <td className="hidden py-2.5 text-center tabular-nums sm:table-cell">
                      {remaining(d)}
                    </td>
                    <td className="py-2.5 text-right font-medium tabular-nums">
                      ฿{formatBaht(d.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="relative mt-5 text-right">
              <div className="text-sm text-muted-foreground">
                ยอดรวมที่ต้องชำระ · Total Due
              </div>
              <div className="font-display text-3xl font-semibold tabular-nums text-ink">
                ฿{formatBaht(total)}
              </div>
            </div>

            <div className="relative mt-8 border-t border-dashed border-line pt-6">
              <PromptPayQr phone={promptpay.phone} amount={total} />
            </div>

            <p className="relative mt-8 text-center text-xs text-muted-foreground">
              ขอบคุณที่ใช้บริการ {MERCHANT.brand} · Thank you
              <br />
              ใบเสร็จสร้างโดยระบบอัตโนมัติ · Auto-generated receipt
            </p>
          </article>

          <div className="no-print mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="primary" size="lg" onClick={confirm}>
              <Check className="size-4" /> ยืนยันการชำระเงิน · Confirm
            </Button>
            <Button variant="outline" size="lg" onClick={() => void share()}>
              ส่งให้ลูกหนี้ · Share
            </Button>
            <Button variant="outline" size="lg" onClick={() => void copyLink()}>
              <Copy className="size-4" /> คัดลอกลิงก์ · Copy
            </Button>
            <Button variant="outline" size="lg" onClick={() => window.print()}>
              <Printer className="size-4" /> พิมพ์ · Print
            </Button>
          </div>
        </>
      )}
    </main>
  );
}