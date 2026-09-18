"use client";

import { useState } from "react";
import { useSync } from "@/lib/sync-context";
import { Button, Field, Input, Modal } from "./ui";

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, signUp, encPassword, setEncPassword, syncNow } = useSync();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [encPw, setEncPw] = useState(encPassword ?? "");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    if (!email.includes("@")) {
      setErr("Geçerli bir e-posta gir.");
      return;
    }
    if (password.length < 6) {
      setErr("Giriş şifresi en az 6 karakter olmalı.");
      return;
    }
    if (!encPw || encPw.length < 4) {
      setErr("Şifreleme parolası en az 4 karakter olmalı. Bu parola verilerini şifreler, unutursan bulut verisi okunamaz.");
      return;
    }
    setBusy(true);
    try {
      const fn = mode === "login" ? signIn : signUp;
      const r = await fn(email, password);
      if (!r.ok) {
        setErr(r.error ?? "Giriş başarısız.");
        return;
      }
      setEncPassword(encPw, remember);
      onClose();
      // ilk senkronu tetikle (SyncProvider zaten pull yapar, push için de dene)
      setTimeout(() => void syncNow(), 800);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "login" ? "Giriş yap" : "Hesap oluştur"}
      description="PC ve telefonda aynı hesapla giriş yap. Veriler şifreleme parolanla korunur."
    >
      <div className="grid gap-3">
        <div className="inline-flex w-max overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
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
          />
        </Field>
        <Field label="Giriş şifresi (Supabase Auth)">
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
        <Field label="Şifreleme parolası (bulut verisini şifreler)">
          <Input
            type="password"
            autoComplete="off"
            placeholder="En az 4 karakter, unutma!"
            value={encPw}
            onChange={(e) => setEncPw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Bu cihazda şifreleme parolasını hatırla
        </label>

        {err ? <p className="text-xs text-red-600">{err}</p> : null}

        <div className="flex gap-2 pt-1">
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Bekle…" : mode === "login" ? "Giriş yap" : "Hesap oluştur"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Kapat
          </Button>
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Not: Şifreleme parolan Supabase&apos;e gönderilmez, sadece tarayıcıda AES-GCM ile kullanılır. Parolayı
          unutursan buluttaki veri okunamaz — önce Ayarlar&apos;dan JSON dışa aktar.
        </p>
      </div>
    </Modal>
  );
}

/** Giriş yapmışken şifreleme parolasını girmek/değiştirmek için küçük dialog */
export function UnlockDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setEncPassword, pullNow } = useSync();
  const [pw, setPw] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Modal open={open} onClose={onClose} title="Şifreleme parolası" description="Bulut verisini çözmek için parolanı gir.">
      <div className="grid gap-3">
        <Field label="Şifreleme parolası">
          <Input
            type="password"
            autoFocus
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pw.length >= 4) {
                setEncPassword(pw, remember);
                onClose();
                setTimeout(() => void pullNow(), 300);
              }
            }}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Bu cihazda hatırla
        </label>
        {err ? <p className="text-xs text-red-600">{err}</p> : null}
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (pw.length < 4) {
                setErr("En az 4 karakter gir.");
                return;
              }
              setEncPassword(pw, remember);
              onClose();
              setTimeout(() => void pullNow(), 300);
            }}
          >
            Kilidi aç
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
}
