"use client";

import { getSupabase } from "./supabaseClient";
import type { EncryptedBlob } from "./crypto";

export interface RemoteRow {
  rev: number;
  updated_at: string;
  device_id: string | null;
  blob: EncryptedBlob;
}

function deviceId(): string {
  try {
    const k = "myfinance-device-id";
    let v = window.localStorage.getItem(k);
    if (!v) {
      v = `${navigator.platform ?? "web"}-${Math.random().toString(36).slice(2, 9)}`;
      window.localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return "unknown-device";
  }
}

export async function fetchRemote(): Promise<{ ok: true; row: RemoteRow | null } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase yapılandırılmamış (.env.local)." };
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Giriş yapmalısın." };
  const { data, error } = await sb
    .from("budget_states")
    .select("rev, updated_at, device_id, blob")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: true, row: null };
  return { ok: true, row: data as RemoteRow };
}

/** Optimistic concurrency: sadece baseRev eşleşirse yaz. Eşleşmezse conflict döner. */
export async function pushRemote(
  blob: EncryptedBlob,
  baseRev: number
): Promise<{ ok: true; rev: number } | { ok: false; conflict: boolean; error: string; remote?: RemoteRow }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, conflict: false, error: "Supabase yapılandırılmamış." };
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData.user) return { ok: false, conflict: false, error: "Giriş yapmalısın." };
  const uid = userData.user.id;

  // Mevcut rev'i oku
  const cur = await sb.from("budget_states").select("rev").eq("user_id", uid).maybeSingle();
  if (cur.error) return { ok: false, conflict: false, error: cur.error.message };
  const curRev: number | null = cur.data ? (cur.data as { rev: number }).rev : null;

  if (curRev === null) {
    // İlk yazma: satır yoksa oluştur (rev 0 beklenir)
    if (baseRev !== 0) {
      const r = await fetchRemote();
      return { ok: false, conflict: true, error: "Bulut daha yeni.", remote: r.ok ? r.row ?? undefined : undefined };
    }
    const { error } = await sb.from("budget_states").insert({
      user_id: uid,
      rev: 1,
      device_id: deviceId(),
      blob,
    });
    if (error) {
      // Yarış: başkası araya girdiyse conflict
      const r = await fetchRemote();
      return { ok: false, conflict: true, error: error.message, remote: r.ok ? r.row ?? undefined : undefined };
    }
    return { ok: true, rev: 1 };
  }

  if (curRev !== baseRev) {
    const r = await fetchRemote();
    return { ok: false, conflict: true, error: "Bulut daha yeni.", remote: r.ok ? r.row ?? undefined : undefined };
  }

  const { error } = await sb
    .from("budget_states")
    .update({ blob, rev: baseRev + 1, device_id: deviceId() })
    .eq("user_id", uid)
    .eq("rev", baseRev);
  if (error) {
    const r = await fetchRemote();
    return { ok: false, conflict: true, error: error.message, remote: r.ok ? r.row ?? undefined : undefined };
  }
  // Eşleşme olmazsa Supabase hata vermez, satır sayısı 0 olur — tekrar oku
  const check = await fetchRemote();
  if (check.ok && check.row && check.row.rev === baseRev + 1) return { ok: true, rev: baseRev + 1 };
  if (check.ok && check.row && check.row.rev !== baseRev + 1) {
    return { ok: false, conflict: true, error: "Bulut daha yeni.", remote: check.row };
  }
  return { ok: true, rev: baseRev + 1 };
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  return deviceId();
}
