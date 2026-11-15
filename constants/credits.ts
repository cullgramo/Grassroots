/**
 * DRAFT credits and attribution, for the owner's review. Built from collector/COVERAGE.md, collector/look.mjs (the
 * readers that run), the collector's grounds code, and the web map (components/LeafletMap.tsx).
 *
 * Rules: credit each source by organisation name and link to the page we read; no club crests or league logos; no
 * betting links. Only sources the collector reads today, or one-off copies already labelled as snapshots there, are
 * listed. A source that is switched off, skipped or not read (Irish FA, League of Ireland, Leitrim, Armagh, Galway,
 * Limerick, Louth, the dormant Foireann API) is NOT credited, because we do not use its data. When a reader is added or
 * removed in collector/look.mjs, change this list in the same commit.
 */
export const CREDITS_UPDATED = '15 November 2026';

export interface CreditLink {
  name: string;
  url: string;
}

export interface CreditGroup {
  heading: string;
  /** Plain text above the links. */
  intro?: string;
  links: CreditLink[];
}

export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
export const ODBL_URL = 'https://opendatacommons.org/licenses/odbl/1-0/';
export const CC_BY_4_URL = 'https://creativecommons.org/licenses/by/4.0/';

/** The words shown at the top: map and place data, which carry licence conditions. */
export const MAP_CREDITS: { heading: string; body: string; links: CreditLink[] }[] = [
  {
    heading: 'Maps and places',
    body: '© OpenStreetMap contributors. Map pictures on the website, and many of the ground positions on the map, come from OpenStreetMap, which is made available under the Open Database Licence (ODbL).',
    links: [
      { name: 'OpenStreetMap copyright and licence', url: OSM_COPYRIGHT_URL },
      { name: 'Open Database Licence (ODbL) 1.0', url: ODBL_URL },
    ],
  },
  {
    heading: 'GAA pitch positions',
    body: 'Many GAA pitch positions come from the GAA Pitch Finder dataset by Ryan McGuinness, used under the Creative Commons Attribution 4.0 licence (CC BY 4.0). We matched pitches to fixtures and checked positions; the dataset itself was not endorsed by its author.',
    links: [{ name: 'Creative Commons Attribution 4.0 (CC BY 4.0)', url: CC_BY_4_URL }],
  },
  {
    heading: 'Club positions',
    body: 'Some club and ground positions come from Sport Ireland\'s Get Ireland Active club finder.',
    links: [{ name: 'Get Ireland Active (Sport Ireland)', url: 'https://www.getirelandactive.ie/' }],
  },
];

export const FIXTURE_CREDITS: CreditGroup[] = [
  {
    heading: 'GAA provincial councils and boards',
    links: [
      { name: 'Leinster GAA', url: 'https://leinstergaa.ie/fixtures' },
      { name: 'Munster GAA', url: 'https://munster.gaa.ie/events/month/' },
      { name: 'Ulster GAA', url: 'https://ulster.gaa.ie/fixtures-results/' },
      { name: 'Connacht GAA', url: 'https://connachtgaa.ie/fixtures-results/' },
    ],
  },
  {
    heading: 'GAA county boards',
    intro: 'Fixtures from each county board\'s public fixtures page.',
    links: [
      { name: 'Antrim GAA', url: 'https://antrim.gaa.ie/fixtures' },
      { name: 'Carlow GAA', url: 'https://carlowgaa.ie/fixtures/' },
      { name: 'Cavan GAA', url: 'https://cavangaa.ie/fixtures-results/' },
      { name: 'Clare GAA', url: 'https://clare.gaa.ie/fixtures-results/' },
      { name: 'Cork GAA', url: 'https://gaacork.ie/fixtures/' },
      { name: 'Derry GAA', url: 'https://derry.clubandcounty.com/fixtures-results/' },
      { name: 'Donegal GAA', url: 'https://donegalgaa.ie/api-fixtures-and-results/' },
      { name: 'Down GAA', url: 'https://www.downgaa.net/fixtures-results/' },
      { name: 'Dublin GAA', url: 'https://dublingaa.sportlomo.com/' },
      { name: 'Fermanagh GAA', url: 'https://fermanagh.gaa.ie/fixtures-results/' },
      { name: 'Kerry GAA', url: 'https://www.kerrygaa.ie/fixtures-results/' },
      { name: 'Kildare GAA', url: 'https://kildaregaa.ie/fixtures-results/' },
      { name: 'Kilkenny GAA', url: 'https://kilkennygaa.ie/fixtures-results/' },
      { name: 'Laois GAA', url: 'https://laoisgaa.ie/fixtures-results/' },
      { name: 'Longford GAA (a copy taken on 13 November 2026)', url: 'https://longfordgaa.ie/fixtures-results/' },
      { name: 'Mayo GAA', url: 'https://mayogaa.com/fixtures/' },
      { name: 'Meath GAA', url: 'https://meath.gaa.ie/fixtures-results/' },
      { name: 'Monaghan GAA', url: 'https://www.monaghangaa.ie/fixtures-results/' },
      { name: 'Offaly GAA', url: 'https://offaly.gaa.ie/fixtures-results/' },
      { name: 'Roscommon GAA', url: 'https://www.gaaroscommon.ie/matches/' },
      { name: 'Sligo GAA', url: 'https://www.sligogaa.ie/FixturesResultsAll.aspx' },
      { name: 'Tipperary GAA', url: 'https://tipperary.gaa.ie/fixtures-results/' },
      { name: 'Tyrone GAA', url: 'https://tyronegaa.ie/fixtures-results/' },
      { name: 'Waterford GAA', url: 'https://www.waterfordgaa.ie/fixtures/' },
      { name: 'Westmeath GAA', url: 'https://westmeathgaa.ie/fixtures-results/' },
      { name: 'Wexford GAA', url: 'https://wexford.clubandcounty.com/fixtures-results/' },
      { name: 'Wicklow GAA', url: 'https://officialwicklowgaa.ie/fixtures-results/' },
    ],
  },
  {
    heading: 'Rugby',
    links: [
      { name: 'United Rugby Championship', url: 'https://www.unitedrugby.com/' },
      { name: 'EPCR: Champions Cup', url: 'https://www.epcrugby.com/champions-cup/matches' },
      { name: 'EPCR: Challenge Cup', url: 'https://www.epcrugby.com/challenge-cup/matches' },
      { name: 'Leinster Rugby club fixtures', url: 'https://leinsterrugby.sportlomo.com/fixtures/' },
      { name: 'Munster Rugby club fixtures', url: 'https://munsterrugby.sportlomo.com/fixtures/' },
      { name: 'Ulster Rugby club fixtures', url: 'https://ulsterrugby.sportlomo.com/fixtures/' },
      { name: 'Connacht Rugby club fixtures', url: 'https://connachtrugby.sportlomo.com/fixtures/' },
    ],
  },
  {
    heading: 'Soccer',
    links: [
      { name: 'Dublin & District Schoolboys League (DDSL)', url: 'https://ddsl.ie/fixtures/' },
      { name: 'NIFL Premiership (a copy taken on 14 November 2026)', url: 'https://www.nifootballleague.com/premiership/2026-2027/fixtures/' },
    ],
  },
  {
    heading: 'Other sports',
    links: [
      { name: 'Basketball Ireland', url: 'https://ireland.basketball/MensSuperLeagueFixtures' },
      { name: 'Irish Hockey', url: 'https://irishhua.com/public/fixturesquick.php' },
      { name: 'Leinster Hockey', url: 'https://leinsterhua.com/public/fixturesquick.php' },
      { name: 'Munster Hockey', url: 'https://munsterhua.com/public/fixturesquick.php' },
      { name: 'Connacht Hockey', url: 'https://connachthua.com/public/fixturesquick.php' },
      { name: 'Ulster Hockey', url: 'https://ulsterhockeyumpires.com/public/fixturesquick.php' },
      { name: 'Olympic Handball Ireland, on MyGameDay (a copy taken on 15 November 2026)', url: 'https://websites.mygameday.app/' },
      { name: 'Horse Racing Ireland', url: 'https://www.hri.ie/fixture-list' },
      { name: 'MyRunResults', url: 'https://www.myrunresults.com/event-calendar' },
      { name: 'Running Calendar Ireland (a copy taken on 15 November 2026)', url: 'https://www.runningcalendar.ie/calendar/' },
    ],
  },
  {
    heading: 'Tickets',
    intro: 'Ticketed fixtures and their ticket links come from Ticketmaster, including Universe listings.',
    links: [
      { name: 'Ticketmaster Ireland', url: 'https://www.ticketmaster.ie/' },
      { name: 'Universe', url: 'https://www.universe.com/' },
    ],
  },
];

export const CREDITS_NOTE =
  'Grassroots is not affiliated with, or endorsed by, any of the organisations above, or by the GAA, the IRFU, the FAI, the Irish FA, any league, club or ticket seller. Names are used only to say where information came from.';
