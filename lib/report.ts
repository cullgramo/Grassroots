/**
 * One place for "something went wrong that the user does not need to see". Failures used to be swallowed with an empty
 * catch, so a broken cache, preference or load left no trace anywhere. Now each is reported here with where it happened.
 *
 * - In development it is printed to the console.
 * - The last 30 are kept in memory (see recentErrors) so a settings or debug screen can show them.
 * - setReporter plugs in a crash service. To use Sentry: install @sentry/react-native, call Sentry.init, then
 *   setReporter((error, where) => Sentry.captureException(error, { tags: { where } })) once at start-up.
 */
export interface ReportedError {
  at: string;
  where: string;
  message: string;
}

type Reporter = (error: unknown, where: string) => void;

const MAX_KEPT = 30;
const kept: ReportedError[] = [];
let reporter: Reporter | null = null;

export function setReporter(fn: Reporter | null): void {
  reporter = fn;
}

export function report(error: unknown, where: string): void {
  const message = error instanceof Error ? error.message : String(error);
  kept.push({ at: new Date().toISOString(), where, message });
  if (kept.length > MAX_KEPT) kept.shift();
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn(`[grassroots] ${where}: ${message}`);
  try {
    reporter?.(error, where);
  } catch {
    // a failing reporter must never break the app
  }
}

/** For promise chains: `.catch(reportTo('saving the age choice'))`. */
export const reportTo = (where: string) => (error: unknown) => report(error, where);

export const recentErrors = (): ReportedError[] => [...kept];
export const clearRecentErrors = (): void => {
  kept.length = 0;
};
