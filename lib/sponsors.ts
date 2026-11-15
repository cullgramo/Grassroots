/**
 * "Presented by" slots. Sponsors are added by the owner in the database (table sponsors); the app shows the most
 * specific live one for what is on screen: a club's sponsor beats a competition's, which beats a county's, which beats
 * one for all of Ireland. Views (once per sponsor per session) and taps are counted for the sponsor's monthly report.
 */
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/config';
import { fetchT } from '@/lib/http';
import { reportTo } from '@/lib/report';
import { rpc } from '@/lib/rpc';

export interface Sponsor {
  id: string;
  name: string;
  tagline: string | null;
  url: string | null;
  scope: 'all' | 'county' | 'competition' | 'club';
  scopeValue: string | null;
}

export interface SponsorContext {
  clubs?: (string | undefined)[];
  competition?: string;
  county?: string;
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
const RANK: Record<Sponsor['scope'], number> = { club: 0, competition: 1, county: 2, all: 3 };

/** The sponsor to show for this context, or null. Ties go to the first listed. */
export function pickSponsor(sponsors: Sponsor[], ctx: SponsorContext): Sponsor | null {
  const clubs = new Set((ctx.clubs ?? []).map(norm).filter(Boolean));
  const fits = sponsors.filter((s) => {
    if (s.scope === 'all') return true;
    const v = norm(s.scopeValue);
    if (s.scope === 'club') return clubs.has(v);
    if (s.scope === 'competition') return v !== '' && v === norm(ctx.competition);
    return v !== '' && v === norm(ctx.county);
  });
  fits.sort((a, b) => RANK[a.scope] - RANK[b.scope]);
  return fits[0] ?? null;
}

let cache: { at: number; list: Promise<Sponsor[]> } | null = null;
const TTL = 30 * 60_000;

/** Live sponsors, loaded once and kept for half an hour. An empty list on any failure: a slot is never worth an error. */
export function liveSponsors(now = Date.now()): Promise<Sponsor[]> {
  if (cache && now - cache.at < TTL) return cache.list;
  const list = fetchT(`${SUPABASE_URL}/rest/v1/sponsors?select=id,name,tagline,url,scope,scope_value&order=created_at.asc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Sponsors request failed (${res.status})`);
      const rows = (await res.json()) as { id: string; name: string; tagline: string | null; url: string | null; scope: Sponsor['scope']; scope_value: string | null }[];
      return rows.map((r) => ({ id: r.id, name: r.name, tagline: r.tagline, url: r.url, scope: r.scope, scopeValue: r.scope_value }));
    })
    .catch((e) => {
      reportTo('loading sponsors')(e);
      cache = null; // try again next time
      return [] as Sponsor[];
    });
  cache = { at: now, list };
  return list;
}

const seen = new Set<string>();

export function countSponsor(id: string, action: 'view' | 'tap'): void {
  if (action === 'view') {
    if (seen.has(id)) return;
    seen.add(id);
  }
  rpc('count_sponsor', { p_sponsor: id, p_action: action }, fetch, 5_000).catch(reportTo(`counting a sponsor ${action}`));
}

/** For tests. */
export function resetSponsors(): void {
  cache = null;
  seen.clear();
}
