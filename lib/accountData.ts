/**
 * What an account keeps in step across phones and the website: saved fixtures, followed clubs and the person's own
 * choices. One row per person in public.user_data (supabase/migrations/0012_accounts.sql); row level security means a
 * person can only ever read or write their own.
 */
import type { Session } from '@/lib/auth';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/config';
import { fetchT } from '@/lib/http';
import type { AgeFilter } from '@/utils/ageGroup';
import { isGenderFilter, type GenderFilter } from '@/utils/category';
import type { FollowedClub } from '@/utils/club';

export interface SyncedData {
  saved: string[];
  clubs: FollowedClub[];
  /** Empty means every sport. */
  sports: string[];
  age: AgeFilter;
  gender: GenderFilter;
  county: string | null;
}

const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.length <= 200).slice(0, max) : []);

/** Checks data read back from the server: anything missing or odd becomes the default, never a crash. */
export function cleanData(raw: unknown): SyncedData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const clubs = Array.isArray(r.clubs)
    ? (r.clubs as any[]).filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.group === 'string').slice(0, 500)
        .map((c) => ({ id: c.id, name: c.name, group: c.group }))
    : [];
  return {
    saved: strings(r.saved, 2000),
    clubs,
    sports: strings(r.sports, 50),
    age: r.age === 'adult' || r.age === 'underage' ? r.age : 'all',
    gender: isGenderFilter(r.gender) ? r.gender : 'all',
    county: typeof r.county === 'string' && r.county.length <= 40 && r.county ? r.county : null,
  };
}

/**
 * The first sign-in on a phone: nothing is lost from either side. Saved fixtures, clubs and sports are added together;
 * for the single choices the account wins where it has one (it was set up first), and the phone fills any gaps.
 */
export function mergeData(phone: SyncedData, account: SyncedData | null): SyncedData {
  if (!account) return phone;
  const clubs = [...account.clubs];
  for (const c of phone.clubs) if (!clubs.some((x) => x.id === c.id)) clubs.push(c);
  // An empty sports list means "every sport", so only add the lists together when both chose some.
  const sports = account.sports.length && phone.sports.length ? [...new Set([...account.sports, ...phone.sports])] : account.sports.length ? account.sports : phone.sports;
  return {
    saved: [...new Set([...account.saved, ...phone.saved])],
    clubs,
    sports,
    age: account.age !== 'all' ? account.age : phone.age,
    gender: account.gender !== 'all' ? account.gender : phone.gender,
    county: account.county ?? phone.county,
  };
}

const headers = (s: Session) => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${s.accessToken}`, 'Content-Type': 'application/json' });

/** The account's saved data, or null when nothing has been saved to it yet. */
export async function fetchData(s: Session, fetchImpl: typeof fetch = fetch): Promise<SyncedData | null> {
  const res = await fetchT(`${SUPABASE_URL}/rest/v1/user_data?select=data`, { headers: headers(s) }, 15_000, fetchImpl);
  if (!res.ok) throw new Error(`Could not read your account (${res.status})`);
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? cleanData(rows[0].data) : null;
}

export async function saveData(s: Session, data: SyncedData, fetchImpl: typeof fetch = fetch): Promise<void> {
  const res = await fetchT(`${SUPABASE_URL}/rest/v1/user_data?on_conflict=user_id`, {
    method: 'POST',
    headers: { ...headers(s), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: s.user.id, data }),
  }, 15_000, fetchImpl);
  if (!res.ok) throw new Error(`Could not save to your account (${res.status})`);
}
