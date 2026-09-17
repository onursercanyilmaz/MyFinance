"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarPlus, Check, Columns2, Columns3, Columns4, Copy, List, Pencil, Pin, Plus, Trash2, Wallet, X } from "lucide-react";
import { globalTotals, monthTotals, useBudget } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { formatMoney, formatSigned, monthLabel, toYearMonthId } from "@/lib/utils";
import { Badge, Button, Card, CardContent, CardHeader, ConfirmDialog, Empty, Field, Input, Modal, Progress } from "./ui";
import { Header } from "./header";
import { AddMonthDialog, SettingsDialog } from "./settings-dialogs";
import { Investments } from "./investments";

const PREF_KEYS = {
  selectedYear: "myfinance-selected-year",
  tab: "myfinance-tab",
  pinCurrent: "myfinance-pin-current",
  monthCols: "myfinance-month-cols",
};

const LEGACY_PREF_KEYS = {
  selectedYear: "finance-selected-year",
  tab: "finance-tab",
  pinCurrent: "finance-pin-current",
  monthCols: "finance-month-cols",
};

function getStoredPreference(key: string, legacyKey: string) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key) ?? window.localStorage.getItem(legacyKey);
}

export function Dashboard() {
  const router = useRouter();
  const { state, loaded, removeMonth, duplicateMonth, loadSample, setCashBalance } = useBudget();
  const { lang, t } = useLang();
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dupFor, setDupFor] = useState<string | null>(null);
  const [deleteMonthId, setDeleteMonthId] = useState<string | null>(null);
  // Son seçimler refresh sonrası da korunur (localStorage)
  const [selectedYear, setSelectedYear] = useState<number | "all">(() => {
    if (typeof window === "undefined") return "all";
    const v = getStoredPreference(PREF_KEYS.selectedYear, LEGACY_PREF_KEYS.selectedYear);
    if (v === null || v === "all") return "all";
    const n = Number(v);
    return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : "all";
  });
  const [editingCash, setEditingCash] = useState(false);
  const [cashDraft, setCashDraft] = useState("");
  const [tab, setTab] = useState<"months" | "investments">(() => {
    if (typeof window === "undefined") return "months";
    return getStoredPreference(PREF_KEYS.tab, LEGACY_PREF_KEYS.tab) === "investments" ? "investments" : "months";
  });
  // Güncel ayı listenin en başına sabitle (opsiyonel)
  const [pinCurrent, setPinCurrent] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return getStoredPreference(PREF_KEYS.pinCurrent, LEGACY_PREF_KEYS.pinCurrent) === "1";
  });
  // SSR/hydration uyumsuzluğu olmaması için güncel ay sadece istemcide hesaplanır
  const [nowId, setNowId] = useState<string | null>(null);
  useEffect(() => {
    const d = new Date();
    setNowId(toYearMonthId(d.getFullYear(), d.getMonth() + 1));
  }, []);
  const invCount = state.investments?.length ?? 0;
  // Satır başına ay sayısı (1=liste, 2/3/4=ızgara) — localStorage'da hatırlanır
  const [cols, setCols] = useState<1 | 2 | 3 | 4>(() => {
    if (typeof window === "undefined") return 3;
    const v = getStoredPreference(PREF_KEYS.monthCols, LEGACY_PREF_KEYS.monthCols);
    return v === "1" || v === "2" || v === "3" || v === "4" ? (Number(v) as 1 | 2 | 3 | 4) : 3;
  });
  const gridCls =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
        ? "sm:grid-cols-2"
        : cols === 3
          ? "sm:grid-cols-2 lg:grid-cols-3"
          : "sm:grid-cols-2 lg:grid-cols-4";

  const totals = useMemo(() => globalTotals(state), [state]);
  const sorted = useMemo(() => [...state.months].sort((a, b) => b.id.localeCompare(a.id)), [state.months]);
  const years = useMemo(
    () => [...new Set(state.months.map((m) => m.year))].sort((a, b) => b - a),
    [state.months]
  );
  const visible = useMemo(() => {
    const base = selectedYear === "all" ? sorted : sorted.filter((m) => m.year === selectedYear);
    if (!pinCurrent || !nowId) return base;
    const idx = base.findIndex((m) => m.id === nowId);
    if (idx <= 0) return base;
    return [base[idx], ...base.slice(0, idx), ...base.slice(idx + 1)];
  }, [sorted, selectedYear, pinCurrent, nowId]);

  // Seçimleri sakla
  useEffect(() => {
    try {
      window.localStorage.setItem(PREF_KEYS.selectedYear, selectedYear === "all" ? "all" : String(selectedYear));
    } catch { /* yoksay */ }
  }, [selectedYear]);
  useEffect(() => {
    try {
      window.localStorage.setItem(PREF_KEYS.tab, tab);
    } catch { /* yoksay */ }
  }, [tab]);
  useEffect(() => {
    try {
      window.localStorage.setItem(PREF_KEYS.pinCurrent, pinCurrent ? "1" : "0");
    } catch { /* yoksay */ }
  }, [pinCurrent]);
  // Kayıtlı yıl artık yoksa (tüm ayları silindiyse) Tümü'ne dön
  useEffect(() => {
    if (selectedYear !== "all" && sorted.length > 0 && !sorted.some((m) => m.year === selectedYear)) {
      setSelectedYear("all");
    }
  }, [sorted, selectedYear]);

  if (!loaded) {
    return <div className="mx-auto max-w-6xl animate-pulse px-4 py-10 text-sm text-zinc-500">…</div>;
  }

  return (
    <div>
      <Header onOpenSettings={() => setShowSettings(true)} />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        {/* Eldeki nakit — doğrudan düzenlenebilir */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t.dash.cash}</span>
              <span className="flex items-center gap-2">
                <Wallet size={18} className="text-zinc-400" />
                {!editingCash ? (
                  <button
                    onClick={() => {
                      setCashDraft(String(Math.round(totals.balanceActual * 100) / 100));
                      setEditingCash(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    title={t.dash.cashEditTitle}
                  >
                    <Pencil size={13} /> {t.common.edit}
                  </button>
                ) : null}
              </span>
            </div>
            {editingCash ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Input
                  autoFocus
                  type="number"
                  step="0.01"
                  className="!h-10 !w-52 text-lg font-bold"
                  value={cashDraft}
                  onChange={(e) => setCashDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setCashBalance(Number(cashDraft) || 0);
                      setEditingCash(false);
                    }
                    if (e.key === "Escape") setEditingCash(false);
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    setCashBalance(Number(cashDraft) || 0);
                    setEditingCash(false);
                  }}
                >
                  <Check size={14} /> {t.common.save}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingCash(false)}>
                  <X size={14} /> {t.common.cancel}
                </Button>
              </div>
            ) : (
              <div className={`text-2xl font-bold tracking-tight tabular-nums ${totals.balanceActual >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {formatMoney(totals.balanceActual, state.settings.currency)}
              </div>
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.dash.cashHint}
            </p>
          </CardHeader>
        </Card>

        {/* Sekmeler + özet + işlemler */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant={tab === "months" ? "default" : "outline"} onClick={() => setTab("months")} className="flex-1 sm:flex-none">
              {t.dash.months} ({sorted.length})
            </Button>
            <Button size="sm" variant={tab === "investments" ? "default" : "outline"} onClick={() => setTab("investments")} className="flex-1 sm:flex-none">
              {t.dash.investments} ({invCount})
            </Button>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 order-last sm:order-none leading-tight sm:leading-normal">
            {tab === "investments"
              ? t.dash.investmentsApart
              : sorted.length === 0
                ? t.dash.noMonthsYet
                : `${sorted.length} • ${t.dash.netSummary} ${formatSigned(totals.balancePlanned - state.settings.initialBalance, state.settings.currency)}`}
          </span>
          <div className="sm:ml-auto flex items-center gap-2">
            {tab === "months" && sorted.length === 0 ? (
              <Button variant="outline" size="sm" onClick={loadSample} className="w-full sm:w-auto">
                {t.dash.sample}
              </Button>
            ) : null}
            {tab === "months" ? (
              <Button size="sm" onClick={() => setShowAdd(true)} className="w-full sm:w-auto">
                <Plus size={15} className="mr-1" /> {t.dash.newMonth}
              </Button>
            ) : null}
          </div>
        </div>

        {tab === "investments" ? (
          <Investments />
        ) : (
        <>

        {/* Yıl filtresi + görünüm */}
        {sorted.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">{t.dash.year}</span>
              <Button
                size="sm"
                variant={selectedYear === "all" ? "default" : "outline"}
                onClick={() => setSelectedYear("all")}
              >
                {t.dash.all} ({sorted.length})
              </Button>
              {years.map((y) => {
                const count = sorted.filter((m) => m.year === y).length;
                return (
                  <Button
                    key={y}
                    size="sm"
                    variant={selectedYear === y ? "default" : "outline"}
                    onClick={() => setSelectedYear(selectedYear === y ? "all" : y)}
                  >
                    {y} ({count})
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { n: 1 as const, Icon: List, tip: t.dash.viewList },
                { n: 2 as const, Icon: Columns2, tip: t.dash.viewN.replace("{n}", "2") },
                { n: 3 as const, Icon: Columns3, tip: t.dash.viewN.replace("{n}", "3") },
                { n: 4 as const, Icon: Columns4, tip: t.dash.viewN.replace("{n}", "4") },
              ]).map(({ n, Icon, tip }) => (
                <Button
                  key={n}
                  size="icon"
                  variant={cols === n ? "default" : "outline"}
                  title={tip}
                  aria-label={tip}
                  onClick={() => {
                    setCols(n);
                    try {
                      window.localStorage.setItem(PREF_KEYS.monthCols, String(n));
                    } catch { /* yoksay */ }
                  }}
                >
                  <Icon size={16} />
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={pinCurrent ? "default" : "outline"}
                title={t.dash.pinTitle}
                onClick={() => setPinCurrent((v) => !v)}
              >
                <Pin size={14} /> {t.dash.pin}
              </Button>
            </div>
          </div>
        ) : null}

        {sorted.length === 0 ? (
          <Empty
            title={t.dash.emptyTitle}
            hint={t.dash.emptyHint}
          />
        ) : visible.length === 0 ? (
          <Empty
            title={t.dash.emptyYear.replace("{y}", String(selectedYear))}
            hint={t.dash.emptyYearHint}
          />
        ) : cols === 1 ? (
          <div className="grid grid-cols-1 gap-2">
            {visible.map((m) => {
              const totalsForMonth = monthTotals(m);
              const openMonth = () => router.push(`/${m.id}`);
              return (
                <Card
                  key={m.id}
                  className="group cursor-pointer transition-shadow hover:shadow-md"
                  onClick={openMonth}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-2 px-4 py-3">
                    <div className="flex items-center justify-between sm:w-[140px] sm:flex-col sm:items-start sm:justify-start shrink-0">
                      <div>
                        <p className="font-mono text-[10px] leading-tight text-zinc-500">{m.id}</p>
                        <p className="flex items-center gap-1.5 text-sm font-bold leading-tight group-hover:underline">
                          {monthLabel(m.year, m.month, lang)}
                          {pinCurrent && nowId === m.id ? (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-px text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              {t.dash.thisMonth}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <span className="inline-flex sm:hidden items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="!h-8 !w-8" title={t.dash.copyMonth} onClick={() => setDupFor(m.id)}>
                          <Copy size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="!h-8 !w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" title={t.common.del} onClick={() => setDeleteMonthId(m.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-4 sm:flex-1">
                      <span className="flex flex-col sm:block text-[11px] text-zinc-500 text-center sm:text-left bg-zinc-50 dark:bg-zinc-800/50 sm:bg-transparent p-1.5 sm:p-0 rounded-md">
                        <span className="sm:mr-1">{t.dash.income}</span>
                        <strong className="text-emerald-600 tabular-nums dark:text-emerald-400 text-xs sm:text-[11px]">{formatMoney(totalsForMonth.incomeTotal, state.settings.currency)}</strong>
                      </span>
                      <span className="flex flex-col sm:block text-[11px] text-zinc-500 text-center sm:text-left bg-zinc-50 dark:bg-zinc-800/50 sm:bg-transparent p-1.5 sm:p-0 rounded-md">
                        <span className="sm:mr-1">{t.dash.expense}</span>
                        <strong className="text-red-600 tabular-nums dark:text-red-400 text-xs sm:text-[11px]">{formatMoney(totalsForMonth.expenseTotal, state.settings.currency)}</strong>
                      </span>
                      <span className={`flex flex-col sm:block text-[11px] text-center sm:text-left bg-zinc-50 dark:bg-zinc-800/50 sm:bg-transparent p-1.5 sm:p-0 rounded-md font-bold tabular-nums ${totalsForMonth.netPlanned >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        <span className="text-zinc-500 font-normal sm:hidden text-[11px] mb-0.5">Net</span>
                        <span className="text-xs sm:text-[11px]">{formatSigned(totalsForMonth.netPlanned, state.settings.currency)}</span>
                      </span>
                    </div>

                    <span className="hidden min-w-[120px] flex-1 items-center gap-2 sm:flex">
                      <Progress value={totalsForMonth.progress} className="flex-1" />
                      <span className="text-[10px] tabular-nums text-zinc-500">%{totalsForMonth.progress} • {totalsForMonth.doneCount}/{totalsForMonth.totalCount}</span>
                    </span>
                    
                    <span className="mt-1 flex items-center justify-between sm:hidden text-[10px] text-zinc-500">
                      <Progress value={totalsForMonth.progress} className="w-1/2" />
                      <span>%{totalsForMonth.progress} • {totalsForMonth.doneCount}/{totalsForMonth.totalCount}</span>
                    </span>

                    <span className="hidden sm:inline-flex ml-auto items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="!h-8 !w-8" title={t.dash.copyMonth} onClick={() => setDupFor(m.id)}>
                        <Copy size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="!h-8 !w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        title={t.common.del}
                        onClick={() => setDeleteMonthId(m.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                      <ArrowRight size={15} className="ml-1 text-zinc-400" />
                    </span>
                  </div>
                </Card>
              );
            })}

            {/* + satırı */}
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 py-3 text-sm text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <CalendarPlus size={17} />
              <span className="font-medium">{t.dash.newMonthCard}</span>
            </button>
          </div>
        ) : (
          <div className={`grid gap-4 ${gridCls}`}>
            {visible.map((m) => {
              const totalsForMonth = monthTotals(m);
              const openMonth = () => router.push(`/${m.id}`);
              return (
                <Card
                  key={m.id}
                  className="group cursor-pointer transition-shadow hover:shadow-lg"
                  onClick={openMonth}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-zinc-500">{m.id}</p>
                        <span className="text-lg font-bold group-hover:underline">
                          {monthLabel(m.year, m.month, lang)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {pinCurrent && nowId === m.id ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {t.dash.thisMonth}
                          </Badge>
                        ) : null}
                        <Badge>{totalsForMonth.doneCount}/{totalsForMonth.totalCount} {t.dash.done}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
                        <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">{t.dash.income}</p>
                        <p className="font-bold text-emerald-700 dark:text-emerald-300">
                          {formatMoney(totalsForMonth.incomeTotal, state.settings.currency)}
                        </p>
                        <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                          {t.dash.collected}: {formatMoney(totalsForMonth.incomeDone, state.settings.currency)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-red-50 p-3 dark:bg-red-950/40">
                        <p className="text-[11px] font-medium text-red-700 dark:text-red-300">{t.dash.expense}</p>
                        <p className="font-bold text-red-700 dark:text-red-300">
                          {formatMoney(totalsForMonth.expenseTotal, state.settings.currency)}
                        </p>
                        <p className="text-[11px] text-red-600/80 dark:text-red-400/80">
                          {t.dash.paid}: {formatMoney(totalsForMonth.expenseDone, state.settings.currency)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-zinc-500">{t.dash.netPlanned}</span>
                        <span className={`font-bold ${totalsForMonth.netPlanned >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {formatSigned(totalsForMonth.netPlanned, state.settings.currency)}
                        </span>
                      </div>
                      <Progress value={totalsForMonth.progress} />
                      <p className="mt-1 text-[11px] text-zinc-500">{t.dash.progressDone} %{totalsForMonth.progress}</p>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/${m.id}`} className="flex-1">
                        <Button className="w-full" size="sm">
                          {t.common.open} <ArrowRight size={14} />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" title={t.dash.copyMonth} onClick={() => setDupFor(m.id)}>
                        <Copy size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t.common.del}
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => setDeleteMonthId(m.id)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* + kartı */}
            <button
              onClick={() => setShowAdd(true)}
              className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                <CalendarPlus size={20} />
              </span>
              <span className="text-sm font-medium">{t.dash.newMonthCard}</span>
            </button>
          </div>
        )}
        </>
        )}

      </main>

      <AddMonthDialog open={showAdd} onClose={() => setShowAdd(false)} />
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
      <DuplicateDialog sourceId={dupFor} onClose={() => setDupFor(null)} />
      <ConfirmDialog
        open={!!deleteMonthId}
        onClose={() => setDeleteMonthId(null)}
        onConfirm={() => {
          if (deleteMonthId) removeMonth(deleteMonthId);
          setDeleteMonthId(null);
        }}
        title={t.dash.delMonthTitle}
        description={deleteMonthId ? t.dash.delMonthDesc.replace("{id}", deleteMonthId) : undefined}
        confirmText={t.dash.delMonthYes}
      />
    </div>
  );
}

function DuplicateDialog({ sourceId, onClose }: { sourceId: string | null; onClose: () => void }) {
  const { duplicateMonth } = useBudget();
  const { t } = useLang();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Modal open={!!sourceId} onClose={onClose} title={`${t.dash.dupTitle} (${sourceId ?? ""})`} description={t.dash.dupDesc}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.dash.targetYear}>
          <Input type="number" value={year} min={2000} max={2100} onChange={(e) => setYear(Number(e.target.value))} />
        </Field>
        <Field label={t.dash.targetMonth}>
          <Input type="number" value={month} min={1} max={12} onChange={(e) => setMonth(Number(e.target.value))} />
        </Field>
      </div>
      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      <div className="mt-4 flex gap-2">
        <Button
          onClick={() => {
            if (!sourceId) return;
            const r = duplicateMonth(sourceId, year, month);
            if (!r.ok) {
              setErr(r.error ?? t.dash.copyFail);
              return;
            }
            onClose();
            window.location.href = `/${toYearMonthId(year, month)}`;
          }}
        >
          {t.dash.copy}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {t.common.close}
        </Button>
      </div>
    </Modal>
  );
}
