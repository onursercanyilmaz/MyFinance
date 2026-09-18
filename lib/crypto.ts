"use client";

import type { AppBudgetState } from "./types";
import { validateImportedState } from "./store-data";

export interface EncryptedBlob {
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64
}

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64decode(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 200_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptState(state: AppBudgetState, password: string): Promise<EncryptedBlob> {
  if (!password || password.length < 4) throw new Error("Şifreleme parolası en az 4 karakter olmalı.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plain = new TextEncoder().encode(JSON.stringify(state));
  const ctBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plain);
  return { salt: b64encode(salt), iv: b64encode(iv), ct: b64encode(ctBuf) };
}

export async function decryptBlob(
  blob: EncryptedBlob,
  password: string
): Promise<{ ok: true; state: AppBudgetState } | { ok: false; error: string }> {
  try {
    if (!blob || typeof blob.ct !== "string" || !blob.ct) {
      return { ok: false, error: "Bulutta veri yok." };
    }
    const salt = b64decode(blob.salt);
    const iv = b64decode(blob.iv);
    const ct = b64decode(blob.ct);
    const key = await deriveKey(password, salt);
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, ct as BufferSource);
    const parsed: unknown = JSON.parse(new TextDecoder().decode(plainBuf));
    const v = validateImportedState(parsed);
    if (!v.ok) return { ok: false, error: v.error };
    return { ok: true, state: v.state };
  } catch {
    return { ok: false, error: "Şifre çözülemedi. Parola hatalı olabilir." };
  }
}

export function isEmptyBlob(blob: EncryptedBlob | null | undefined): boolean {
  return !blob || !blob.ct;
}

/**
 * Sabit uygulama şifreleme parolası.
 * Kullanıcıdan parola sorulmuyor; tüm cihazlar aynı dağıtımın env'ini kullandığı
 * için aynı sabiti görür (PC + telefon aynı sunucuya bağlıysa sorun yok).
 * Not: NEXT_PUBLIC_* olduğu için client bundle'da görünür. Bu, Supabase'de
 * düz metin durmasına karşı korur ama cihaz/kod erişimi olana karşı korumaz.
 */
export function getAppSecret(): string {
  return (
    process.env.NEXT_PUBLIC_SYNC_SECRET || "mf-2026-sabit-sync-9f3a7c2e5b1d48a6c0e17d4b2a"
  );
}
