/**
 * NICHE BLOOM - Invoice & Installment Tracking
 * Type definitions
 */

export type DueDay = 1 | 20 | 25;

export type DebtType = "เงินผ่อน" | "เงินสด";

export interface DebtRecord {
  id: string;
  customer: string;
  item: string;
  type: DebtType;
  amount: number;       // per installment
  total: number;        // total installments
  current: number;      // paid installments
  dueDay: DueDay;
  dateCreated: string;  // ISO string
}

export interface MerchantConfig {
  brand: string;
  tagline: string;
  city: string;
  owner: string;
  scb: string;
  phone: string;
}

export const MERCHANT: MerchantConfig = {
  brand: "NICHE BLOOM",
  tagline: "Invoice & Installments",
  city: "Bangkok",
  owner: "082-682-2551",
  scb: "XXX-X-XXXXX-X",
  phone: "0826822551",
};