/**
 * Where Grassroots' fixtures, grounds and maps come from. Shown on the Credits page, which is always visible:
 * crediting these is a condition of using them, and it is fair to the people who publish them.
 * Keep this in step with collector/look.mjs (the list of sources) when a source is added or switched off.
 */
export interface Credit {
  name: string;
  /** A line saying what is used and under what terms. */
  note: string;
  url?: string;
}

/** Data used under an open licence. The wording follows what each licence asks for. */
export const DATA_CREDITS: Credit[] = [
  {
    name: 'OpenStreetMap',
    note: 'Map tiles and many ground positions. © OpenStreetMap contributors, available under the Open Database Licence.',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    name: 'GAA Pitch Finder',
    note: 'Positions of GAA grounds, from the GAA Pitch Finder dataset by Ryan McGuinness, used under the Creative Commons Attribution 4.0 licence. We have changed it: entries were checked, corrected and added to.',
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    name: 'Sport Ireland, Get Ireland Active',
    note: 'Positions of some clubs, from the public club finder.',
    url: 'https://www.getirelandactive.ie',
  },
];

/** Where fixtures are read from. Each fixture in the app also names its own source. */
export const FIXTURE_SOURCES: { sport: string; sources: string[] }[] = [
  {
    sport: 'Gaelic games',
    sources: [
      'Leinster GAA', 'Munster GAA', 'Ulster GAA', 'Connacht GAA', 'Dublin GAA', 'Cork GAA', 'Galway GAA', 'Waterford GAA', 'Antrim GAA', 'Roscommon GAA', 'Sligo GAA', 'Mayo GAA', 'Carlow GAA', 'Longford GAA',
      'the county boards of Cavan, Clare, Derry, Donegal, Down, Fermanagh, Kerry, Kildare, Kilkenny, Laois, Meath, Monaghan, Offaly, Tipperary, Tyrone, Westmeath, Wexford and Wicklow',
      'the Camogie Association', 'the Ladies Gaelic Football Association', 'GAA Handball', 'GAA.ie',
    ],
  },
  { sport: 'Rugby', sources: ['the fixtures pages of Leinster, Munster, Ulster and Connacht Rugby', 'the United Rugby Championship'] },
  {
    sport: 'Soccer',
    sources: [
      'DDSL', 'Galway FA', 'Munster Senior League', 'Donegal Junior League', 'Cork Youth Leagues', 'Cork Athletic Union League', 'Limerick & District League', 'Wicklow & District Football League',
      'Amateur Football League', 'Northern Amateur Football League', 'Mid-Ulster Football League', 'NIFL Premiership',
    ],
  },
  { sport: 'Hockey', sources: ['the Irish, Leinster, Munster and Connacht Hockey Umpires Associations', 'Ulster Hockey Umpires Association'] },
  { sport: 'Basketball', sources: ['Basketball Ireland'] },
  { sport: 'Racing', sources: ['Horse Racing Ireland', 'Greyhound Racing Ireland'] },
  { sport: 'Running', sources: ['MyRunResults', 'Running Calendar Ireland'] },
  {
    sport: 'Other sports',
    sources: ['Belfast Giants', 'Ireland Water Polo', 'Irish Lawn Bowls', 'Olympic Handball Ireland', 'Cricket Leinster', 'North West Cricket Union', 'Motorsport Ireland', 'Motorsport NI', 'Rowing Ireland', 'Volleyball Ireland', 'Netball Ireland'],
  },
  { sport: 'Tickets', sources: ['Ticketmaster and Universe, for ticketed fixtures and ticket links'] },
];

export const NOT_AFFILIATED =
  'Grassroots is independent. It is not affiliated with, endorsed by or run by the GAA, the LGFA, the Camogie Association, the IRFU, the FAI, the Irish FA, Ticketmaster, or any league, club or governing body named here. Their names are used only to say where a fixture was published.';
