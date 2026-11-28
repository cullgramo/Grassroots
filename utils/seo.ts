// What each web page tells Google and chat apps about itself: its title, description and address.
// One place for the wording, so every page reads the same way. Shown by components/PageMeta.tsx.
import { getSport } from '@/constants/sports';
import { COUNTIES } from '@/data/counties';
import { fixtureTitle, type Fixture } from '@/types/fixture';
import { irishParts } from '@/utils/share';

export interface Meta {
  title: string;
  description: string;
  /** The page's own address, from the site root: "/county/offaly". */
  path: string;
}

const SITE = 'Grassroots';
const withSite = (t: string) => `${t} | ${SITE}`;

export const HOME_META: Meta = {
  title: `${SITE}: every game in Ireland, all sports, all levels`,
  description:
    'Find GAA, soccer, rugby, basketball, hockey and more near you, from underage to senior. Times, grounds and directions, free.',
  path: '/',
};

/** "offaly" for Offaly: the county part of a county page's address. */
export const countySlug = (county: string) => county.toLowerCase().replace(/\s+/g, '-');

/** The county a page address names, in its proper spelling, or null for anything that is not a county. */
export function countyFromSlug(slug: string | undefined): string | null {
  const s = (slug ?? '').toLowerCase().trim();
  return COUNTIES.find((c) => countySlug(c) === s) ?? null;
}

export function countyMeta(county: string): Meta {
  return {
    title: withSite(`${county} fixtures this week: every sport`),
    description: `Every game in ${county}: GAA, soccer, rugby, hockey and more, with times and grounds. Updated every morning.`,
    path: `/county/${countySlug(county)}`,
  };
}

/** A club page. `sport` is the sport family ("gaa", "soccer"), `county` where its games are, when known. */
export function clubMeta(name: string, opts: { county?: string | null; sportLabel?: string | null; group?: string | null } = {}): Meta {
  const what = opts.sportLabel ? `${name} ${opts.sportLabel}` : name;
  return {
    title: withSite(`${what} fixtures`),
    description: `Upcoming ${what} games${opts.county ? ` in ${opts.county}` : ''}, with times, grounds and directions. Free, for every sport and every level.`,
    path: clubPath(name, opts.group),
  };
}

export const clubPath = (name: string, group?: string | null) =>
  `/club/${encodeURIComponent(name)}${group ? `?sport=${encodeURIComponent(group)}` : ''}`;

/** "Thu 12 Nov": short enough for a search result title. */
function shortDay(startsAt: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Dublin' }).format(new Date(startsAt));
  } catch {
    return new Date(startsAt).toDateString().slice(0, 10);
  }
}

/** A fixture. Its address is the shared-link page (/f/<id>), which is built on the server and readable without the app. */
export function fixtureMeta(f: Fixture): Meta {
  const sport = getSport(f.sport);
  const { time } = irishParts(f.startsAt);
  const start = f.timeTbc ? 'Time to be confirmed.' : `${sport.startWord ?? 'Starts'} ${time}.`;
  const off = f.status === 'cancelled' ? 'Cancelled. ' : f.status === 'postponed' ? 'Postponed. ' : '';
  return {
    title: withSite(`${fixtureTitle(f)}, ${shortDay(f.startsAt)}`),
    description: `${off}${f.competition ? `${f.competition}, ` : ''}${sport.name} at ${f.venue}, ${f.county}. ${start} Directions and tickets on Grassroots.`,
    path: `/f/${encodeURIComponent(f.id)}`,
  };
}

/**
 * Whether a fixture's page may appear in Google. Children's games (underage and schools) are kept out: the app still
 * shows them, but search engines are not given a list of where and when children will be.
 */
export const searchable = (f: Pick<Fixture, 'ageGroup'>): boolean => f.ageGroup !== 'underage' && f.ageGroup !== 'schools';

/**
 * The same details in the form the website build reads from a page's `generateMetadata` export. Pages that are built
 * ahead of time (home, the 32 county pages) carry them in their HTML, so Google and chat apps see them without
 * running the app. Pages built in the browser (clubs, fixtures) set them as they load, through components/PageMeta.tsx.
 */
export function toMetadata(meta: Meta, site: string | null) {
  const base = (site ?? '').replace(/\/+$/, '');
  const url = base ? `${base}${meta.path}` : undefined;
  return {
    title: meta.title,
    description: meta.description,
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      title: meta.title,
      description: meta.description,
      siteName: SITE,
      type: 'website',
      ...(url ? { url, images: [{ url: `${base}/og.png`, width: 600, height: 600 }] } : {}),
    },
    twitter: { card: 'summary' as const },
  };
}
