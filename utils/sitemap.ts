// The sitemap: the list of pages Google should know about, rebuilt from the live fixtures on each request.
// Served at /sitemap.xml by app/sitemap.xml+api.ts; robots.txt (public/robots.txt) points Google to it.
import { COUNTIES } from '@/data/counties';
import type { Fixture } from '@/types/fixture';
import { clubGroup, clubName } from '@/utils/club';
import { isPlayed } from '@/utils/played';
import { clubPath, countySlug, searchable } from '@/utils/seo';

const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Every page address, from the site root: home, the 32 county pages, each club with upcoming games, and each upcoming fixture. */
export function sitemapPaths(fixtures: Fixture[], now: Date = new Date()): string[] {
  const paths = new Set<string>(['/', ...COUNTIES.map((c) => `/county/${countySlug(c)}`)]);
  const upcoming = fixtures.filter((f) => !isPlayed(f, now));
  const clubs = new Map<string, string>();
  for (const f of upcoming) {
    for (const team of [f.homeTeam, f.awayTeam]) {
      if (!team) continue;
      const name = clubName(team.trim());
      // One page per club and sport family, written the way the app links to it, so Google sees one address per page.
      const path = clubPath(name, clubGroup(f));
      clubs.set(path.toLowerCase(), path);
    }
  }
  for (const path of [...clubs.values()].sort()) paths.add(path);
  for (const f of upcoming) if (searchable(f)) paths.add(`/f/${encodeURIComponent(f.id)}`);
  return [...paths];
}

export function sitemapXml(site: string, paths: string[]): string {
  const base = site.replace(/\/+$/, '');
  const urls = paths.map((p) => `<url><loc>${xmlEsc(base + p)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
