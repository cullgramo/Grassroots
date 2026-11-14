import { getSport } from '@/constants/sports';
import { fixtureTitle, type Fixture } from '@/types/fixture';

/** Fixture times are Irish local times, so the card shows them that way wherever the sender is. */
function irishShort(startsAt: string) {
  const d = new Date(startsAt);
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Dublin',
    }).formatToParts(d);
    const get = (type: string) => (parts.find((p) => p.type === type)?.value ?? '').replace('.', '');
    return { day: `${get('weekday')} ${get('day')} ${get('month')}`, time: `${get('hour')}:${get('minute')}` };
  } catch {
    return {
      day: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    };
  }
}

export interface CardContent {
  /** Just the sport: "SOCCER". */
  sport: string;
  /** Home and away as two lines, or one line for an event. */
  heading: string[];
  /** "Tue 1 Dec" */
  day: string;
  /** "19:45", or "Time TBC". */
  time: string;
  where: string;
  /** Set when the fixture is off; shown across the card. */
  alert: string | null;
  /** The sport's colour: a decorative stripe only, never behind text. */
  color: string;
}

/** Everything the picture shows, worked out in one place so it can be tested. The card is deliberately plain. */
export function cardContent(f: Fixture): CardContent {
  const sport = getSport(f.sport);
  const when = irishShort(f.startsAt);
  return {
    sport: sport.name.toUpperCase(),
    heading: f.homeTeam && f.awayTeam ? [f.homeTeam, f.awayTeam] : [fixtureTitle(f)],
    day: when.day,
    time: f.timeTbc ? 'Time TBC' : when.time,
    where: `${f.venue}, ${f.county}`,
    alert: f.status === 'cancelled' ? 'CANCELLED' : f.status === 'postponed' ? 'POSTPONED' : null,
    color: sport.color,
  };
}
