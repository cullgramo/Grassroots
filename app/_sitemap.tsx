import { Redirect } from 'expo-router';

// Expo Router adds a public /_sitemap page listing every route. It is useful while developing, but a live site should
// not publish it, so in production this sends visitors to the home screen. In development the built-in page shows.
export default function Sitemap() {
  if (!__DEV__) return <Redirect href="/" />;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Sitemap: DevSitemap } = require('expo-router/build/views/Sitemap');
  return <DevSitemap />;
}
