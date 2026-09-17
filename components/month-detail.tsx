"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { monthTotals, useBudget } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import type { BudgetItem, Category } from "@/lib/types";
import { formatMoney, formatSigned, monthLabel, parseYearMonth, shiftMonth } from "@/lib/utils";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ConfirmDialog, Empty, Field, Input, Modal, Progress, Select, Stat, Textarea } from "./ui";
import { Header } from "./header";
import { SettingsDialog } from "./settings-dialogs";
import { cn } from "@/lib/utils";

type Kind = "income" | "expense";

export function MonthDetail({ yearMonth }: { yearMonth: string }) {
  const { state, loaded } = useBudget();
  const { lang, t } = useLang();
  const [showSettings, setShowSettings] = useState(false);
  const [editing, setEditing] = useState<{ kind: Kind; item?: BudgetItem } | null>(null);
  const [showCats, setShowCats] = useState(false);

  const parsed = parseYearMonth(yearMonth);
  const month = state.months.find((m) => m.id === yearMonth);

  const prev = parsed ? shiftMonth(parsed.year, parsed.month, -1) : null;
  const next = parsed ? shiftMonth(parsed.year, parsed.month, 1) : null;

  const totals = useMemo(() => (month ? monthTotals(month) : null), [month]);

  const expenseByCat = useMemo(() => {
    if (!month) return [];
    const map = new Map<string, number>();
    for (const it of month.expenses) map.set(it.categoryId, (map.get(it.categoryId) ?? 0) + (Number(it.amount) || 0));
    return [...map.entries()]
      .map(([categoryId, value]) => {
        const c = state.categories.find((x) => x.id === categoryId);
        return { name: c?.name ?? t.month.uncategorized, value, color: c?.color ?? "#64748b" };
      })
      .sort((a, b) => b.value - a.value);
  }, [month, state.categories, t.month.uncategorized]);

  const incomeByCat = useMemo(() => {
    if (!month) return [];
    const map = new Map<string, number>();
    for (const it of month.incomes) map.set(it.categoryId, (map.get(it.categoryId) ?? 0) + (Number(it.amount) || 0));
    return [...map.entries()]
      .map(([categoryId, value]) => {
        const c = state.categories.find((x) => x.id === categoryId);
        return { name: c?.name ?? t.month.uncategorized, value, color: c?.color ?? "#64748b" };
      })
      .sort((a, b) => b.value - a.value);
  }, [month, state.categories, t.month.uncategorized]);

  const barData = useMemo(() => {
    if (!month || !totals) return [];
    return [
      { name: t.month.tIncome, [t.month.planned]: totals.incomeTotal, [t.month.actualBar]: totals.incomeDone },
      { name: t.month.tExpense, [t.month.planned]: totals.expenseTotal, [t.month.actualBar]: totals.expenseDone },
    ];
  }, [month, totals, t.month.actualBar, t.month.planned, t.month.tExpense, t.month.tIncome]);

  if (!loaded) return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-zinc-500">...</div>;

  if (!parsed) {
    return (
      <NotFoundShell message={`"${yearMonth}" ${t.month.badFormat}`} />
    );
  }
  if (!month || !totals) {
    return <NotFoundShell message={`${monthLabel(parsed.year, parsed.month, lang)} (${yearMonth}) ${t.month.noRecord}`} />;
  }

  return (
    <div>
      <Header onOpenSettings={() => setShowSettings(true)} />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        {/* Üst navigasyon */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft size={15} /> {t.month.allMonths}
            </Button>
          </Link>
          <div className="mx-auto flex items-center gap-1">
            {prev ? (
              <Link href={`/${prev.id}`}>
                <Button variant="ghost" size="icon" title={`${t.month.prev} ${prev.id}`}>
                  <ChevronLeft size={18} />
                </Button>
              </Link>
            ) : null}
            <div className="px-2 text-center">
              <p className="font-mono text-[11px] text-zinc-500">{month.id}</p>
              <h1 className="text-xl font-bold leading-tight">{monthLabel(month.year, month.month, lang)}</h1>
            </div>
            {next ? (
              <Link href={`/${next.id}`}>
                <Button variant="ghost" size="icon" title={`${t.month.next} ${next.id}`}>
                  <ChevronRight size={18} />
                </Button>
              </Link>
            ) : null}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowCats(true)}>
            <Settings2 size={15} /> {t.month.categories}
          </Button>
        </div>

        {/* KPI */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat 
            label={t.month.totalIncoming} 
            value={formatMoney(totals.incomeDone, state.settings.currency)} 
            sub={`${t.month.plannedTotal}: ${formatMoney(totals.incomeTotal, state.settings.currency)}`} 
            tone="green" 
          />
          <Stat 
            label={t.month.totalPendingIncome} 
            value={formatMoney(totals.incomeTotal - totals.incomeDone, state.settings.currency)} 
            sub={t.month.pendingStr} 
            tone="green" 
          />
          <Stat 
            label={t.month.totalPaidExpense} 
            value={formatMoney(totals.expenseDone, state.settings.currency)} 
            sub={`${t.month.plannedTotal}: ${formatMoney(totals.expenseTotal, state.settings.currency)}`} 
            tone="red" 
          />
          <Stat 
            label={t.month.totalPendingExpense} 
            value={formatMoney(totals.expenseTotal - totals.expenseDone, state.settings.currency)} 
            sub={t.month.pendingStr} 
            tone="red" 
          />
        </div>

        {/* Grafikler */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{t.month.expPie}</CardTitle>
              <p className="text-xs text-zinc-500">{t.month.expPieSub}</p>
            </CardHeader>
            <CardContent>
              {expenseByCat.length === 0 ? (
                <Empty title={t.month.noExpense} hint={t.month.noExpenseHint} />
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseByCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                        {expenseByCat.map((e) => (
                          <Cell key={e.name} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => formatMoney(Number(v as number ?? 0), state.settings.currency)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{t.month.incPie}</CardTitle>
              <p className="text-xs text-zinc-500">{t.month.incPieSub}</p>
            </CardHeader>
            <CardContent>
              {incomeByCat.length === 0 ? (
                <Empty title={t.month.noIncome} hint={t.month.noIncomeHint} />
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={incomeByCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                        {incomeByCat.map((e) => (
                          <Cell key={e.name} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => formatMoney(Number(v as number ?? 0), state.settings.currency)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{t.month.bar}</CardTitle>
              <p className="text-xs text-zinc-500">{t.month.barSub}</p>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v: unknown) => formatMoney(Number(v as number ?? 0), state.settings.currency)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey={t.month.planned} fill="#71717a" radius={[6, 6, 0, 0]} />
                    <Bar dataKey={t.month.actualBar} fill="#16a34a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tablolar */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ItemTable
            kind="income"
            monthId={month.id}
            title={t.month.incomes}
            onAdd={() => setEditing({ kind: "income" })}
            onEdit={(item) => setEditing({ kind: "income", item })}
          />
          <ItemTable
            kind="expense"
            monthId={month.id}
            title={t.month.expenses}
            onAdd={() => setEditing({ kind: "expense" })}
            onEdit={(item) => setEditing({ kind: "expense", item })}
          />
        </div>

        <div className="flex justify-center pb-8">
          <Link href="/">
            <Button variant="secondary" size="sm">
              {t.month.backBoard} <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </main>

      <ItemDialog edit={editing} monthId={month.id} onClose={() => setEditing(null)} />
      <CategoryDialog open={showCats} onClose={() => setShowCats(false)} />
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

function NotFoundShell({ message }: { message: string }) {
  const { t } = useLang();

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-lg font-bold">{t.month.notFound}</p>
      <p className="mt-2 text-sm text-zinc-500">{message}</p>
      <Link href="/" className="mt-6 inline-block">
        <Button>
          <ArrowLeft size={15} /> {t.month.backBoard}
        </Button>
      </Link>
    </div>
  );
}

// ---------------- Tablo ----------------

function ItemTable({
  kind,
  monthId,
  title,
  onAdd,
  onEdit,
}: {
  kind: Kind;
  monthId: string;
  title: string;
  onAdd: () => void;
  onEdit: (item: BudgetItem) => void;
}) {
  const { state, toggleItem, removeItem } = useBudget();
  const { t } = useLang();
  const [deleteTarget, setDeleteTarget] = useState<BudgetItem | null>(null);
  const month = state.months.find((m) => m.id === monthId);
  const items = kind === "income" ? (month?.incomes ?? []) : (month?.expenses ?? []);
  const catOf = (id: string) => state.categories.find((c) => c.id === id);
  const total = items.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const done = items.filter((i) => i.isCompleted).reduce((a, b) => a + (Number(b.amount) || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="!text-base">{title}</CardTitle>
            <p className="text-xs text-zinc-500">
              {kind === "income" ? t.month.totalIncome : t.month.totalExpense} {formatMoney(total, state.settings.currency)} •{" "}
              {kind === "income" ? t.month.collected : t.month.paid} {formatMoney(done, state.settings.currency)}
            </p>
          </div>
          <Button size="sm" onClick={onAdd}>
            <Plus size={14} /> {t.common.add}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <Empty title={kind === "income" ? t.month.noIncomeYet : t.month.noExpenseYet} hint={t.month.addFirstIncome} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="whitespace-nowrap border-b border-zinc-200 text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                  <th className="w-8 py-2 pr-2">{t.month.thStatus}</th>
                  <th className="py-2 pr-2">{t.month.thTitle}</th>
                  <th className="py-2 pr-2">{t.month.thCat}</th>
                  <th className="py-2 pr-2 text-right">{t.month.thAmount}</th>
                  <th className="py-2 pr-2">{t.month.thInst}</th>
                  <th className="py-2 text-right">{t.month.thActions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const c = catOf(it.categoryId);
                  return (
                    <tr key={it.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/70">
                      <td className="py-2 pr-2">
                        <button
                          onClick={() => toggleItem(monthId, kind, it.id)}
                          title={it.isCompleted ? (kind === "income" ? t.month.stCollected : t.month.stPaid) : t.month.stPending}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                            it.isCompleted
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-zinc-300 text-transparent hover:border-emerald-500 dark:border-zinc-700"
                          )}
                        >
                          <Check size={14} />
                        </button>
                      </td>
                      <td className="py-2 pr-2">
                        <p className={cn("font-medium leading-tight", it.isCompleted ? "" : "", "max-w-[180px] truncate")} title={it.title}>
                          {it.title}
                        </p>
                        {it.note ? <p className="max-w-[180px] truncate text-[11px] text-zinc-500" title={it.note}>{it.note}</p> : null}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-2">
                        <Badge>
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c?.color ?? "#999" }} />
                          {c?.name ?? t.month.uncategorized}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-2 text-right font-semibold tabular-nums">
                        {formatMoney(it.amount, state.settings.currency)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-2 text-xs text-zinc-500">{it.installment || "—"}</td>
                      <td className="py-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" className="!h-8 !w-8" onClick={() => onEdit(it)} title={t.month.editItem}>
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="!h-8 !w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            title={t.month.delItem}
                            onClick={() => setDeleteTarget(it)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) removeItem(monthId, kind, deleteTarget.id);
          setDeleteTarget(null);
        }}
        title={t.month.delItemTitle}
        description={deleteTarget ? `"${deleteTarget.title}" ${t.month.delCatPlain}` : undefined}
        confirmText={t.common.yesDelete}
        cancelText={t.common.cancel}
      />
    </Card>
  );
}

// ---------------- Kalem Dialog ----------------

function ItemDialog({ edit, monthId, onClose }: { edit: { kind: Kind; item?: BudgetItem } | null; monthId: string; onClose: () => void }) {
  const { state, addItem, updateItem } = useBudget();
  const { t } = useLang();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [installment, setInstallment] = useState("");
  const [note, setNote] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // edit değiştiğinde formu doldur
  const key = edit ? `${edit.kind}:${edit.item?.id ?? "new"}` : "closed";
  const [lastKey, setLastKey] = useState("");
  if (edit && key !== lastKey) {
    setLastKey(key);
    setTitle(edit.item?.title ?? "");
    const cats = state.categories.filter((c) => c.type === edit.kind);
    setCategoryId(edit.item?.categoryId ?? cats[0]?.id ?? "");
    setAmount(edit.item ? String(edit.item.amount) : "");
    setInstallment(edit.item?.installment ?? "");
    setNote(edit.item?.note ?? "");
    setIsCompleted(edit.item?.isCompleted ?? false);
    setErr(null);
  }
  if (!edit && lastKey !== "") {
    // kapandı
  }

  if (!edit) return null;
  const cats = state.categories.filter((c) => c.type === edit.kind);

  return (
    <Modal
      open={!!edit}
      onClose={onClose}
      title={edit.item ? t.month.itemEdit : edit.kind === "income" ? t.month.itemNewIncome : t.month.itemNewExpense}
      description={edit.kind === "income" ? t.month.itemDescIncome : t.month.itemDescExpense}
    >
      <div className="grid gap-3">
        <Field label={t.month.fTitle}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={edit.kind === "income" ? t.month.phIncome : t.month.phExpense} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.month.fCategory}>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {cats.length === 0 ? <option value="">{t.month.noCat}</option> : null}
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.month.fAmount}>
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.month.fInstallment}>
            <Input value={installment} onChange={(e) => setInstallment(e.target.value)} placeholder="—" maxLength={10} />
          </Field>
          <Field label={t.month.fStatus}>
            <button
              type="button"
              onClick={() => setIsCompleted((v) => !v)}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-medium",
                isCompleted
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-zinc-200 dark:border-zinc-800"
              )}
            >
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", isCompleted ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-300 text-transparent")}>
                <Check size={13} />
              </span>
              {isCompleted ? (edit.kind === "income" ? t.month.stCollected : t.month.stPaid) : t.month.stPending}
            </button>
          </Field>
        </div>
        <Field label={t.month.fNote}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.month.phNote} />
        </Field>
        {err ? <p className="text-xs text-red-600">{err}</p> : null}
        <div className="flex gap-2">
          <Button
            onClick={() => {
              const amt = Number(amount);
              if (!title.trim()) {
                setErr(t.month.errTitle);
                return;
              }
              if (!categoryId) {
                setErr(t.month.errCat);
                return;
              }
              if (!Number.isFinite(amt) || amt < 0) {
                setErr(t.month.errAmount);
                return;
              }
              const payload = {
                title: title.trim(),
                categoryId,
                amount: Math.round(amt * 100) / 100,
                isCompleted,
                installment: installment.trim() || undefined,
                note: note.trim() || undefined,
              };
              if (edit.item) updateItem(monthId, edit.kind, edit.item.id, payload);
              else addItem(monthId, edit.kind, payload);
              setLastKey("");
              onClose();
            }}
          >
            {edit.item ? t.common.save : t.common.add}
          </Button>
          <Button variant="secondary" onClick={() => { setLastKey(""); onClose(); }}>
            {t.common.cancel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------- Kategori Dialog ----------------

function CategoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, addCategory, updateCategory, removeCategory } = useBudget();
  const { t } = useLang();
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [color, setColor] = useState("#6366f1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; used: boolean } | null>(null);

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setName(c.name);
    setType(c.type);
    setColor(c.color);
  };
  const resetForm = () => {
    setEditingId(null);
    setName("");
    setType("expense");
    setColor("#6366f1");
  };

  return (
    <Modal open={open} onClose={onClose} title={t.month.catsTitle} description={t.month.catsDesc} wide>
      <div className="grid gap-4">
        <div className="grid gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-[1fr_140px_90px_auto]">
          <Field label={editingId ? t.month.editCat : t.month.newCat}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.month.phCat} />
          </Field>
          <Field label={t.month.fType}>
            <Select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")}>
              <option value="expense">{t.month.tExpense}</option>
              <option value="income">{t.month.tIncome}</option>
            </Select>
          </Field>
          <Field label={t.month.fColor}>
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="!h-10 cursor-pointer !p-1" />
          </Field>
          <div className="flex items-end gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (!name.trim()) return;
                if (editingId) {
                  updateCategory(editingId, { name: name.trim(), type, color });
                } else {
                  addCategory({ name: name.trim(), type, color });
                }
                resetForm();
              }}
            >
              {editingId ? t.common.save : t.common.add}
            </Button>
            {editingId ? (
              <Button size="sm" variant="secondary" onClick={resetForm}>
                {t.common.cancel}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {(["income", "expense"] as const).map((categoryType) => (
            <div key={categoryType}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {categoryType === "income" ? t.month.tIncome : t.month.tExpense} ({state.categories.filter((c) => c.type === categoryType).length})
              </p>
              <div className="grid gap-1.5">
                {state.categories
                  .filter((c) => c.type === categoryType)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                    >
                      <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                      <span className="flex-1 truncate font-medium">{c.name}</span>
                      <button onClick={() => startEdit(c)} className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" title={t.common.edit}>
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          const used = state.months.some(
                            (m) => m.incomes.some((i) => i.categoryId === c.id) || m.expenses.some((i) => i.categoryId === c.id)
                          );
                          setDeleteTarget({ id: c.id, name: c.name, used });
                        }}
                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        title={t.common.del}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                {state.categories.filter((c) => c.type === categoryType).length === 0 ? (
                  <p className="text-xs text-zinc-500">{t.month.noCategory}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            removeCategory(deleteTarget.id);
            if (editingId === deleteTarget.id) resetForm();
          }
          setDeleteTarget(null);
        }}
        title={t.month.delCatTitle}
        description={
          deleteTarget
            ? deleteTarget.used
              ? `"${deleteTarget.name}" ${t.month.delCatUsed}`
              : `"${deleteTarget.name}" ${t.month.delCatPlain}`
            : undefined
        }
        confirmText={t.common.yesDelete}
        cancelText={t.common.cancel}
      />
    </Modal>
  );
}
