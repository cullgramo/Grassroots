import Head from 'expo-router/head';

import { SITE_URL } from '@/lib/config';
import type { Meta } from '@/utils/seo';

/**
 * A web page's title, description and preview tags, set in the browser as the page loads. For pages the website
 * build can't make ahead of time (a club, a fixture: there are thousands, and they change daily). Pages that are built
 * ahead (home, counties) use a `generateMetadata` export instead, so their tags are in the HTML itself; don't add this
 * to those, or the tags appear twice. Does nothing in the phone app. Wording: utils/seo.ts.
 */
export function PageMeta({ meta, noindex }: { meta: Meta; noindex?: boolean }) {
  const site = (SITE_URL ?? '').replace(/\/+$/, '');
  const url = `${site}${meta.path}`;
  return (
    <Head>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      {site ? <link rel="canonical" href={url} /> : null}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Grassroots" />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      {site ? <meta property="og:url" content={url} /> : null}
      {site ? <meta property="og:image" content={`${site}/og.png`} /> : null}
      <meta name="twitter:card" content="summary" />
      {noindex ? <meta name="robots" content="noindex" /> : null}
    </Head>
  );
}
