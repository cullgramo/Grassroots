// County GAA boards: club, schools and county fixtures from each board's public fixtures page.
// These boards use the same system as Ulster and Connacht GAA, so the same reader is used.
// Referees' names on the pages are never read. More counties can be added as one line each.
export { read } from './ulster-gaa.mjs';

export const name = 'County GAA';
export const pages = [
  { url: 'https://clare.gaa.ie/fixtures-results/', prefix: 'Clare', area: 'Munster' },
  { url: 'https://tipperary.gaa.ie/fixtures-results/', prefix: 'Tipperary', area: 'Munster' },
  { url: 'https://offaly.gaa.ie/fixtures-results/', prefix: 'Offaly', area: 'Leinster' },
  { url: 'https://cavangaa.ie/fixtures-results/', prefix: 'Cavan', area: 'Ulster' },
  { url: 'https://fermanagh.gaa.ie/fixtures-results/', prefix: 'Fermanagh', area: 'Ulster' },
];
