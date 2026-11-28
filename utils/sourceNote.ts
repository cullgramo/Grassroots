// The line under a fixture that says where it came from and when it was last checked, so people (and clubs) can see
// how fresh it is and check the original themselves.
import type { Fixture } from '@/types/fixture';

export interface SourceNote {
  text: string;
  /** The page to open, when the source gives one. */
  url?: string;
}

/** "offaly.clubandcounty.com" from a full address; null for anything that isn't a web address. */
export function siteName(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** "today at 05:10", "yesterday at 05:10", "on Tue 24 Nov": Irish time. */
export function checkedLabel(iso: string, now: Date = new Date()): string {
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Dublin' }).format(d);
  const t = new Date(iso);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Dublin' }).format(t);
  if (day(t) === day(now)) return `today at ${time}`;
  if (day(t) === day(new Date(now.getTime() - 86_400_000))) return `yesterday at ${time}`;
  return `on ${new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Dublin' }).format(t)}`;
}

export function sourceNote(f: Pick<Fixture, 'source' | 'sourceUrl' | 'checkedAt'>, now: Date = new Date()): SourceNote | null {
  const site = siteName(f.sourceUrl);
  const url = site ? f.sourceUrl : undefined;
  // A snapshot is a saved copy of a page the league doesn't let us read daily: it is re-saved each day, but nothing
  // was checked, so it must not say "checked today".
  if (f.source?.endsWith('-snapshot')) {
    return { text: `From a saved copy of the fixture list${site ? ` on ${site}` : ''}, not checked daily. Check with the club before you travel.`, url };
  }
  if (f.source === 'admin' || f.source === 'user') {
    return { text: 'Added by hand by Grassroots. Check with the club before you travel.', url };
  }
  const checked = f.checkedAt && !Number.isNaN(new Date(f.checkedAt).getTime()) ? `, checked ${checkedLabel(f.checkedAt, now)}` : '';
  if (!site && !checked) return null;
  return { text: `From ${site ?? 'the organiser'}${checked}`, url };
}
