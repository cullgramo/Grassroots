// County GAA boards: club, schools and county fixtures from each board's public fixtures page.
// These boards use the same system as Ulster and Connacht GAA, so the same reader is used.
// Referees' names on the pages are never read. More counties can be added as one line each.
export { read } from './ulster-gaa.mjs';

export const name = 'County GAA';
const boards = [
  { url: 'https://clare.gaa.ie/fixtures-results/', prefix: 'Clare', countyHint: 'Clare', area: 'Munster' },
  { url: 'https://tipperary.gaa.ie/fixtures-results/', prefix: 'Tipperary', countyHint: 'Tipperary', area: 'Munster' },
  { url: 'https://offaly.gaa.ie/fixtures-results/', prefix: 'Offaly', countyHint: 'Offaly', area: 'Leinster' },
  { url: 'https://cavangaa.ie/fixtures-results/', prefix: 'Cavan', countyHint: 'Cavan', area: 'Ulster' },
  { url: 'https://fermanagh.gaa.ie/fixtures-results/', prefix: 'Fermanagh', countyHint: 'Fermanagh', area: 'Ulster' },
];

// A board's page shows its first 50 fixtures; the rest come from the page's own "Load more Fixtures" button,
// which asks for the next 50 at a time. We ask the same way, up to four more times, a few seconds apart.
const MORE_PAGES = 4;
export const pages = boards.flatMap((b) => [
  b,
  ...Array.from({ length: MORE_PAGES }, (_, i) => ({ ...b, url: `${b.url}?ajax=1&feed_type=fixtures&page=${i + 1}&size=50`, gapMs: 3000 })),
]);
