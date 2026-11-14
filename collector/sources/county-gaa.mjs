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
  { url: 'https://donegalgaa.ie/api-fixtures-and-results/', prefix: 'Donegal', countyHint: 'Donegal', area: 'Ulster' },
  { url: 'https://www.downgaa.net/fixtures-results/', prefix: 'Down', countyHint: 'Down', area: 'Ulster' },
  { url: 'https://www.monaghangaa.ie/fixtures-results/', prefix: 'Monaghan', countyHint: 'Monaghan', area: 'Ulster' },
  { url: 'https://meath.gaa.ie/fixtures-results/', prefix: 'Meath', countyHint: 'Meath', area: 'Leinster' },
  { url: 'https://laoisgaa.ie/fixtures-results/', prefix: 'Laois', countyHint: 'Laois', area: 'Leinster' },
  { url: 'https://westmeathgaa.ie/fixtures-results/', prefix: 'Westmeath', countyHint: 'Westmeath', area: 'Leinster' },
  { url: 'https://kildaregaa.ie/fixtures-results/', prefix: 'Kildare', countyHint: 'Kildare', area: 'Leinster' },
  { url: 'https://tyronegaa.ie/fixtures-results/', prefix: 'Tyrone', countyHint: 'Tyrone', area: 'Ulster' },
  // Derry's own site shows this page inside a frame; the fixtures live on its Club & County address.
  { url: 'https://derry.clubandcounty.com/fixtures-results/', prefix: 'Derry', countyHint: 'Derry', area: 'Ulster' },
  { url: 'https://www.kerrygaa.ie/fixtures-results/', prefix: 'Kerry', countyHint: 'Kerry', area: 'Munster' },
  { url: 'https://kilkennygaa.ie/fixtures-results/', prefix: 'Kilkenny', countyHint: 'Kilkenny', area: 'Leinster' },
  { url: 'https://officialwicklowgaa.ie/fixtures-results/', prefix: 'Wicklow', countyHint: 'Wicklow', area: 'Leinster' },
  // Wexford's own site shows this page inside a frame; the fixtures live on its Club & County address.
  { url: 'https://wexford.clubandcounty.com/fixtures-results/', prefix: 'Wexford', countyHint: 'Wexford', area: 'Leinster' },
];

// A board's page shows its first 50 fixtures; the rest come from the page's own "Load more Fixtures" button,
// which asks for the next 50 at a time. We ask the same way, up to four more times, a few seconds apart.
const MORE_PAGES = 4;
export const pages = boards.flatMap((b) => [
  b,
  ...Array.from({ length: MORE_PAGES }, (_, i) => ({ ...b, url: `${b.url}?ajax=1&feed_type=fixtures&page=${i + 1}&size=50`, gapMs: 3000 })),
]);
