import { useEffect, useMemo, useState, useRef } from "react";
import { globalTotals, useBudget } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { Button, ConfirmDialog, Field, Input, Modal } from "./ui";
import { Download, Upload } from "lucide-react";
import { downloadJson } from "@/lib/utils";
import { validateImportedState } from "@/lib/store-data";

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, setCurrency, setCashBalance, resetAll, loadSample, importState } = useBudget();
  const { lang, setLang, t } = useLang();
  const totals = useMemo(() => globalTotals(state), [state]);
  const [currency, setC] = useState(state.settings.currency);
  const [balance, setB] = useState(String(Math.round(totals.balanceActual * 100) / 100));
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setC(state.settings.currency);
      setB(String(Math.round(globalTotals(state).balanceActual * 100) / 100));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const handleExport = () => {
    downloadJson(`myfinance-${new Date().toISOString().slice(0, 10)}.json`, state);
  };

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const text = await f.text();
      const parsed: unknown = JSON.parse(text);
      const v = validateImportedState(parsed);
      if (!v.ok) {
        setMsg(`${t.header.errImport} ${v.error}`);
        return;
      }
      const r = importState(parsed);
      if (r.ok) setMsg(t.header.msgOk);
      else setMsg(`${t.header.errPrefix} ${r.error}`);
    } catch {
      setMsg(t.header.msgInvalid);
    }
    setTimeout(() => setMsg(null), 3500);
  };

  return (
    <Modal open={open} onClose={onClose} title={t.settings.title} description={t.settings.desc}>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.settings.currency}>
            <Input value={currency} onChange={(e) => setC(e.target.value)} placeholder="₺" maxLength={5} />
          </Field>
          <Field label={t.settings.cash}>
            <Input
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setB(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Dil / Language</p>
          <div className="inline-flex w-max overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            {(["tr", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-4 py-1.5 text-xs font-bold uppercase ${lang === l ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Yedekleme / Backup</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} title={t.header.exportTitle}>
              <Download size={15} className="mr-1" /> {t.header.export}
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} title={t.header.importTitle}>
              <Upload size={15} className="mr-1" /> {t.header.import}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          {msg ? (
            <p className="text-xs text-amber-600 dark:text-amber-500">{msg}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            onClick={() => {
              setCurrency(currency || "₺");
              setCashBalance(Number(balance) || 0);
              onClose();
            }}
          >
            {t.common.save}
          </Button>
          <Button variant="secondary" onClick={() => { setC(state.settings.currency); setB(String(Math.round(globalTotals(state).balanceActual * 100) / 100)); onClose(); }}>
            {t.common.cancel}
          </Button>
        </div>
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="mb-2 text-xs font-medium text-zinc-500">{t.settings.danger}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => { loadSample(); onClose(); }}>
              {t.settings.sample}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
            >
              {t.settings.reset}
            </Button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => {
          resetAll();
          setShowResetConfirm(false);
          onClose();
        }}
        title={t.settings.resetT}
        description={t.settings.resetD}
        confirmText={t.settings.resetYes}
        cancelText={t.common.cancel}
      />
    </Modal>
  );
}

export function AddMonthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addMonth } = useBudget();
  const { t } = useLang();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Modal open={open} onClose={onClose} title={t.settings.addT} description={t.settings.addD}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.settings.year}>
          <Input type="number" value={year} min={2000} max={2100} onChange={(e) => setYear(Number(e.target.value))} />
        </Field>
        <Field label={t.settings.month}>
          <Input type="number" value={month} min={1} max={12} onChange={(e) => setMonth(Number(e.target.value))} />
        </Field>
      </div>
      {err ? <p className="mt-3 text-xs text-red-600">{err}</p> : null}
      <div className="mt-4 flex gap-2">
        <Button
          onClick={() => {
            if (month < 1 || month > 12 || year < 2000 || year > 2100) {
              setErr(t.settings.errRange);
              return;
            }
            const r = addMonth(year, month);
            if (!r.ok) {
              setErr(r.error ?? t.settings.errAdd);
              return;
            }
            setErr(null);
            onClose();
            window.location.href = `/${r.id}`;
          }}
        >
          {t.settings.createOpen}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {t.common.close}
        </Button>
      </div>
    </Modal>
  );
}
