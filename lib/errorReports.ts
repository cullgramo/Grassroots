/**
 * Sends the app's faults to our own database (supabase/migrations/0011_app_errors.sql), so a problem on someone
 * else's phone is seen. It plugs into lib/report.ts, which every caught failure already goes through, and adds the
 * failures nothing caught. Only a short technical message is sent: nothing about the person.
 *
 * shortcut: uncaught promise rejections on a phone, and crashes in the phone's own (non-JavaScript) code, are not
 * caught here. Upgrade to a crash service if the store consoles show crashes this does not explain.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { backendConfigured } from '@/lib/fixtures';
import { report, setReporter } from '@/lib/report';
import { rpc } from '@/lib/rpc';

const MESSAGE_MAX = 300;
const PLACE_MAX = 80;
/** A fault that repeats must not send a request each time: one of each per session, and a small number in all. */
export const MAX_PER_SESSION = 20;

/** The error as a short line with anything that could identify a person or carry a key taken out. */
export function scrub(error: unknown): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return text
    .replace(/\?[^\s"')]*/g, '') // query strings can carry keys and search words
    .replace(/[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+/g, '[email]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MESSAGE_MAX);
}

/** Decides what is sent: each different fault once per session, up to the session's limit. */
export function makeSender(send: (place: string, message: string) => void, max = MAX_PER_SESSION) {
  const sent = new Set<string>();
  return (error: unknown, where: string): boolean => {
    const place = where.trim().slice(0, PLACE_MAX);
    const message = scrub(error);
    const key = `${place}|${message}`;
    if (!place || !message || sent.has(key) || sent.size >= max) return false;
    sent.add(key);
    send(place, message);
    return true;
  };
}

let started = false;

/** Call once when the app starts. Does nothing while developing, where faults are printed instead. */
export function startErrorReports(): void {
  if (started || __DEV__ || !backendConfigured) return;
  started = true;
  const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
  const version = Constants.expoConfig?.version ?? '';
  setReporter(
    makeSender((place, message) => {
      // A failed report is dropped: reporting it would only loop.
      rpc('report_error', { p_place: place, p_message: message, p_platform: platform, p_version: version }).catch(() => {});
    }),
  );

  // Failures that nothing caught.
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (e) => report(e.error ?? e.message, 'uncaught error'));
      window.addEventListener('unhandledrejection', (e) => report(e.reason, 'uncaught promise'));
    }
    return;
  }
  const utils = (globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } }).ErrorUtils;
  if (!utils) return;
  const before = utils.getGlobalHandler();
  utils.setGlobalHandler((e, fatal) => {
    report(e, fatal ? 'app crashed' : 'uncaught error');
    before(e, fatal);
  });
}
