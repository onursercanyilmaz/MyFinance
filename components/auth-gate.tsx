"use client";

import { useState } from "react";
import { useSync } from "@/lib/sync-context";
import { Button, Field, Input } from "./ui";
import { Logo } from "./logo";

/** Login olmadan hiçbir şey gösterilmez: tam ekran, kapatılamayan kilit ekranı. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { configured, session, authLoading } = useSync();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="animate-pulse text-sm text-zinc-500">Yükleniyor…</p>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-sm dark:border-red-900 dark:bg-zinc-900">
          <p className="font-semibold text-red-600">Supabase yapılandırılmamış</p>
          <p className="mt-2 text-zinc-500">
            `.env.local` içinde `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` eksik. Dev
            sunucusunu restart et.
          </p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;
  return <>{children}</>;
}

function Shell({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex items-center gap-3">
          <Logo size={44} />
          <span className="leading-tight">
            <span className="block text-base font-bold">MyFinance</span>
            <span className="block text-xs text-zinc-500">Kişisel Bütçe ve Cüzdan</span>
          </span>
        </div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="mb-5 mt-1 text-sm text-zinc-500">{desc}</p>
        {children}
      </div>
    </div>
  );
}

function AuthScreen() {
  const { signIn, signUp, syncNow } = useSync();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    setInfo(null);
    if (!email.includes("@")) {
      setErr("Geçerli bir e-posta gir.");
      return;
    }
    if (password.length < 6) {
      setErr("Şifre en az 6 karakter olmalı.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const r = await signIn(email, password);
        if (!r.ok) {
          setErr(r.error ?? "Giriş başarısız.");
          return;
        }
        setTimeout(() => void syncNow(), 500);
      } else {
        const r = await signUp(email, password);
        if (!r.ok) {
          // Confirm email açıksa: hesap oluştu ama onay linki bekliyor
          if (r.error?.toLowerCase().includes("onay maili")) {
            setInfo(r.error);
            setMode("login");
          } else {
            setErr(r.error ?? "Kayıt başarısız.");
          }
          return;
        }
        setTimeout(() => void syncNow(), 500);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title={mode === "login" ? "Giriş yap" : "Hesap oluştur"}
      desc="Devam etmek için giriş yapmalısın. PC ve telefonda aynı hesabı kullan."
    >
      <div className="grid gap-3">
        <div className="inline-flex w-max overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setErr(null);
                setInfo(null);
              }}
              className={`px-4 py-1.5 text-xs font-bold uppercase ${
                mode === m
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {m === "login" ? "Giriş" : "Kayıt"}
            </button>
          ))}
        </div>

        <Field label="E-posta">
          <Input
            type="email"
            autoComplete="email"
            placeholder="ornek@eposta.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </Field>
        <Field label="Şifre">
          <Input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </Field>

        {err ? <p className="text-xs text-red-600">{err}</p> : null}
        {info ? <p className="text-xs text-emerald-600">{info}</p> : null}

        <Button onClick={() => void submit()} disabled={busy} className="w-full">
          {busy ? "Bekle…" : mode === "login" ? "Giriş yap" : "Hesap oluştur"}
        </Button>
      </div>
    </Shell>
  );
}
