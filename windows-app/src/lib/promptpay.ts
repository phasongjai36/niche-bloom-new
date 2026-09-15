/**
 * EMVCo Merchant-Presented QR for Thai PromptPay.
 * Dynamic when amount is set (POI method 12) so banking apps lock the total.
 */

const GUID = "A000000677010111";

function tlv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** CRC-16/XMODEM with seed 0xFFFF — Bank of Thailand PromptPay convention. */
function crc16xmodem(data: string, crc = 0xffff) {
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

function sanitize(id: string) {
  return id.replace(/[^0-9]/g, "");
}

function formatTarget(id: string) {
  const numbers = sanitize(id);
  if (numbers.length >= 13) return numbers;
  return `0000000000000${numbers.replace(/^0/, "66")}`.slice(-13);
}

function formatAmount(amount: number) {
  return amount.toFixed(2);
}

export function generatePromptPayPayload(
  target: string,
  amount?: number,
): string {
  const numbers = sanitize(target);
  const targetType =
    numbers.length >= 15 ? "03" : numbers.length >= 13 ? "02" : "01";

  const merchantInfo =
    tlv("00", GUID) + tlv(targetType, formatTarget(target));

  const parts = [
    tlv("00", "01"),
    tlv("01", amount != null && amount > 0 ? "12" : "11"),
    tlv("29", merchantInfo),
    tlv("53", "764"),
    amount != null && amount > 0 ? tlv("54", formatAmount(amount)) : "",
    tlv("58", "TH"),
  ].filter(Boolean);

  const body = parts.join("");
  const crc = crc16xmodem(`${body}6304`)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `${body}${tlv("63", crc)}`;
}

export function isDynamicPayload(payload: string) {
  return payload.includes("010212");
}