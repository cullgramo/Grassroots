# Being found on Google

| Page | Address | Title comes from |
| --- | --- | --- |
| Home | `/` | `generateMetadata` in `app/(tabs)/index.tsx`, built into the HTML |
| County (32) | `/county/offaly` | `generateMetadata` in `app/county/[name].tsx`, one HTML page built per county |
| Club | `/club/<name>?sport=<family>` | `components/PageMeta.tsx`, set as the page loads |
| Fixture | `/f/<id>` (the shared-link page, built on the server) | `utils/sharePage.ts` |

All the wording is in `utils/seo.ts`.

- **Sitemap:** `/sitemap.xml` (`app/sitemap.xml+api.ts`, rules in `utils/sitemap.ts`). It lists home, every county,
  every club with upcoming games, and every upcoming adult fixture, rebuilt from the live data. Google caches it for
  an hour.
- **robots.txt:** `public/robots.txt`. It keeps personal and in-app pages out of search and points to the sitemap. If
  the site moves to its own domain, change the `Sitemap:` line, and set `EXPO_PUBLIC_SITE_URL`.
- **Children's games stay out of search.** Underage and schools fixtures are still in the app, but their pages carry
  `noindex` and aren't in the sitemap (`searchable` in `utils/seo.ts`). Played games carry `noindex` too.

## After the first deploy (10 minutes, once)

1. Go to https://search.google.com/search-console and add the property `https://grassroots.expo.app/`. Prove you own
   it with the **HTML tag** method: Google gives you a `<meta name="google-site-verification" ...>` tag. Send it to
   Claude to add, or add it to `app/+html.tsx` yourself.
2. In Search Console, go to **Sitemaps**, enter `sitemap.xml` and press **Submit**.
3. Check back after a week: **Pages** shows how many pages Google has listed.
