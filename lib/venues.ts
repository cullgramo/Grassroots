import { countyFor } from '@/data/counties';

export interface Venue {
  name: string;
  county: string;
  latitude: number;
  longitude: number;
}

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function fetchVenues(): Promise<Venue[]> {
  const res = await fetch(`${BASE}/rest/v1/venues?select=name,county,latitude,longitude&limit=5000`, {
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`Venues request failed (${res.status})`);
  return res.json();
}

const simple = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Finds a ground we already know, by its name or by the first part of a longer name. */
export function matchVenue(name: string, venues: Venue[]): Venue | null {
  const wanted = simple(name);
  if (!wanted) return null;
  const firstPart = simple(name.split(',')[0]);
  return (
    venues.find((v) => simple(v.name) === wanted) ??
    venues.find((v) => simple(v.name) === firstPart) ??
    venues.find((v) => simple(v.name.split(/,| - /)[0]) === firstPart) ??
    null
  );
}

/** The searches to try for a ground, most specific first. Long sponsor names often only match in part. */
export function searchQueries(name: string): string[] {
  const parts = name.split(',').map((p) => p.trim()).filter(Boolean);
  return [...new Set([name, parts[0], parts[parts.length - 1]])].filter(Boolean);
}

let lastSearch = 0;

/** Looks a place up on OpenStreetMap. It asks for no more than one search a second. */
export async function searchPlace(query: string, keepName?: string): Promise<Venue | null> {
  const wait = lastSearch + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastSearch = Date.now();
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=ie,gb' +
    `&q=${encodeURIComponent(`${query}, Ireland`)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const [hit] = (await res.json()) as { lat: string; lon: string; address?: Record<string, string> }[];
  if (!hit) return null;
  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!(latitude >= 51 && latitude <= 56 && longitude >= -11 && longitude <= -5)) return null;
  const a = hit.address ?? {};
  return { name: keepName ?? query, county: countyFor([a.county, a.state_district, a.city, a.state], latitude, longitude), latitude, longitude };
}

/** Tries each likely search for a ground until one is found. */
export async function findVenue(name: string): Promise<Venue | null> {
  for (const q of searchQueries(name)) {
    const hit = await searchPlace(q, name).catch(() => null);
    if (hit) return hit;
  }
  return null;
}

export async function saveFixtures(secret: string, fixtures: unknown[]): Promise<{ saved: number }> {
  const res = await fetch(`${BASE}/functions/v1/add-fixtures`, {
    method: 'POST',
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, fixtures }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error([body.error ?? `Could not save (${res.status})`, ...(body.problems ?? [])].join('\n'));
  return body;
}
