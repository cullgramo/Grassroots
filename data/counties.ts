export const COUNTIES = [
  'Antrim', 'Armagh', 'Carlow', 'Cavan', 'Clare', 'Cork', 'Derry', 'Donegal',
  'Down', 'Dublin', 'Fermanagh', 'Galway', 'Kerry', 'Kildare', 'Kilkenny', 'Laois',
  'Leitrim', 'Limerick', 'Longford', 'Louth', 'Mayo', 'Meath', 'Monaghan', 'Offaly',
  'Roscommon', 'Sligo', 'Tipperary', 'Tyrone', 'Waterford', 'Westmeath', 'Wexford', 'Wicklow',
];

// Approximate centre of each county, for placing a venue when a place search does not name its county.
const CENTRES: [string, number, number][] = [
  ['Antrim', 54.86, -6.28], ['Armagh', 54.3, -6.6], ['Carlow', 52.72, -6.83], ['Cavan', 53.98, -7.3],
  ['Clare', 52.86, -8.98], ['Cork', 51.97, -8.73], ['Derry', 54.93, -6.9], ['Donegal', 54.92, -7.95],
  ['Down', 54.35, -5.93], ['Dublin', 53.35, -6.27], ['Fermanagh', 54.35, -7.63], ['Galway', 53.35, -8.85],
  ['Kerry', 52.12, -9.7], ['Kildare', 53.2, -6.8], ['Kilkenny', 52.58, -7.22], ['Laois', 53.0, -7.4],
  ['Leitrim', 54.12, -8.0], ['Limerick', 52.5, -8.75], ['Longford', 53.73, -7.72], ['Louth', 53.9, -6.5],
  ['Mayo', 53.9, -9.3], ['Meath', 53.62, -6.7], ['Monaghan', 54.15, -6.95], ['Offaly', 53.23, -7.6],
  ['Roscommon', 53.75, -8.25], ['Sligo', 54.15, -8.6], ['Tipperary', 52.65, -7.9], ['Tyrone', 54.6, -7.2],
  ['Waterford', 52.2, -7.6], ['Westmeath', 53.53, -7.45], ['Wexford', 52.45, -6.6], ['Wicklow', 52.98, -6.4],
];

/** The county a place belongs to: by name if one is given, otherwise the nearest county centre. */
export function countyFor(names: (string | undefined)[], latitude: number, longitude: number): string {
  for (const raw of names) {
    const cleaned = (raw ?? '').toLowerCase().replace(/^(co\.?|county)\s+/, '').replace(/^londonderry$/, 'derry').trim();
    const match = COUNTIES.find((c) => c.toLowerCase() === cleaned);
    if (match) return match;
  }
  let best = CENTRES[0];
  let bestDistance = Infinity;
  for (const c of CENTRES) {
    const d = (c[1] - latitude) ** 2 + ((c[2] - longitude) * 0.6) ** 2;
    if (d < bestDistance) [best, bestDistance] = [c, d];
  }
  return best[0];
}
