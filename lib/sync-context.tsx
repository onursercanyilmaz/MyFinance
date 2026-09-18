"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";
import { decryptBlob, encryptState, getAppSecret, isEmptyBlob } from "./crypto";
import { fetchRemote, pushRemote, type RemoteRow } from "./sync-supabase";
import { useBudget } from "./store";
import {
  LEGACY_OWNER_KEY,
  STORAGE_KEY,
  defaultState,
  namespacedKey,
  readStateFromKey,
  setActiveStorageKey,
  setCacheWritesSuspended,
} from "./store-data";
import type { AppBudgetState } from "./types";

export type SyncStatus = "idle" | "syncing" | "error" | "conflict" | "offline" | "locked";

interface SyncContextValue {
  configured: boolean;
  session: Session | null;
  user: User | null;
  authLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  /** Sabit anahtar kullanılıyor; her zaman dolu gelir. Eski alan, uyumluluk için duruyor. */
  encPassword: string | null;
  setEncPassword: (pw: string | null, remember?: boolean) => void;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  remoteRev: number;
  syncError: string | null;
  conflict: RemoteRow | null;
  syncNow: () => Promise<void>;
  pullNow: () => Promise<void>;
  /** Eski parolayla kalmış bulutu ezer, yerel veriyi sabit anahtarla yazar (geçiş için). */
  forcePushLocal: () => Promise<void>;
  resolveConflict: (choice: "keep-mine" | "take-remote") => Promise<void>;
  clearConflict: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const REV_KEY = "myfinance-sync-rev";

function revKey(uid: string | null): string {
  return uid ? `${REV_KEY}:${uid}` : REV_KEY;
}

function readLocalRev(uid: string | null): number {
  try {
    const v = window.localStorage.getItem(revKey(uid));
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeLocalRev(uid: string | null, rev: number) {
  try {
    window.localStorage.setItem(revKey(uid), String(rev));
  } catch {
    /* yoksay */
  }
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* yoksay */
  }
}

function safeRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* yoksay */
  }
}

function isEmptyState(s: AppBudgetState): boolean {
  return (s.months?.length ?? 0) === 0 && (s.investments?.length ?? 0) === 0;
}

function statesEqual(a: AppBudgetState, b: AppBudgetState): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { state, loaded, importState } = useBudget();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Sabit anahtar: kullanıcıdan parola sorulmuyor
  const encPassword: string | null = getAppSecret();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [remoteRev, setRemoteRev] = useState<number>(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<RemoteRow | null>(null);

  const uid = session?.user?.id ?? null;
  const uidRef = useRef<string | null>(null);
  uidRef.current = uid;

  const applyingRemote = useRef(false);
  // Son senkronlanan/içe aktarılan state'in JSON'u. Aynı veri tekrar push edilmez,
  // böylece pull->import->push döngüsü rev'i durduk yere şişirmez.
  const lastSyncedJson = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitialPull = useRef(false);
  // İlk pull bitmeden push yapılırsa sahte çakışma çıkar (boş yerel + dolu bulut).
  // Bu bayrak açılana kadar doPush sessizce bekler.
  const initialPullDone = useRef(false);
  const revRef = useRef(0);

  /** rev'i hem state hem ref olarak birlikte günceller (async kapanımlarda bayat rev okunmaz). */
  const setRev = useCallback(
    (rev: number) => {
      revRef.current = rev;
      setRemoteRev(rev);
      writeLocalRev(uid, rev);
    },
    [uid]
  );

  const configured = isSupabaseConfigured();

  // --- auth init ---
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setAuthLoading(false);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_ev, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Eski alanla uyumluluk için no-op: artık sabit anahtar kullanılıyor
  const setEncPassword = useCallback((_pw: string | null, _remember = false) => {}, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return { ok: false as const, error: "Supabase yapılandırılmamış." };
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false as const, error: error.message };
    didInitialPull.current = false;
    initialPullDone.current = false;
    return { ok: true as const };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return { ok: false as const, error: "Supabase yapılandırılmamış." };
    const { data, error } = await sb.auth.signUp({ email: email.trim(), password });
    if (error) return { ok: false as const, error: error.message };
    // Confirm email açıksa session oluşmaz, kullanıcı maildeki linke tıklamadan giremez
    if (!data.session) {
      return {
        ok: false as const,
        error: "Kayıt oluştu, e-postana onay maili gönderildi. Maildeki linke tıkla, sonra Giriş yap.",
      };
    }
    didInitialPull.current = false;
    initialPullDone.current = false;
    return { ok: true as const };
  }, []);

  const signOut = useCallback(async () => {
    // Bekleyen otomatik yazma varsa iptal et: çıkış sonrası eski oturumla yazma olmasın
    if (pushTimer.current) clearTimeout(pushTimer.current);
    const curUid = uidRef.current;
    // Çıkış öncesi bulutta veri var mı? Varsa yerel temizlik güvenli.
    // (Çevrimdışıysa ya da bulut boşsa yereli koru — veri kaybı olmasın.)
    let cloudHasData = false;
    if (curUid) {
      try {
        const r = await fetchRemote();
        cloudHasData = !!(r.ok && r.row && !isEmptyBlob(r.row.blob));
      } catch {
        /* çevrimdışı: yereli koru */
      }
      // Arada hesap değiştiyse temizliği bu hesaba dokundurmadan bırak
      if (uidRef.current !== curUid) return;
    }
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setSession(null);
    setConflict(null);
    setSyncError(null);
    setSyncStatus("idle");
    didInitialPull.current = false;
    initialPullDone.current = false;
    lastSyncedJson.current = null;
    if (curUid && (cloudHasData || isEmptyState(state))) {
      // Bu hesaba ait yerel izleri sil: önbellek + rev. Başka hesabın verisi kalmaz.
      safeRemove(namespacedKey(curUid));
      safeRemove(revKey(curUid));
      if (safeGet(LEGACY_OWNER_KEY) === curUid) {
        safeRemove(STORAGE_KEY);
        safeRemove(LEGACY_OWNER_KEY);
      }
    }
    // Hafızayı sıfırla; yazma duraklatma sayesinde storage'a boş veri yazılmaz
    setCacheWritesSuspended(true);
    setActiveStorageKey(STORAGE_KEY);
    importState(defaultState());
  }, [state, importState]);

  // --- hesap değişiminde: yerel önbelleği o hesaba geçir ---
  // Aynı tarayıcıda başka hesaba girince önceki hesabın verileri gelmez.
  // Bildirilen effect sırası gereği bu effect ilk-pull effect'inden ÖNCE tanımlıdır.
  useEffect(() => {
    if (!loaded) return;
    // Önceki hesaptan kalma bekleyen yazma varsa iptal et
    if (pushTimer.current) clearTimeout(pushTimer.current);
    // Çıkıştaki yazma duraklatmayı kaldır (girişte normal önbellek yazılsın)
    setCacheWritesSuspended(false);
    if (!uid) {
      setActiveStorageKey(STORAGE_KEY);
      return;
    }
    const key = namespacedKey(uid);
    setActiveStorageKey(key);
    setRev(readLocalRev(uid));
    lastSyncedJson.current = null;
    setConflict(null);
    setSyncError(null);

    let cached = readStateFromKey(key);
    if (!cached) {
      // İlk giriş: eski tek anahtardaki veri bu hesaba aitse taşı,
      // başkasına aitse bulaştırmadan sıfırdan başla.
      const owner = safeGet(LEGACY_OWNER_KEY);
      const legacyRaw = safeGet(STORAGE_KEY);
      const legacy = legacyRaw !== null ? readStateFromKey(STORAGE_KEY) : null;
      if (legacy && legacyRaw !== null && (owner === null || owner === uid)) {
        safeSet(key, legacyRaw);
        cached = legacy;
        safeSet(LEGACY_OWNER_KEY, uid);
      } else if (!legacy && owner === null) {
        safeSet(LEGACY_OWNER_KEY, uid);
      }
    }
    applyingRemote.current = true;
    importState(cached ?? defaultState());
    setTimeout(() => {
      applyingRemote.current = false;
    }, 500);
    didInitialPull.current = false;
    initialPullDone.current = false;
  }, [uid, loaded, importState, setRev]);

  // --- pull ---
  const pullNow = useCallback(async () => {
    const pw = getAppSecret();
    if (!session) return;
    const startUid = session.user.id;
    setSyncStatus("syncing");
    setSyncError(null);
    const r = await fetchRemote();
    // Arada hesap değişti/çıkış yapıldıysa sonucu işletme
    if (uidRef.current !== startUid) return;
    if (!r.ok) {
      setSyncStatus("error");
      setSyncError(r.error);
      return;
    }
    if (!r.row || isEmptyBlob(r.row.blob)) {
      // Bulut boş: yerel rev sıfırla, ilk push yerel veriyi gönderecek
      setRev(0);
      setSyncStatus("idle");
      setLastSyncedAt(new Date().toISOString());
      return;
    }
    if (r.row.rev <= revRef.current) {
      setSyncStatus("idle");
      return;
    }
    const dec = await decryptBlob(r.row.blob, pw);
    if (uidRef.current !== startUid) return;
    if (!dec.ok) {
      // Büyük olasılıkla eski kullanıcı parolasıyla kalmış veri (sabit anahtara geçiş)
      setSyncStatus("locked");
      setSyncError("Buluttaki veri eski parolayla şifreli. Ayarlar'daki 'Bulutu sıfırla' ile yerel veriyi yaz.");
      return;
    }
    applyingRemote.current = true;
    importState(dec.state);
    // importState -> state değişir ama applyingRemote bayrağı + lastSyncedJson push'u engeller
    setTimeout(() => {
      applyingRemote.current = false;
    }, 500);
    try {
      lastSyncedJson.current = JSON.stringify(dec.state);
    } catch {
      /* yoksay */
    }
    setRev(r.row.rev);
    setLastSyncedAt(new Date().toISOString());
    setSyncStatus("idle");
  }, [session, importState, setRev]);

  /**
   * Sahte çakışmaları dialog göstermeden sessizce çözer.
   * true dönerse ortada sorun kalmadı (rev eşitlendi / veri alındı / yazıldı).
   * Dialog SADECE iki tarafta da farklı gerçek veri varsa gösterilir.
   */
  const autoSettle = useCallback(
    async (remote: RemoteRow, pw: string, startUid: string | null): Promise<boolean> => {
      const dec = await decryptBlob(remote.blob, pw);
      if (uidRef.current !== startUid) return true; // hesap değişti: sessizce vazgeç
      if (!dec.ok) return false; // çözülemiyorsa kullanıcı kararı gerekir
      const localEmpty = isEmptyState(state);
      const remoteEmpty = isEmptyState(dec.state);
      if (statesEqual(state, dec.state) || (localEmpty && remoteEmpty)) {
        // Aynı veri (örn. iki tarafta da boş): rev'i benimse, dialog yok
        try {
          lastSyncedJson.current = JSON.stringify(state);
        } catch {
          /* yoksay */
        }
        setRev(remote.rev);
        setLastSyncedAt(new Date().toISOString());
        setSyncStatus("idle");
        return true;
      }
      if (localEmpty && !remoteEmpty) {
        // Yerelde bir şey yok, bulutu sessizce al
        applyingRemote.current = true;
        importState(dec.state);
        setTimeout(() => {
          applyingRemote.current = false;
        }, 500);
        try {
          lastSyncedJson.current = JSON.stringify(dec.state);
        } catch {
          /* yoksay */
        }
        setRev(remote.rev);
        setLastSyncedAt(new Date().toISOString());
        setSyncStatus("idle");
        return true;
      }
      if (!localEmpty && remoteEmpty) {
        // Bulut boş, yerelde veri var: rev'e eşitlenip tek seferlik yaz
        if (uidRef.current !== startUid) return true;
        const blob = await encryptState(state, pw);
        const retry = await pushRemote(blob, remote.rev);
        if (retry.ok) {
          try {
            lastSyncedJson.current = JSON.stringify(state);
          } catch {
            /* yoksay */
          }
          setRev(retry.rev);
          setLastSyncedAt(new Date().toISOString());
          setSyncStatus("idle");
          return true;
        }
        return false;
      }
      return false; // iki tarafta da farklı veri: kullanıcı seçsin
    },
    [state, importState, setRev]
  );

  // --- push (debounce ile çağrılır) ---
  const doPush = useCallback(async () => {
    const pw = getAppSecret();
    if (!session || !loaded) return;
    const startUid = session.user.id;
    if (!initialPullDone.current) return; // ilk pull bitmeden yazma: sahte çakışma olur
    if (syncStatus === "locked") return; // eski şifreli bulut: sadece "Bulutu sıfırla" ezer
    if (applyingRemote.current) return;
    if (conflict) return; // çakışma çözülmeden ezme
    try {
      const js = JSON.stringify(state);
      if (lastSyncedJson.current !== null && js === lastSyncedJson.current) {
        // Veri değişmedi (örn. buluttan yeni alındı): gereksiz yazma yok, rev şişmez
        setSyncStatus("idle");
        return;
      }
    } catch {
      /* karşılaştırma başarısızsa yazmaya devam et */
    }
    setSyncStatus("syncing");
    setSyncError(null);
    try {
      const blob = await encryptState(state, pw);
      // Şifreleme sürerken hesap değiştiyse yanlış hesaba yazma
      if (uidRef.current !== startUid) return;
      const res = await pushRemote(blob, revRef.current);
      if (uidRef.current !== startUid) return;
      if (res.ok) {
        try {
          lastSyncedJson.current = JSON.stringify(state);
        } catch {
          /* yoksay */
        }
        setRev(res.rev);
        setLastSyncedAt(new Date().toISOString());
        setSyncStatus("idle");
      } else if (res.conflict && res.remote) {
        const settled = await autoSettle(res.remote, pw, startUid);
        if (uidRef.current !== startUid) return;
        if (!settled) {
          setConflict(res.remote);
          setSyncStatus("conflict");
        }
      } else if (res.conflict) {
        // remote satırı okunamadıysa en azından conflict durumuna geç
        setSyncStatus("conflict");
        setSyncError(res.error);
      } else {
        setSyncStatus("error");
        setSyncError(res.error);
      }
    } catch (e) {
      setSyncStatus("error");
      setSyncError(e instanceof Error ? e.message : "Yazma hatası");
    }
  }, [session, loaded, state, conflict, syncStatus, autoSettle, setRev]);

  const syncNow = useCallback(async () => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    await doPush();
  }, [doPush]);

  /** Eski şifreli bulutu ezer: remote rev'e eşitlenip yerel veri sabit anahtarla yazılır. */
  const forcePushLocal = useCallback(async () => {
    const pw = getAppSecret();
    if (!session || !loaded) return;
    const startUid = session.user.id;
    setSyncStatus("syncing");
    setSyncError(null);
    try {
      const r = await fetchRemote();
      if (uidRef.current !== startUid) return;
      const base = r.ok && r.row ? r.row.rev : 0;
      setRev(base);
      setConflict(null);
      const blob = await encryptState(state, pw);
      if (uidRef.current !== startUid) return;
      const res = await pushRemote(blob, base);
      if (uidRef.current !== startUid) return;
      if (res.ok) {
        try {
          lastSyncedJson.current = JSON.stringify(state);
        } catch {
          /* yoksay */
        }
        setRev(res.rev);
        setLastSyncedAt(new Date().toISOString());
        setSyncStatus("idle");
        initialPullDone.current = true;
      } else if (res.conflict && res.remote) {
        setConflict(res.remote);
        setSyncStatus("conflict");
      } else {
        setSyncStatus("error");
        setSyncError(res.error);
      }
    } catch (e) {
      setSyncStatus("error");
      setSyncError(e instanceof Error ? e.message : "Yazma hatası");
    }
  }, [session, loaded, state, setRev]);

  const resolveConflict = useCallback(
    async (choice: "keep-mine" | "take-remote") => {
      const pw = getAppSecret();
      if (!conflict || !session) return;
      const startUid = session.user.id;
      if (choice === "take-remote") {
        const dec = await decryptBlob(conflict.blob, pw);
        if (uidRef.current !== startUid) return;
        if (!dec.ok) {
          setSyncStatus("locked");
          setSyncError(dec.error);
          return;
        }
        applyingRemote.current = true;
        importState(dec.state);
        setTimeout(() => {
          applyingRemote.current = false;
        }, 500);
        try {
          lastSyncedJson.current = JSON.stringify(dec.state);
        } catch {
          /* yoksay */
        }
        setRev(conflict.rev);
        setConflict(null);
        setSyncStatus("idle");
        setLastSyncedAt(new Date().toISOString());
      } else {
        // keep-mine: remote rev'e eşitleyip zorla yaz (revRef de anında güncellenir)
        if (uidRef.current !== startUid) return;
        setRev(conflict.rev);
        setConflict(null);
        setSyncStatus("idle");
        await syncNow();
      }
    },
    [conflict, session, importState, syncNow, setRev]
  );

  const clearConflict = useCallback(() => {
    setConflict(null);
    if (syncStatus === "conflict") setSyncStatus("idle");
  }, [syncStatus]);

  // --- ilk pull: login + budget yüklendiğinde (bitmeden push yok) ---
  // Hesap-geçiş effect'inden SONRA tanımlıdır: önce önbellek hesaba geçer, sonra pull başlar.
  useEffect(() => {
    if (!session || !loaded || didInitialPull.current) return;
    didInitialPull.current = true;
    const startUid = uid;
    void (async () => {
      await pullNow();
      // Arada başka hesaba geçildiyse bu pull'un sonucunu işletme
      if (uidRef.current !== startUid) return;
      initialPullDone.current = true;
      // Bulut boşsa (yeni hesap) hesap önbelleğindeki veriyi ilk kez yaz
      await syncNow();
    })();
  }, [session, uid, loaded, pullNow, syncNow]);

  // --- state değişiminde debounce push ---
  useEffect(() => {
    if (!session || !loaded) return;
    if (!initialPullDone.current) return; // ilk pull bitmeden yazma
    if (syncStatus === "locked") return; // eski şifreli bulut varken otomatik ezme, kullanıcı sıfırlasın
    if (applyingRemote.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void doPush();
    }, 900);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [state, session, loaded, doPush, syncStatus]);

  // --- realtime: başka cihaz yazınca çek ---
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !session) return;
    const ch = sb
      .channel("budget_states_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budget_states", filter: `user_id=eq.${session.user.id}` },
        () => {
          void pullNow();
        }
      )
      .subscribe();
    return () => {
      void sb.removeChannel(ch);
    };
  }, [session, pullNow]);

  // --- online olunca senkron ---
  useEffect(() => {
    const onOnline = () => {
      if (session) void pullNow();
    };
    const onVis = () => {
      if (document.visibilityState === "visible" && session) void pullNow();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [session, pullNow]);

  const value = useMemo<SyncContextValue>(
    () => ({
      configured,
      session,
      user: session?.user ?? null,
      authLoading,
      signIn,
      signUp,
      signOut,
      encPassword,
      setEncPassword,
      syncStatus,
      lastSyncedAt,
      remoteRev,
      syncError,
      conflict,
      syncNow,
      pullNow,
      forcePushLocal,
      resolveConflict,
      clearConflict,
    }),
    [
      configured,
      session,
      authLoading,
      signIn,
      signUp,
      signOut,
      encPassword,
      setEncPassword,
      syncStatus,
      lastSyncedAt,
      remoteRev,
      syncError,
      conflict,
      syncNow,
      pullNow,
      forcePushLocal,
      resolveConflict,
      clearConflict,
    ]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
}
