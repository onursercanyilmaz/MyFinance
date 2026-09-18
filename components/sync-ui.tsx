"use client";

import { useSync } from "@/lib/sync-context";
import { Button, Modal } from "./ui";

export function SyncBadge({ onAuth }: { onAuth: () => void }) {
  const { configured, session, syncStatus, lastSyncedAt, syncError, syncNow } = useSync();
  if (!configured) return null;

  if (!session) {
    return (
      <Button variant="outline" size="sm" onClick={onAuth} title="Bulut senkron için giriş yap">
        Giriş yap
      </Button>
    );
  }

  const label =
    syncStatus === "syncing"
      ? "Senkron…"
      : syncStatus === "conflict"
        ? "Çakışma!"
        : syncStatus === "error"
          ? "Hata"
          : syncStatus === "locked"
            ? "Kilitli"
            : syncStatus === "offline"
              ? "Çevrimdışı"
              : "Senkron";

  const cls =
    syncStatus === "conflict" || syncStatus === "error"
      ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
      : syncStatus === "syncing"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";

  const title = [
    syncError ? `Hata: ${syncError}` : null,
    lastSyncedAt ? `Son: ${new Date(lastSyncedAt).toLocaleString()}` : "Henüz senkron yok",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <button
      onClick={() => void syncNow()}
      title={`${title}\n(Tıkla: şimdi senkronla)`}
      className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}
    >
      ● {label}
    </button>
  );
}

export function ConflictDialog() {
  const { conflict, syncStatus, resolveConflict, clearConflict } = useSync();
  const open = syncStatus === "conflict" && !!conflict;
  return (
    <Modal
      open={open}
      onClose={clearConflict}
      title="Senkron çakışması"
      description={`Bulut daha yeni (rev ${conflict?.rev}). Sessizce ezmedik. Hangisi kalsın?`}
    >
      <div className="grid gap-2">
        <p className="text-xs text-zinc-500">
          Bulut: {conflict ? new Date(conflict.updated_at).toLocaleString() : ""} • {conflict?.device_id ?? "bilinmeyen cihaz"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void resolveConflict("take-remote")}>Buluttakini al</Button>
          <Button variant="outline" onClick={() => void resolveConflict("keep-mine")}>
            Benimkini yaz (bulutu ez)
          </Button>
          <Button variant="secondary" onClick={clearConflict}>
            Sonra
          </Button>
        </div>
      </div>
    </Modal>
  );
}
