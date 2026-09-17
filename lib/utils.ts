import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

import type { Lang } from "./i18n";

// Sayı biçimi aktif dile göre seçilir (LanguageProvider senkron tutar).
let activeLocale: Lang = "tr";
export function setFormatLang(l: Lang) {
  activeLocale = l;
}
function nf() {
  return new Intl.NumberFormat(activeLocale === "tr" ? "tr-TR" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatMoney(value: number, currency: string): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${nf().format(safe)} ${currency}`;
}

export function formatSigned(value: number, currency: string): string {
  const prefix = value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = Math.abs(value);
  return `${prefix}${nf().format(abs)} ${currency}`;
}

const AY_ADLARI_TR = [
  "",
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const AY_ADLARI_EN = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthLabel(year: number, month: number, lang: Lang = "tr"): string {
  const names = lang === "tr" ? AY_ADLARI_TR : AY_ADLARI_EN;
  return `${names[month] ?? month} ${year}`;
}

export function parseYearMonth(id: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(id.trim());
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function toYearMonthId(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number; id: string } {
  const d = new Date(year, month - 1 + delta, 1);
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  return { year: y, month: mo, id: toYearMonthId(y, mo) };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
