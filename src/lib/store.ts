/**
 * NICHE BLOOM - Zustand store for state management.
 * Persists to localStorage so demo data survives reloads.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DebtRecord, DueDay } from "./types";
import { SEED_DEBTS } from "./seed";

interface AppStore {
  debts: DebtRecord[];
  promptpay: { phone: string; amount: number };
  confirmBill: (customer: string, day: DueDay, ids: string[]) => void;
  addDebt: (debt: Omit<DebtRecord, "id" | "dateCreated">) => void;
  removeDebt: (id: string) => void;
  setPromptpay: (phone: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      debts: SEED_DEBTS,
      promptpay: { phone: "0826822551", amount: 0 },

      confirmBill: (_customer, _day, ids) => {
        set((state) => ({
          debts: state.debts.map((d) =>
            ids.includes(d.id) ? { ...d, current: d.total } : d,
          ),
        }));
      },

      addDebt: (debt) => {
        const newDebt: DebtRecord = {
          id: `debt-${Date.now()}`,
          dateCreated: new Date().toISOString(),
          ...debt,
          current: 0,
        };
        set((state) => ({ debts: [...state.debts, newDebt] }));
      },

      removeDebt: (id) => {
        set((state) => ({ debts: state.debts.filter((d) => d.id !== id) }));
      },

      setPromptpay: (phone) => {
        set((state) => ({ promptpay: { ...state.promptpay, phone } }));
      },
    }),
    { name: "niche-bloom-storage" },
  ),
);