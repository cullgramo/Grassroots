import type { Fixture } from '@/types/fixture';

// Sample fixtures for development. Dates are relative to today so the app always has upcoming fixtures.
function at(daysFromNow: number, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

type Venue = Pick<Fixture, 'venue' | 'county' | 'latitude' | 'longitude'>;
const v = (venue: string, county: string, latitude: number, longitude: number): Venue => ({ venue, county, latitude, longitude });

const VENUES = {
  pairc: v('Páirc Uí Chaoimh', 'Cork', 51.8996, -8.4353),
  parnell: v('Parnell Park', 'Dublin', 53.376, -6.213),
  croke: v('Croke Park', 'Dublin', 53.3607, -6.2511),
  esler: v('Páirc Esler', 'Down', 54.179, -6.335),
  tailteann: v('Páirc Tailteann', 'Meath', 53.6522, -6.686),
  nowlan: v('Nowlan Park', 'Kilkenny', 52.6573, -7.239),
  fitzgerald: v('Fitzgerald Stadium', 'Kerry', 52.065, -9.502),
  semple: v('Semple Stadium', 'Tipperary', 52.6822, -7.823),
  pearse: v('Pearse Stadium', 'Galway', 53.262, -9.088),
  gaelicGrounds: v('Gaelic Grounds', 'Limerick', 52.6703, -8.6541),
  machale: v('MacHale Park', 'Mayo', 53.8517, -9.2876),
  clones: v("St Tiernach's Park", 'Monaghan', 54.1836, -7.2289),
  aviva: v('Aviva Stadium', 'Dublin', 53.3352, -6.2285),
  tallaght: v('Tallaght Stadium', 'Dublin', 53.2836, -6.3736),
  dalymount: v('Dalymount Park', 'Dublin', 53.3617, -6.2752),
  turners: v("Turner's Cross", 'Cork', 51.8853, -8.468),
  showgrounds: v('The Showgrounds', 'Sligo', 54.2767, -8.487),
  windsor: v('Windsor Park', 'Antrim', 54.5826, -5.9552),
  thomond: v('Thomond Park', 'Limerick', 52.6742, -8.6425),
  rds: v('RDS Arena', 'Dublin', 53.3256, -6.2289),
  ravenhill: v('Kingspan Stadium', 'Antrim', 54.5767, -5.9044),
  sportsground: v('The Sportsground', 'Galway', 53.2795, -9.038),
  arena: v('National Basketball Arena', 'Dublin', 53.289, -6.356),
  neptune: v('Neptune Stadium', 'Cork', 51.913, -8.478),
  malahide: v('Malahide Cricket Club', 'Dublin', 53.4475, -6.157),
  clontarf: v('Castle Avenue', 'Dublin', 53.367, -6.201),
  serpentine: v('Serpentine Avenue', 'Dublin', 53.329, -6.223),
  havelock: v('Havelock Park', 'Down', 54.348, -6.27),
  morton: v('Morton Stadium', 'Dublin', 53.403, -6.242),
  phoenix: v('Phoenix Park', 'Dublin', 53.3559, -6.3298),
  leopardstown: v('Leopardstown Racecourse', 'Dublin', 53.2664, -6.1935),
  curragh: v('The Curragh', 'Kildare', 53.165, -6.85),
  ballybrit: v('Galway Racecourse', 'Galway', 53.299, -8.999),
  portmarnock: v('Portmarnock Golf Club', 'Dublin', 53.407, -6.123),
  kclub: v('The K Club', 'Kildare', 53.309, -6.625),
  nationalStadium: v('National Stadium', 'Dublin', 53.332, -6.279),
  ulsterHall: v('Ulster Hall', 'Antrim', 54.5947, -5.9306),
};

type Seed = Pick<Fixture, 'sport' | 'level' | 'competition'> & {
  home?: string;
  away?: string;
  title?: string;
  at: Venue;
  day: number;
  time: string;
  ticketed?: boolean;
};

const seeds: Seed[] = [
  { sport: 'hurling', level: 'Top level', competition: 'Munster Championship, Round 3', home: 'Cork', away: 'Limerick', at: VENUES.pairc, day: 0, time: '19:30', ticketed: true },
  { sport: 'gaelic-football', level: 'Local', competition: 'Dublin Senior Championship', home: 'Kilmacud Crokes', away: "St Vincent's", at: VENUES.parnell, day: 0, time: '20:00' },
  { sport: 'soccer', level: 'Top level', competition: 'League of Ireland Premier Division', home: 'Shamrock Rovers', away: 'Bohemians', at: VENUES.tallaght, day: 0, time: '19:45', ticketed: true },
  { sport: 'basketball', level: 'Top level', competition: 'Super League', home: 'Templeogue', away: 'Killester', at: VENUES.arena, day: 0, time: '20:15' },
  { sport: 'camogie', level: 'Top level', competition: 'All-Ireland Senior Semi-Final', home: 'Kilkenny', away: 'Cork', at: VENUES.croke, day: 1, time: '15:15', ticketed: true },
  { sport: 'rugby', level: 'Top level', competition: 'United Rugby Championship', home: 'Munster', away: 'Ulster', at: VENUES.thomond, day: 1, time: '19:35', ticketed: true },
  { sport: 'horse-racing', level: 'Top level', competition: 'National Hunt meeting', title: 'Leopardstown Races', at: VENUES.leopardstown, day: 1, time: '12:40', ticketed: true },
  { sport: 'gaelic-football', level: 'Top level', competition: 'Tailteann Cup Quarter-Final', home: 'Down', away: 'Laois', at: VENUES.esler, day: 2, time: '18:30', ticketed: true },
  { sport: 'gaelic-football', level: 'Top level', competition: 'Tailteann Cup Quarter-Final', home: 'Meath', away: 'Antrim', at: VENUES.tailteann, day: 2, time: '17:00', ticketed: true },
  { sport: 'soccer', level: 'Top level', competition: 'League of Ireland Premier Division', home: 'Cork City', away: 'Derry City', at: VENUES.turners, day: 2, time: '19:45', ticketed: true },
  { sport: 'hockey', level: 'Local', competition: 'EY Hockey League', home: 'Pembroke Wanderers', away: 'Three Rock Rovers', at: VENUES.serpentine, day: 2, time: '14:30' },
  { sport: 'boxing', level: 'Top level', competition: 'National Elite Championships', title: 'Elite Championship Finals', at: VENUES.nationalStadium, day: 2, time: '19:00', ticketed: true },
  { sport: 'hurling', level: 'Local', competition: 'Kilkenny Senior Championship', home: 'Ballyhale Shamrocks', away: "O'Loughlin Gaels", at: VENUES.nowlan, day: 3, time: '14:00' },
  { sport: 'ladies-football', level: 'Top level', competition: 'All-Ireland Senior Quarter-Final', home: 'Kerry', away: 'Meath', at: VENUES.fitzgerald, day: 3, time: '16:00', ticketed: true },
  { sport: 'rugby', level: 'Top level', competition: 'United Rugby Championship', home: 'Leinster', away: 'Connacht', at: VENUES.rds, day: 3, time: '17:15', ticketed: true },
  { sport: 'athletics', level: 'Local', competition: 'Road race', title: 'Phoenix Park 10K', at: VENUES.phoenix, day: 3, time: '10:00' },
  { sport: 'cricket', level: 'Local', competition: 'Leinster Premier League', home: 'Clontarf', away: 'Malahide', at: VENUES.clontarf, day: 3, time: '11:30' },
  { sport: 'basketball', level: 'Top level', competition: 'Super League', home: 'Neptune', away: 'UCC Demons', at: VENUES.neptune, day: 3, time: '18:30' },
  { sport: 'hurling', level: 'Top level', competition: 'Munster Championship, Round 4', home: 'Tipperary', away: 'Clare', at: VENUES.semple, day: 4, time: '16:00', ticketed: true },
  { sport: 'soccer', level: 'Top level', competition: 'League of Ireland Premier Division', home: 'Sligo Rovers', away: "St Patrick's Athletic", at: VENUES.showgrounds, day: 4, time: '17:00', ticketed: true },
  { sport: 'golf', level: 'Local', competition: 'Open amateur competition', title: 'Portmarnock Open Scratch Cup', at: VENUES.portmarnock, day: 4, time: '08:00' },
  { sport: 'hockey', level: 'Local', competition: 'EY Hockey League', home: 'Banbridge', away: 'Lisnagarvey', at: VENUES.havelock, day: 4, time: '15:00' },
  { sport: 'gaelic-football', level: 'Local', competition: 'Galway Senior Championship', home: 'Corofin', away: 'Salthill-Knocknacarra', at: VENUES.pearse, day: 5, time: '19:00' },
  { sport: 'rugby', level: 'Top level', competition: 'United Rugby Championship', home: 'Connacht', away: 'Munster', at: VENUES.sportsground, day: 5, time: '19:35', ticketed: true },
  { sport: 'hurling', level: 'Local', competition: 'Limerick Senior Championship', home: 'Na Piarsaigh', away: 'Patrickswell', at: VENUES.gaelicGrounds, day: 6, time: '18:45' },
  { sport: 'soccer', level: 'Top level', competition: 'Irish Premiership', home: 'Linfield', away: 'Glentoran', at: VENUES.windsor, day: 6, time: '15:00', ticketed: true },
  { sport: 'athletics', level: 'Top level', competition: 'Track and field', title: 'National Senior Championships', at: VENUES.morton, day: 6, time: '11:00', ticketed: true },
  { sport: 'horse-racing', level: 'Top level', competition: 'Flat meeting', title: 'Curragh Races', at: VENUES.curragh, day: 7, time: '13:15', ticketed: true },
  { sport: 'gaelic-football', level: 'Top level', competition: 'Connacht Championship Final', home: 'Mayo', away: 'Galway', at: VENUES.machale, day: 8, time: '16:00', ticketed: true },
  { sport: 'rugby', level: 'Top level', competition: 'International', home: 'Ireland', away: 'Scotland', at: VENUES.aviva, day: 8, time: '14:15', ticketed: true },
  { sport: 'cricket', level: 'Top level', competition: 'One-day international', home: 'Ireland', away: 'Scotland', at: VENUES.malahide, day: 8, time: '10:45', ticketed: true },
  { sport: 'gaelic-football', level: 'Top level', competition: 'Ulster Championship Final', home: 'Armagh', away: 'Donegal', at: VENUES.clones, day: 9, time: '14:00', ticketed: true },
  { sport: 'rugby', level: 'Top level', competition: 'United Rugby Championship', home: 'Ulster', away: 'Leinster', at: VENUES.ravenhill, day: 9, time: '19:35', ticketed: true },
  { sport: 'soccer', level: 'Top level', competition: 'League of Ireland Premier Division', home: 'Bohemians', away: 'Shelbourne', at: VENUES.dalymount, day: 9, time: '19:45', ticketed: true },
  { sport: 'boxing', level: 'Local', competition: 'Club show', title: 'Ulster Hall Fight Night', at: VENUES.ulsterHall, day: 9, time: '19:30', ticketed: true },
  { sport: 'camogie', level: 'Local', competition: 'Dublin Senior Camogie Championship', home: "St Vincent's", away: 'Na Fianna', at: VENUES.parnell, day: 10, time: '12:00' },
  { sport: 'horse-racing', level: 'Top level', competition: 'National Hunt meeting', title: 'Galway Races', at: VENUES.ballybrit, day: 10, time: '13:00', ticketed: true },
  { sport: 'golf', level: 'Top level', competition: 'Professional tournament', title: 'Irish Open, Round 1', at: VENUES.kclub, day: 11, time: '07:30', ticketed: true },
  { sport: 'ladies-football', level: 'Local', competition: 'Kerry Senior Championship', home: 'Southern Gaels', away: 'Rathmore', at: VENUES.fitzgerald, day: 12, time: '13:30' },
];

export const fixtures: Fixture[] = seeds.map((s, i) => ({
  id: String(i + 1),
  sport: s.sport,
  level: s.level,
  competition: s.competition,
  homeTeam: s.home,
  awayTeam: s.away,
  title: s.title,
  ...s.at,
  startsAt: at(s.day, s.time),
  ticketed: s.ticketed ?? false,
}));

export function getFixture(id: string): Fixture | undefined {
  return fixtures.find((f) => f.id === id);
}
