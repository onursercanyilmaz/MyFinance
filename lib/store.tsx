"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AppBudgetState, BudgetItem, Category, Investment, MonthData } from "./types";
import { defaultState, getActiveStorageKey, isCacheWritesSuspended, validateImportedState } from "./store-data";
import { uid } from "./utils";

interface BudgetContextValue {
  state: AppBudgetState;
  loaded: boolean;
  // settings
  setCurrency: (currency: string) => void;
  setInitialBalance: (v: number) => void;
  // Eldeki nakdi doğrudan yazma: girilen kasa değerinden tamamlanan net düşülerek taban yeniden ayarlanır
  setCashBalance: (v: number) => void;
  // months
  addMonth: (year: number, month: number) => { ok: boolean; id?: string; error?: string };
  removeMonth: (id: string) => void;
  duplicateMonth: (sourceId: string, targetYear: number, targetMonth: number) => { ok: boolean; id?: string; error?: string };
  // items
  addItem: (monthId: string, kind: "income" | "expense", item: Omit<BudgetItem, "id">) => void;
  updateItem: (monthId: string, kind: "income" | "expense", itemId: string, patch: Partial<BudgetItem>) => void;
  removeItem: (monthId: string, kind: "income" | "expense", itemId: string) => void;
  toggleItem: (monthId: string, kind: "income" | "expense", itemId: string) => void;
  // categories
  addCategory: (c: Omit<Category, "id">) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  // investments (kasadan ayrı)
  addInvestment: (inv: Omit<Investment, "id">) => void;
  updateInvestment: (id: string, patch: Partial<Investment>) => void;
  removeInvestment: (id: string) => void;
  // io
  exportState: () => AppBudgetState;
  importState: (data: unknown) => { ok: boolean; error?: string };
  resetAll: () => void;
  loadSample: () => void;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

function readFromStorage(): AppBudgetState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(getActiveStorageKey());
    if (!raw) return defaultState();
    const parsed: unknown = JSON.parse(raw);
    const v = validateImportedState(parsed);
    if (v.ok) return v.state;
    console.warn("localStorage doğrulama hatası:", v.error);
    return defaultState();
  } catch (e) {
    console.warn("localStorage okuma hatası", e);
    return defaultState();
  }
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppBudgetState>(() => defaultState());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setState(readFromStorage());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (isCacheWritesSuspended()) return;
    try {
      window.localStorage.setItem(getActiveStorageKey(), JSON.stringify(state));
    } catch (e) {
      console.warn("localStorage yazma hatası", e);
    }
  }, [state, loaded]);

  const setCurrency = useCallback((currency: string) => {
    setState((s) => ({ ...s, settings: { ...s.settings, currency: currency.trim() || "₺" } }));
  }, []);

  const setInitialBalance = useCallback((v: number) => {
    setState((s) => ({ ...s, settings: { ...s.settings, initialBalance: Number.isFinite(v) ? v : 0 } }));
  }, []);

  const setCashBalance = useCallback((v: number) => {
    const cash = Number.isFinite(v) ? v : 0;
    setState((s) => {
      let incomeDone = 0;
      let expenseDone = 0;
      for (const m of s.months) {
        for (const it of m.incomes) if (it.isCompleted) incomeDone += Number(it.amount) || 0;
        for (const it of m.expenses) if (it.isCompleted) expenseDone += Number(it.amount) || 0;
      }
      return { ...s, settings: { ...s.settings, initialBalance: Math.round((cash - (incomeDone - expenseDone)) * 100) / 100 } };
    });
  }, []);

  const addMonth = useCallback((year: number, month: number) => {
    const id = `${year}-${String(month).padStart(2, "0")}`;
    let result: { ok: boolean; id?: string; error?: string } = { ok: true, id };
    setState((s) => {
      if (s.months.some((m) => m.id === id)) {
        result = { ok: false, error: "Bu ay zaten mevcut." };
        return s;
      }
      const m: MonthData = { id, year, month, incomes: [], expenses: [] };
      return { ...s, months: [...s.months, m].sort((a, b) => a.id.localeCompare(b.id)) };
    });
    return result;
  }, []);

  const removeMonth = useCallback((id: string) => {
    setState((s) => ({ ...s, months: s.months.filter((m) => m.id !== id) }));
  }, []);

  const duplicateMonth = useCallback((sourceId: string, targetYear: number, targetMonth: number) => {
    const targetId = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
    let result: { ok: boolean; id?: string; error?: string } = { ok: true, id: targetId };
    setState((s) => {
      const src = s.months.find((m) => m.id === sourceId);
      if (!src) {
        result = { ok: false, error: "Kaynak ay bulunamadı." };
        return s;
      }
      if (s.months.some((m) => m.id === targetId)) {
        result = { ok: false, error: "Hedef ay zaten mevcut." };
        return s;
      }
      const clone = (items: BudgetItem[]): BudgetItem[] =>
        items.map((it) => ({ ...it, id: uid("it"), isCompleted: false }));
      const nm: MonthData = {
        id: targetId,
        year: targetYear,
        month: targetMonth,
        incomes: clone(src.incomes),
        expenses: clone(src.expenses),
      };
      return { ...s, months: [...s.months, nm].sort((a, b) => a.id.localeCompare(b.id)) };
    });
    return result;
  }, []);

  const addItem = useCallback((monthId: string, kind: "income" | "expense", item: Omit<BudgetItem, "id">) => {
    const full: BudgetItem = { ...item, id: uid("it") };
    setState((s) => ({
      ...s,
      months: s.months.map((m) =>
        m.id === monthId
          ? { ...m, [kind === "income" ? "incomes" : "expenses"]: [...(kind === "income" ? m.incomes : m.expenses), full] }
          : m
      ),
    }));
  }, []);

  const updateItem = useCallback(
    (monthId: string, kind: "income" | "expense", itemId: string, patch: Partial<BudgetItem>) => {
      const key = kind === "income" ? "incomes" : "expenses";
      setState((s) => ({
        ...s,
        months: s.months.map((m) =>
          m.id === monthId ? { ...m, [key]: m[key].map((it) => (it.id === itemId ? { ...it, ...patch, id: it.id } : it)) } : m
        ),
      }));
    },
    []
  );

  const removeItem = useCallback((monthId: string, kind: "income" | "expense", itemId: string) => {
    const key = kind === "income" ? "incomes" : "expenses";
    setState((s) => ({
      ...s,
      months: s.months.map((m) => (m.id === monthId ? { ...m, [key]: m[key].filter((it) => it.id !== itemId) } : m)),
    }));
  }, []);

  const toggleItem = useCallback((monthId: string, kind: "income" | "expense", itemId: string) => {
    const key = kind === "income" ? "incomes" : "expenses";
    setState((s) => ({
      ...s,
      months: s.months.map((m) =>
        m.id === monthId ? { ...m, [key]: m[key].map((it) => (it.id === itemId ? { ...it, isCompleted: !it.isCompleted } : it)) } : m
      ),
    }));
  }, []);

  const addCategory = useCallback((c: Omit<Category, "id">) => {
    setState((s) => ({ ...s, categories: [...s.categories, { ...c, id: uid("cat") }] }));
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<Category>) => {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch, id: c.id } : c)),
    }));
  }, []);

  const removeCategory = useCallback((id: string) => {
    setState((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }));
  }, []);

  const addInvestment = useCallback((inv: Omit<Investment, "id">) => {
    setState((s) => ({ ...s, investments: [...(s.investments ?? []), { ...inv, id: uid("inv") }] }));
  }, []);

  const updateInvestment = useCallback((id: string, patch: Partial<Investment>) => {
    setState((s) => ({
      ...s,
      investments: (s.investments ?? []).map((v) => (v.id === id ? { ...v, ...patch, id: v.id } : v)),
    }));
  }, []);

  const removeInvestment = useCallback((id: string) => {
    setState((s) => ({ ...s, investments: (s.investments ?? []).filter((v) => v.id !== id) }));
  }, []);

  const exportState = useCallback(() => state, [state]);

  const importState = useCallback((data: unknown) => {
    const v = validateImportedState(data);
    if (!v.ok) return { ok: false as const, error: v.error };
    setState(v.state);
    return { ok: true as const };
  }, []);

  const resetAll = useCallback(() => setState(defaultState()), []);
  const loadSample = useCallback(() => {
    import("./store-data").then((mod) => setState(mod.sampleState()));
  }, []);

  const value = useMemo<BudgetContextValue>(
    () => ({
      state,
      loaded,
      setCurrency,
      setInitialBalance,
      setCashBalance,
      addMonth,
      removeMonth,
      duplicateMonth,
      addItem,
      updateItem,
      removeItem,
      toggleItem,
      addCategory,
      updateCategory,
      removeCategory,
      addInvestment,
      updateInvestment,
      removeInvestment,
      exportState,
      importState,
      resetAll,
      loadSample,
    }),
    [
      state,
      loaded,
      setCurrency,
      setInitialBalance,
      setCashBalance,
      addMonth,
      removeMonth,
      duplicateMonth,
      addItem,
      updateItem,
      removeItem,
      toggleItem,
      addCategory,
      updateCategory,
      removeCategory,
      addInvestment,
      updateInvestment,
      removeInvestment,
      exportState,
      importState,
      resetAll,
      loadSample,
    ]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error("useBudget must be used within BudgetProvider");
  return ctx;
}

// ---- Hesap yardımcıları ----

export function sumItems(items: BudgetItem[]): number {
  return items.reduce((a, b) => a + (Number(b.amount) || 0), 0);
}

export function sumCompleted(items: BudgetItem[]): number {
  return items.filter((i) => i.isCompleted).reduce((a, b) => a + (Number(b.amount) || 0), 0);
}

export function monthTotals(m: MonthData) {
  const incomeTotal = sumItems(m.incomes);
  const expenseTotal = sumItems(m.expenses);
  const incomeDone = sumCompleted(m.incomes);
  const expenseDone = sumCompleted(m.expenses);
  const netPlanned = incomeTotal - expenseTotal;
  const netActual = incomeDone - expenseDone;
  const totalCount = m.incomes.length + m.expenses.length;
  const doneCount = m.incomes.filter((i) => i.isCompleted).length + m.expenses.filter((i) => i.isCompleted).length;
  const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
  return { incomeTotal, expenseTotal, incomeDone, expenseDone, netPlanned, netActual, totalCount, doneCount, progress };
}

export function globalTotals(state: AppBudgetState) {
  let incomeDone = 0;
  let expenseDone = 0;
  let incomePlanned = 0;
  let expensePlanned = 0;
  for (const m of state.months) {
    const t = monthTotals(m);
    incomeDone += t.incomeDone;
    expenseDone += t.expenseDone;
    incomePlanned += t.incomeTotal;
    expensePlanned += t.expenseTotal;
  }
  const balanceActual = state.settings.initialBalance + incomeDone - expenseDone;
  const balancePlanned = state.settings.initialBalance + incomePlanned - expensePlanned;
  return { incomeDone, expenseDone, incomePlanned, expensePlanned, balanceActual, balancePlanned };
}
