import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useApp } from '@/context/AppContext';
import { cleanData, fetchData, mergeData, saveData, type SyncedData } from '@/lib/accountData';
import * as auth from '@/lib/auth';
import { reportTo } from '@/lib/report';
import { clearSession, readSession, writeSession } from '@/lib/sessionStore';

type Status = 'starting' | 'signedOut' | 'signedIn';

interface AccountState {
  status: Status;
  email: string | null;
  /** 'offline' means the latest change is kept on the phone and will be sent when the account can be reached. */
  sync: 'idle' | 'saving' | 'saved' | 'offline';
  sendCode: (email: string) => Promise<void>;
  /** Signs in and merges this phone's saved items with the account's, so nothing is lost on either side. */
  signIn: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Everything held about the person, as pretty-printed JSON (GDPR access and portability). */
  exportData: () => Promise<string>;
  /** Deletes the account and everything stored with it, then signs out. */
  deleteAccount: () => Promise<void>;
}

/** Set while a change has not reached the account yet, so the next launch sends it rather than reading over it. */
const DIRTY_KEY = 'grassroots.accountDirty';

const AccountContext = createContext<AccountState | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { syncedData, syncedLoaded, applySyncedData } = useApp();
  const [session, setSession] = useState<auth.Session | null>(null);
  const [status, setStatus] = useState<Status>('starting');
  const [sync, setSync] = useState<AccountState['sync']>('idle');
  // The data as the account last had it, so a change pulled from the account is not sent straight back.
  const lastSent = useRef<string | null>(null);
  const ready = useRef(false);
  const sessionRef = useRef<auth.Session | null>(null);
  const refreshing = useRef<Promise<auth.Session> | null>(null);

  const keep = useCallback(async (s: auth.Session | null) => {
    sessionRef.current = s;
    setSession(s);
    setStatus(s ? 'signedIn' : 'signedOut');
    if (s) await writeSession(JSON.stringify(s)).catch(reportTo('saving the sign-in'));
    else {
      ready.current = false;
      lastSent.current = null;
      setSync('idle');
      await clearSession().catch(reportTo('removing the sign-in'));
      await AsyncStorage.removeItem(DIRTY_KEY).catch(() => undefined);
    }
  }, []);

  /** A session whose access token works for at least another minute. Signs out if the account has ended. */
  const fresh = useCallback(async (): Promise<auth.Session> => {
    const s = sessionRef.current;
    if (!s) throw new auth.AuthError('Sign in first.');
    if (s.expiresAt - 60_000 > Date.now()) return s;
    refreshing.current ??= auth
      .refresh(s)
      .then(async (next) => {
        await keep(next);
        return next;
      })
      .catch(async (e) => {
        // 400/401: the refresh token was revoked (signed out everywhere, or the account was deleted elsewhere).
        if (e instanceof auth.AuthError && (e.status === 400 || e.status === 401)) await keep(null);
        throw e;
      })
      .finally(() => (refreshing.current = null));
    return refreshing.current;
  }, [keep]);

  const push = useCallback(
    async (data: SyncedData) => {
      const json = JSON.stringify(data);
      await AsyncStorage.setItem(DIRTY_KEY, '1').catch(() => undefined);
      setSync('saving');
      try {
        await saveData(await fresh(), data);
        lastSent.current = json;
        await AsyncStorage.removeItem(DIRTY_KEY).catch(() => undefined);
        setSync('saved');
      } catch {
        setSync(sessionRef.current ? 'offline' : 'idle');
      }
    },
    [fresh]
  );

  // Start-up: read the sign-in kept on the phone.
  useEffect(() => {
    readSession()
      .then((raw) => {
        if (!raw) return keep(null);
        const s = JSON.parse(raw) as auth.Session;
        if (typeof s?.refreshToken !== 'string' || typeof s?.user?.id !== 'string') return keep(null);
        sessionRef.current = s;
        setSession(s);
        setStatus('signedIn');
      })
      .catch((e) => {
        reportTo('reading the sign-in')(e);
        setStatus('signedOut');
      });
  }, [keep]);

  // Once signed in and the phone's own choices are read: send changes made offline, or take the account's copy.
  useEffect(() => {
    if (status !== 'signedIn' || !syncedLoaded || ready.current) return;
    ready.current = true;
    (async () => {
      const dirty = (await AsyncStorage.getItem(DIRTY_KEY).catch(() => null)) === '1';
      if (dirty) return push(syncedData);
      try {
        const account = await fetchData(await fresh());
        if (!account) return push(syncedData);
        lastSent.current = JSON.stringify(account);
        applySyncedData(account);
        setSync('saved');
      } catch {
        // Offline at start-up: keep using the phone's copy, and try again on the next change.
        ready.current = !!sessionRef.current;
        setSync(sessionRef.current ? 'offline' : 'idle');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per sign-in, with the data as it is then
  }, [status, syncedLoaded]);

  // Every change while signed in reaches the account a moment later (one request for a burst of taps).
  useEffect(() => {
    if (status !== 'signedIn' || !ready.current) return;
    if (JSON.stringify(syncedData) === lastSent.current) return;
    const timer = setTimeout(() => push(syncedData), 1500);
    return () => clearTimeout(timer);
  }, [status, syncedData, push]);

  const sendCode = useCallback((email: string) => auth.sendCode(email), []);

  const signIn = useCallback(
    async (email: string, code: string) => {
      const s = await auth.verifyCode(email, code);
      sessionRef.current = s;
      const account = await fetchData(s).catch(() => null);
      const merged = mergeData(cleanData(syncedData), account);
      applySyncedData(merged);
      ready.current = true;
      await keep(s);
      await push(merged);
    },
    [syncedData, applySyncedData, keep, push]
  );

  const signOut = useCallback(async () => {
    const s = sessionRef.current;
    await keep(null);
    if (s) await auth.signOutRemote(s).catch(() => undefined);
  }, [keep]);

  const exportData = useCallback(async () => {
    const s = await fresh();
    const [account, data] = await Promise.all([auth.fetchAccount(s), fetchData(s)]);
    return JSON.stringify({ exported_at: new Date().toISOString(), account, saved_in_account: data ?? {} }, null, 2);
  }, [fresh]);

  const deleteAccount = useCallback(async () => {
    await auth.deleteAccount(await fresh());
    await keep(null);
  }, [fresh, keep]);

  const value = useMemo(
    () => ({ status, email: session?.user.email ?? null, sync, sendCode, signIn, signOut, exportData, deleteAccount }),
    [status, session, sync, sendCode, signIn, signOut, exportData, deleteAccount]
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountState {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider');
  return ctx;
}
