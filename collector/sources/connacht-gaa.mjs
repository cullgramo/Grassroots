// Connacht GAA: provincial club and schools fixtures, from the council's public fixtures pages.
// These pages are built the same way as Ulster GAA's, so the same reader is used. Referees' names are never read.
export { read } from './ulster-gaa.mjs';

export const name = 'Connacht GAA';
export const pages = [
  { url: 'https://connachtgaa.ie/fixtures-results/', area: 'Connacht' },
  { url: 'https://connachtgaa.ie/pps-fixtures-results/', area: 'Connacht' },
];
