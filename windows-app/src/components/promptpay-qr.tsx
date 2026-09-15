import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { generatePromptPayPayload, isDynamicPayload } from "@/lib/promptpay";
import { MERCHANT } from "@/lib/types";
import { formatBaht } from "@/lib/utils";

export function PromptPayQr({
  phone,
  amount,
  size = 196,
}: {
  phone: string;
  amount: number;
  size?: number;
}) {
  const [svg, setSvg] = useState<string>("");
  const payload = generatePromptPayPayload(phone, amount);
  const dynamic = isDynamicPayload(payload);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(payload, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1A1916", light: "#FFFFFF" },
    }).then((out: string) => {
      if (!cancelled) setSvg(out);
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  return (
    <div className="flex flex-col items-center">
      <div
        className="rounded-lg border border-line bg-white p-2"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
        aria-label="PromptPay QR"
      />
      <p className="mt-3 text-sm text-muted-foreground">
        สแกนเพื่อชำระ · Scan to pay
      </p>
      <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-ink">
        ฿{formatBaht(amount)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        PromptPay: {phone}
        {dynamic ? " · ยอดล็อกตามบิล · Locked" : ""}
      </p>
      <p className="text-xs text-muted-foreground">{MERCHANT.owner}</p>
      <p className="text-xs text-muted-foreground">SCB: {MERCHANT.scb}</p>
    </div>
  );
}