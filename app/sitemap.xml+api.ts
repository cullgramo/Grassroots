// /sitemap.xml: every page Google should know about. Built from the live fixtures; see utils/sitemap.ts.
import { SITE_URL } from '@/lib/config';
import { fetchFixtures } from '@/lib/fixtures';
import { sitemapPaths, sitemapXml } from '@/utils/sitemap';

export async function GET(request: Request) {
  const site = SITE_URL ?? new URL(request.url).origin;
  let fixtures: Awaited<ReturnType<typeof fetchFixtures>> = [];
  try {
    fixtures = await fetchFixtures();
  } catch {
    // The database didn't answer: still list the home and county pages, and don't let the short list be kept for long.
    return new Response(sitemapXml(site, sitemapPaths([])), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  return new Response(sitemapXml(site, sitemapPaths(fixtures)), {
    // Fixtures change daily; an hour's caching is plenty.
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
