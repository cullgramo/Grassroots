import type { Fixture } from '@/types/fixture';

// Sample fixtures for development. Dates are relative to today so the app always has upcoming games.
function at(daysFromNow: number, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

type Seed = Omit<Fixture, 'id' | 'startsAt' | 'ticketed'> & { day: number; time: string; ticketed?: boolean };

const seeds: Seed[] = [
  { sport: 'Hurling', level: 'Inter-county', competition: 'Munster Championship, Round 3', homeTeam: 'Cork', awayTeam: 'Limerick', venue: 'Páirc Uí Chaoimh', county: 'Cork', latitude: 51.8996, longitude: -8.4353, day: 0, time: '19:30', ticketed: true },
  { sport: 'Gaelic Football', level: 'Club', competition: 'Dublin Senior Championship', homeTeam: 'Kilmacud Crokes', awayTeam: "St Vincent's", venue: 'Parnell Park', county: 'Dublin', latitude: 53.376, longitude: -6.213, day: 0, time: '20:00' },
  { sport: 'Camogie', level: 'Inter-county', competition: 'All-Ireland Senior Semi-Final', homeTeam: 'Kilkenny', awayTeam: 'Cork', venue: 'Croke Park', county: 'Dublin', latitude: 53.3607, longitude: -6.2511, day: 1, time: '15:15', ticketed: true },
  { sport: 'Gaelic Football', level: 'Inter-county', competition: 'Tailteann Cup Quarter-Final', homeTeam: 'Down', awayTeam: 'Laois', venue: 'Páirc Esler', county: 'Down', latitude: 54.179, longitude: -6.335, day: 2, time: '18:30', ticketed: true },
  { sport: 'Gaelic Football', level: 'Inter-county', competition: 'Tailteann Cup Quarter-Final', homeTeam: 'Meath', awayTeam: 'Antrim', venue: 'Páirc Tailteann', county: 'Meath', latitude: 53.6522, longitude: -6.686, day: 2, time: '17:00', ticketed: true },
  { sport: 'Hurling', level: 'Club', competition: 'Kilkenny Senior Championship', homeTeam: 'Ballyhale Shamrocks', awayTeam: "O'Loughlin Gaels", venue: 'Nowlan Park', county: 'Kilkenny', latitude: 52.6573, longitude: -7.239, day: 3, time: '14:00' },
  { sport: 'Ladies Football', level: 'Inter-county', competition: 'All-Ireland Senior Quarter-Final', homeTeam: 'Kerry', awayTeam: 'Meath', venue: 'Fitzgerald Stadium', county: 'Kerry', latitude: 52.065, longitude: -9.502, day: 3, time: '16:00', ticketed: true },
  { sport: 'Hurling', level: 'Inter-county', competition: 'Munster Championship, Round 4', homeTeam: 'Tipperary', awayTeam: 'Clare', venue: 'Semple Stadium', county: 'Tipperary', latitude: 52.6822, longitude: -7.823, day: 4, time: '16:00', ticketed: true },
  { sport: 'Gaelic Football', level: 'Club', competition: 'Galway Senior Championship', homeTeam: 'Corofin', awayTeam: 'Salthill-Knocknacarra', venue: 'Pearse Stadium', county: 'Galway', latitude: 53.262, longitude: -9.088, day: 5, time: '19:00' },
  { sport: 'Hurling', level: 'Club', competition: 'Limerick Senior Championship', homeTeam: 'Na Piarsaigh', awayTeam: 'Patrickswell', venue: 'Gaelic Grounds', county: 'Limerick', latitude: 52.6703, longitude: -8.6541, day: 6, time: '18:45' },
  { sport: 'Gaelic Football', level: 'Inter-county', competition: 'Connacht Championship Final', homeTeam: 'Mayo', awayTeam: 'Galway', venue: 'MacHale Park', county: 'Mayo', latitude: 53.8517, longitude: -9.2876, day: 8, time: '16:00', ticketed: true },
  { sport: 'Gaelic Football', level: 'Inter-county', competition: 'Ulster Championship Final', homeTeam: 'Armagh', awayTeam: 'Donegal', venue: "St Tiernach's Park", county: 'Monaghan', latitude: 54.1836, longitude: -7.2289, day: 9, time: '14:00', ticketed: true },
  { sport: 'Camogie', level: 'Club', competition: 'Dublin Senior Camogie Championship', homeTeam: "St Vincent's", awayTeam: 'Na Fianna', venue: 'Parnell Park', county: 'Dublin', latitude: 53.376, longitude: -6.213, day: 10, time: '12:00' },
  { sport: 'Ladies Football', level: 'Club', competition: 'Kerry Senior Championship', homeTeam: 'Southern Gaels', awayTeam: 'Rathmore', venue: 'Fitzgerald Stadium', county: 'Kerry', latitude: 52.065, longitude: -9.502, day: 12, time: '13:30' },
];

export const fixtures: Fixture[] = seeds.map(({ day, time, ticketed, ...rest }, i) => ({
  ...rest,
  id: String(i + 1),
  startsAt: at(day, time),
  ticketed: ticketed ?? false,
}));

export function getFixture(id: string): Fixture | undefined {
  return fixtures.find((f) => f.id === id);
}
