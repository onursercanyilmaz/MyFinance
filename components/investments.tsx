"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Coins } from "lucide-react";
import { useBudget } from "@/lib/store";
import type { Investment, InvestmentKind } from "@/lib/types";
import { formatMoney, formatSigned } from "@/lib/utils";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ConfirmDialog, Empty, Field, Input, Modal, Select, Stat } from "./ui";

const KIND_LABEL: Record<InvestmentKind, string> = {
  gold: "Altın",
  crypto: "Kripto",
  stock: "Hisse",
  fund: "Fon",
  currency: "Döviz",
  other: "Diğer",
};

const KIND_UNIT: Record<InvestmentKind, string> = {
  gold: "gram",
  crypto: "BTC",
  stock: "pay",
  fund: "pay",
  currency: "birim",
  other: "adet",
};

function invTotals(list: Investment[]) {
  let cost = 0;
  let value = 0;
  let hasCost = false;
  let hasValue = false;
  for (const v of list) {
    const q = Number(v.quantity) || 0;
    if (v.buyPrice != null && Number.isFinite(v.buyPrice)) {
      cost += q * (v.buyPrice as number);
      hasCost = true;
    }
    if (v.currentPrice != null && Number.isFinite(v.currentPrice)) {
      value += q * (v.currentPrice as number);
      hasValue = true;
    }
  }
  return { cost, value, pnl: value - cost, hasCost, hasValue };
}

export function Investments() {
  const { state, addInvestment, updateInvestment, removeInvestment } = useBudget();
  const list = useMemo(() => state.investments ?? [], [state.investments]);
  const t = useMemo(() => invTotals(list), [list]);
  const [editing, setEditing] = useState<{ item?: Investment } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Investment | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Toplam Maliyet"
          value={t.hasCost ? formatMoney(t.cost, state.settings.currency) : "—"}
          sub="adet × alış fiyatı (girilenler)"
          icon={<Coins size={18} className="text-zinc-400" />}
        />
        <Stat
          label="Güncel Değer"
          value={t.hasValue ? formatMoney(t.value, state.settings.currency) : "—"}
          sub="adet × güncel fiyat (girilenler)"
          tone="green"
        />
        <Stat
          label="Kâr / Zarar"
          value={t.hasCost && t.hasValue ? formatSigned(t.pnl, state.settings.currency) : "—"}
          sub={t.hasCost && t.hasValue && t.cost > 0 ? `%${((t.pnl / t.cost) * 100).toFixed(1)}` : "fiyat girilince hesaplanır"}
          tone={t.pnl >= 0 ? "green" : "red"}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="!text-base">Yatırımlar ({list.length})</CardTitle>
              <p className="text-xs text-zinc-500">
                Nakit bütçeden ayrı tutulur, kasaya dahil edilmez. Fiyat girmek zorunda değilsin — sadece adet de takip edebilirsin.
              </p>
            </div>
            <Button size="sm" onClick={() => setEditing({})}>
              <Plus size={14} /> Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <Empty title="Henüz yatırım yok" hint="Örn. Gram Altın — 5 gram. Fiyatları sonra da girebilirsin." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                    <th className="py-2 pr-2">Varlık</th>
                    <th className="py-2 pr-2">Tür</th>
                    <th className="py-2 pr-2 text-right">Miktar</th>
                    <th className="py-2 pr-2 text-right">Alış (birim)</th>
                    <th className="py-2 pr-2 text-right">Güncel (birim)</th>
                    <th className="py-2 pr-2 text-right">Değer</th>
                    <th className="py-2 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((v) => {
                    const q = Number(v.quantity) || 0;
                    const val = v.currentPrice != null ? q * v.currentPrice : null;
                    return (
                      <tr key={v.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/70">
                        <td className="py-2 pr-2">
                          <p className="max-w-[180px] truncate font-medium" title={v.name}>{v.name}</p>
                          {v.note || v.date ? (
                            <p className="max-w-[180px] truncate text-[11px] text-zinc-500">
                              {[v.date, v.note].filter(Boolean).join(" • ")}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-2 pr-2"><Badge>{KIND_LABEL[v.kind] ?? v.kind}</Badge></td>
                        <td className="whitespace-nowrap py-2 pr-2 text-right font-semibold tabular-nums">
                          {q} {v.unit}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums text-zinc-500">
                          {v.buyPrice != null ? formatMoney(v.buyPrice, state.settings.currency) : "—"}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums">
                          {v.currentPrice != null ? formatMoney(v.currentPrice, state.settings.currency) : "—"}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-2 text-right font-semibold tabular-nums">
                          {val != null ? formatMoney(val, state.settings.currency) : "—"}
                        </td>
                        <td className="py-2 text-right">
                          <div className="inline-flex gap-1">
                            <Button variant="ghost" size="icon" className="!h-8 !w-8" title="Düzenle" onClick={() => setEditing({ item: v })}>
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="!h-8 !w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                              title="Sil"
                              onClick={() => setDeleteTarget(v)}
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
      </Card>

      <InvestmentDialog edit={editing} onClose={() => setEditing(null)} onSave={(data, id) => {
        if (id) updateInvestment(id, data);
        else addInvestment(data);
        setEditing(null);
      }} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) removeInvestment(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title="Yatırım silinsin mi?"
        description={deleteTarget ? `"${deleteTarget.name}" kalıcı olarak silinecek.` : undefined}
        confirmText="Evet, sil"
      />
    </div>
  );
}

function InvestmentDialog({
  edit,
  onClose,
  onSave,
}: {
  edit: { item?: Investment } | null;
  onClose: () => void;
  onSave: (data: Omit<Investment, "id">, id?: string) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<InvestmentKind>("gold");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("gram");
  const [buyPrice, setBuyPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const key = edit ? (edit.item?.id ?? "new") : "closed";
  const [lastKey, setLastKey] = useState("");
  if (edit && key !== lastKey) {
    setLastKey(key);
    setName(edit.item?.name ?? "");
    setKind(edit.item?.kind ?? "gold");
    setQuantity(edit.item ? String(edit.item.quantity) : "");
    setUnit(edit.item?.unit ?? KIND_UNIT[edit.item?.kind ?? "gold"]);
    setBuyPrice(edit.item?.buyPrice != null ? String(edit.item.buyPrice) : "");
    setCurrentPrice(edit.item?.currentPrice != null ? String(edit.item.currentPrice) : "");
    setDate(edit.item?.date ?? "");
    setNote(edit.item?.note ?? "");
    setErr(null);
  }

  if (!edit) return null;

  return (
    <Modal open={!!edit} onClose={onClose} title={edit.item ? "Yatırımı düzenle" : "Yeni yatırım"} description="Fiyatlar opsiyonel — sadece adet de tutabilirsin.">
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ad (Gram Altın, Bitcoin…)">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Gram Altın" />
          </Field>
          <Field label="Tür">
            <Select value={kind} onChange={(e) => {
              const k = e.target.value as InvestmentKind;
              setKind(k);
              if (!edit.item) setUnit(KIND_UNIT[k]);
            }}>
              <option value="gold">Altın</option>
              <option value="crypto">Kripto (Bitcoin…)</option>
              <option value="stock">Hisse</option>
              <option value="fund">Fon</option>
              <option value="currency">Döviz</option>
              <option value="other">Diğer</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Miktar">
            <Input type="number" step="any" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="5" />
          </Field>
          <Field label="Birim (gram, BTC, adet…)">
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="gram" maxLength={12} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Alış fiyatı / birim (opsiyonel)">
            <Input type="number" step="any" min="0" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="—" />
          </Field>
          <Field label="Güncel fiyat / birim (opsiyonel)">
            <Input type="number" step="any" min="0" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} placeholder="—" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tarih (örn. 2026-09, opsiyonel)">
            <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="—" maxLength={7} />
          </Field>
          <Field label="Not (opsiyonel)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="—" />
          </Field>
        </div>
        {err ? <p className="text-xs text-red-600">{err}</p> : null}
        <div className="flex gap-2">
          <Button onClick={() => {
            const q = Number(quantity);
            if (!name.trim()) { setErr("Ad zorunlu."); return; }
            if (!Number.isFinite(q) || q < 0) { setErr("Geçerli bir miktar gir."); return; }
            const bp = buyPrice.trim() === "" ? undefined : Number(buyPrice);
            const cp = currentPrice.trim() === "" ? undefined : Number(currentPrice);
            if (bp !== undefined && (!Number.isFinite(bp) || bp < 0)) { setErr("Alış fiyatı geçersiz."); return; }
            if (cp !== undefined && (!Number.isFinite(cp) || cp < 0)) { setErr("Güncel fiyat geçersiz."); return; }
            onSave({
              name: name.trim(),
              kind,
              quantity: q,
              unit: unit.trim() || "adet",
              buyPrice: bp,
              currentPrice: cp,
              date: date.trim() || undefined,
              note: note.trim() || undefined,
            }, edit.item?.id);
            setLastKey("");
          }}>
            {edit.item ? "Kaydet" : "Ekle"}
          </Button>
          <Button variant="secondary" onClick={() => { setLastKey(""); onClose(); }}>Vazgeç</Button>
        </div>
      </div>
    </Modal>
  );
}
