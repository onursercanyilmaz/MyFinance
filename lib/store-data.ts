import type { AppBudgetState } from "./types";
import { parseYearMonth } from "./utils";

export const STORAGE_KEY = "myfinance-budget-v1";

export const DEFAULT_CATEGORIES: AppBudgetState["categories"] = [
  { id: "cat_maas", name: "Maaş", type: "income", color: "#16a34a" },
  { id: "cat_freelance", name: "Freelance", type: "income", color: "#0ea5e9" },
  { id: "cat_yatirim", name: "Yatırım Getirisi", type: "income", color: "#8b5cf6" },
  { id: "cat_diger_gelir", name: "Diğer Gelir", type: "income", color: "#22c55e" },
  { id: "cat_kira", name: "Kira", type: "expense", color: "#ef4444" },
  { id: "cat_market", name: "Market", type: "expense", color: "#f59e0b" },
  { id: "cat_fatura", name: "Faturalar", type: "expense", color: "#6366f1" },
  { id: "cat_ulasim", name: "Ulaşım", type: "expense", color: "#14b8a6" },
  { id: "cat_egitim", name: "Eğitim", type: "expense", color: "#ec4899" },
  { id: "cat_eglence", name: "Eğlence", type: "expense", color: "#a855f7" },
  { id: "cat_saglik", name: "Sağlık", type: "expense", color: "#f43f5e" },
  { id: "cat_diger_gider", name: "Diğer Gider", type: "expense", color: "#64748b" },
];

export function defaultState(): AppBudgetState {
  return {
    settings: { currency: "₺", initialBalance: 0 },
    categories: DEFAULT_CATEGORIES,
    months: [],
    investments: [],
  };
}

export function sampleState(): AppBudgetState {
  return {
    settings: { currency: "₺", initialBalance: 45000 },
    categories: DEFAULT_CATEGORIES,
    months: [
      {
        id: "2026-06",
        year: 2026,
        month: 6,
        incomes: [
          { id: "inc_1", title: "Maaş", categoryId: "cat_maas", amount: 85000, isCompleted: true },
          { id: "inc_2", title: "Freelance Proje", categoryId: "cat_freelance", amount: 12000, isCompleted: false, note: "Ay sonu ödenecek" },
        ],
        expenses: [
          { id: "exp_1", title: "Kira", categoryId: "cat_kira", amount: 22000, isCompleted: true },
          { id: "exp_2", title: "Market", categoryId: "cat_market", amount: 9500, isCompleted: true },
          { id: "exp_3", title: "Kredi Kartı", categoryId: "cat_fatura", amount: 14000, isCompleted: false, installment: "3/12" },
          { id: "exp_4", title: "Ulaşım", categoryId: "cat_ulasim", amount: 3200, isCompleted: true },
        ],
      },
      {
        id: "2026-07",
        year: 2026,
        month: 7,
        incomes: [
          { id: "inc_3", title: "Maaş", categoryId: "cat_maas", amount: 85000, isCompleted: false },
        ],
        expenses: [
          { id: "exp_5", title: "Kira", categoryId: "cat_kira", amount: 22000, isCompleted: false },
          { id: "exp_6", title: "Tatil", categoryId: "cat_eglence", amount: 18000, isCompleted: false, note: "Erken rezervasyon" },
        ],
      },
    ],
    investments: [
      { id: "inv_1", name: "Gram Altın", kind: "gold", quantity: 10, unit: "gram", buyPrice: 4200, currentPrice: 4500, date: "2026-06", note: "Örnek" },
      { id: "inv_2", name: "Bitcoin", kind: "crypto", quantity: 0.05, unit: "BTC", note: "Fiyat girmeden adet takibi" },
    ],
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validateImportedState(data: unknown): { ok: true; state: AppBudgetState } | { ok: false; error: string } {
  if (!isRecord(data)) return { ok: false, error: "JSON bir obje olmalı." };
  if (!isRecord(data.settings)) return { ok: false, error: "settings alanı eksik/geçersiz." };
  if (typeof data.settings.currency !== "string") return { ok: false, error: "settings.currency metin olmalı." };
  if (typeof data.settings.initialBalance !== "number" || Number.isNaN(data.settings.initialBalance))
    return { ok: false, error: "settings.initialBalance sayı olmalı." };
  if (!Array.isArray(data.categories)) return { ok: false, error: "categories dizi olmalı." };
  if (!Array.isArray(data.months)) return { ok: false, error: "months dizi olmalı." };
  // investments eski JSON'larda olmayabilir → geriye uyumlu
  const rawInvestments: unknown = (data as Record<string, unknown>).investments ?? [];

  for (const c of data.categories) {
    if (!isRecord(c) || typeof c.id !== "string" || typeof c.name !== "string" || (c.type !== "income" && c.type !== "expense") || typeof c.color !== "string") {
      return { ok: false, error: "categories içinde geçersiz kategori var." };
    }
  }

  for (const m of data.months) {
    if (!isRecord(m) || typeof m.id !== "string" || typeof m.year !== "number" || typeof m.month !== "number" || !Array.isArray(m.incomes) || !Array.isArray(m.expenses)) {
      return { ok: false, error: `Ay verisi geçersiz: ${JSON.stringify((m as Record<string, unknown>).id ?? "?")}` };
    }
    if (!parseYearMonth(m.id)) return { ok: false, error: `Ay id formatı YYYY-MM olmalı: ${m.id}` };
    const all = [...m.incomes, ...m.expenses];
    for (const it of all) {
      if (
        !isRecord(it) ||
        typeof it.id !== "string" ||
        typeof it.title !== "string" ||
        typeof it.categoryId !== "string" ||
        typeof it.amount !== "number" ||
        Number.isNaN(it.amount) ||
        typeof it.isCompleted !== "boolean"
      ) {
        return { ok: false, error: `${m.id} içinde geçersiz kalem var.` };
      }
    }
  }

  if (!Array.isArray(rawInvestments)) return { ok: false, error: "investments dizi olmalı." };
  const VALID_KINDS = ["gold", "crypto", "stock", "fund", "currency", "other"];
  for (const inv of rawInvestments) {
    if (
      !isRecord(inv) ||
      typeof inv.id !== "string" ||
      typeof inv.name !== "string" ||
      typeof inv.kind !== "string" ||
      !VALID_KINDS.includes(inv.kind) ||
      typeof inv.quantity !== "number" ||
      Number.isNaN(inv.quantity) ||
      typeof inv.unit !== "string"
    ) {
      return { ok: false, error: "investments içinde geçersiz kayıt var." };
    }
  }

  const normalized = data as unknown as AppBudgetState;
  if (!Array.isArray(normalized.investments)) normalized.investments = [];
  return { ok: true, state: normalized };
}
