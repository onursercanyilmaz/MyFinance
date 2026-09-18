"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useBudget, globalTotals } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";
import { Button } from "./ui";
import { Logo } from "./logo";
import { useMemo } from "react";
import { useSync } from "@/lib/sync-context";
import { ConflictDialog, SyncBadge } from "./sync-ui";

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { theme, setTheme } = useTheme();
  const { state } = useBudget();
  const { t } = useLang();
  const { session } = useSync();
  const totals = useMemo(() => globalTotals(state), [state]);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={36} />
          <span className="leading-tight">
            <span className="block text-sm font-bold">MyFinance</span>
            <span className="block text-[11px] text-zinc-500">{t.header.tagline}</span>
          </span>
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SyncBadge onAuth={() => {}} />
          {session ? (
            <span
              title={session.user.email ?? ""}
              className="max-w-[140px] truncate rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {session.user.email}
            </span>
          ) : null}
          <span
            className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 sm:inline dark:bg-emerald-950 dark:text-emerald-300"
            title={`${t.header.cash} ${formatMoney(totals.balanceActual, state.settings.currency)}`}
          >
            {t.header.cash}: {formatMoney(totals.balanceActual, state.settings.currency)}
          </span>
          
          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            {t.header.settings}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={t.header.theme}
          >
            <Sun size={17} className="dark:hidden" />
            <Moon size={17} className="hidden dark:block" />
          </Button>
        </div>
      </div>
      <ConflictDialog />
    </header>
  );
}
