import { getSport, type SportId } from '@/constants/sports';
import type { Level } from '@/types/fixture';

export interface ParsedFixture {
  sport: SportId;
  level: Level;
  competition: string;
  homeTeam?: string;
  awayTeam?: string;
  title?: string;
  venueName: string;
  /** Null when the date or time could not be read. */
  startsAt: string | null;
  ticketUrl?: string;
  /** What still needs fixing before this can be saved. Empty means ready. */
  problems: string[];
  /** The pasted text this came from, to help find it. */
  raw: string;
}

export interface ParseOptions {
  defaultSport: SportId;
  level: Level;
  now?: Date;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAY = '(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\\.?,?\\s+';
const MONTH = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';
const DAY = '(\\d{1,2})(?:st|nd|rd|th)?';
const DATE_PATTERNS: [RegExp, (m: RegExpMatchArray) => [number, number, number | null]][] = [
  [new RegExp(`^(?:${WEEKDAY})?${DAY}\\s+${MONTH},?(?:\\s+(\\d{4}))?$`, 'i'), (m) => [+m[1], MONTHS.indexOf(m[2].toLowerCase()) + 1, m[3] ? +m[3] : null]],
  [new RegExp(`^(?:${WEEKDAY})?${MONTH}\\s+${DAY},?(?:\\s+(\\d{4}))?$`, 'i'), (m) => [+m[2], MONTHS.indexOf(m[1].toLowerCase()) + 1, m[3] ? +m[3] : null]],
  [/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/, (m) => [+m[1], +m[2], m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : null]],
];

interface Day {
  year: number;
  month: number;
  day: number;
}

/** Reads a line that is only a date, in day-first Irish order. A missing year means the next time that date comes round. */
export function parseDateLine(line: string, now: Date = new Date()): Day | null {
  const text = line.trim();
  for (const [pattern, read] of DATE_PATTERNS) {
    const m = text.match(pattern);
    if (!m) continue;
    const [day, month, givenYear] = read(m);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    let year = givenYear ?? now.getFullYear();
    if (givenYear == null && Date.UTC(year, month - 1, day) < now.getTime() - 60 * 86_400_000) year++;
    return { year, month, day };
  }
  return null;
}

const TIME = /\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/i;

function readTime(text: string): { hour: number; minute: number; rest: string } | null {
  const m = text.match(TIME);
  if (!m) return null;
  let hour = +(m[1] ?? m[4]);
  const minute = m[2] ? +m[2] : 0;
  const half = (m[3] ?? m[5])?.toLowerCase();
  if (half === 'pm' && hour < 12) hour += 12;
  if (half === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute, rest: (text.slice(0, m.index) + ' ' + text.slice(m.index! + m[0].length)).trim() };
}

/** Converts a clock time in Ireland to a UTC timestamp, allowing for summer time. */
export function irishTimeToIso(d: Day, hour: number, minute: number): string {
  const guess = Date.UTC(d.year, d.month - 1, d.day, hour, minute);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Dublin', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(guess));
  const get = (type: string) => +parts.find((p) => p.type === type)!.value;
  const shown = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return new Date(guess - (shown - guess)).toISOString();
}

const SPORT_WORDS: [RegExp, SportId][] = [
  [/\bcamogie\b/i, 'camogie'],
  [/\b(ladies|lgfa)\b/i, 'ladies-football'],
  [/\bhurling\b|\bp?[sijm][a-c]?hc\b/i, 'hurling'],
  [/\bsoccer\b/i, 'soccer'],
  [/\brugby\b/i, 'rugby'],
  [/\bice hockey\b/i, 'ice-hockey'],
  [/\bhockey\b/i, 'hockey'],
  [/\bbasketball\b/i, 'basketball'],
  [/\bcricket\b/i, 'cricket'],
  [/\bboxing\b/i, 'boxing'],
  [/\bgolf\b/i, 'golf'],
  [/\b(gaelic football|football)\b|\bp?[sijm][a-c]?fc\b/i, 'gaelic-football'],
];

export function detectSport(text: string): SportId | null {
  for (const [pattern, sport] of SPORT_WORDS) if (pattern.test(text)) return sport;
  return null;
}

const VERSUS = /\s+(?:v|vs|vs\.|v\.)\s+/i;
const COMPETITION_WORDS = /\b(championship|league|cup|shield|trophy|tournament|series|div(?:ision)?\.?\s*\d)\b/i;
const ROUND = /^(final|semi[- ]?finals?|quarter[- ]?finals?|round\s*\d+|preliminary.*|replay|play[- ]?off)$/i;
const SPORT_LINE = /^(football|gaelic football|hurling|camogie|ladies football|soccer|rugby|hockey|basketball|cricket)$/i;
const URL = /https?:\/\/\S+/i;
const tidy = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, '').trim();

function finish(
  f: Omit<ParsedFixture, 'problems' | 'startsAt'>,
  day: Day | null,
  time: { hour: number; minute: number } | null,
  now: Date
): ParsedFixture {
  const problems: string[] = [];
  if (!day) problems.push('No date');
  if (!time) problems.push('No time');
  if (!f.venueName) problems.push('No venue');
  if (!f.title && !(f.homeTeam && f.awayTeam)) problems.push('No teams');
  const startsAt = day && time ? irishTimeToIso(day, time.hour, time.minute) : null;
  if (startsAt && new Date(startsAt).getTime() < now.getTime() - 86_400_000) problems.push('Date is in the past');
  return { ...f, startsAt, problems };
}

/** One fixture per line: "12:30 Ballinacor v St Annes, Echelon Park", with optional "Competition:" in front. */
function parseLines(lines: string[], opts: ParseOptions, now: Date): ParsedFixture[] {
  const out: ParsedFixture[] = [];
  let day: Day | null = null;
  let heading = '';
  for (const raw of lines) {
    const date = parseDateLine(raw, now);
    if (date) {
      day = date;
      continue;
    }
    const url = raw.match(URL)?.[0];
    let text = raw.replace(URL, ' ');
    const time = readTime(text);
    if (time) text = time.rest;
    const bracket = text.match(/\(([^)]+)\)/);
    if (bracket) text = text.replace(bracket[0], ' ');
    const isEventSport = getSport(opts.defaultSport).shape === 'event';

    if (!VERSUS.test(` ${text} `)) {
      // Not a match line: an event for sports like racing, otherwise a competition heading for the lines below.
      if (isEventSport && time) {
        const [title, ...venue] = text.split(/\s+(?:@|at)\s+|,\s+/i);
        out.push(finish({
          sport: detectSport(raw) ?? opts.defaultSport, level: opts.level, competition: tidy(bracket?.[1] ?? heading),
          title: tidy(title), venueName: tidy(venue.join(', ')), ticketUrl: url, raw,
        }, day, time, now));
      } else if (COMPETITION_WORDS.test(text)) {
        heading = tidy(text);
      }
      continue;
    }

    const segments = text.split(/\s+[-–—]\s+|:\s+/).map(tidy).filter(Boolean);
    const at = segments.findIndex((s) => VERSUS.test(` ${s} `));
    const [home, afterVersus = ''] = segments[at].split(VERSUS);
    const [away, ...venueParts] = afterVersus.split(/\s+(?:@|at)\s+|,\s+/i);
    const competition = tidy([...segments.filter((_, i) => i !== at), bracket?.[1] ?? ''].filter(Boolean).join(' - ')) || heading;
    out.push(finish({
      sport: detectSport(`${competition} ${raw}`) ?? opts.defaultSport, level: opts.level, competition,
      homeTeam: tidy(home), awayTeam: tidy(away), venueName: tidy(venueParts.join(', ')), ticketUrl: url, raw,
    }, day, time, now));
  }
  return out;
}

/** The layout copied from a ticket listing: each fixture is a block of short lines ending "At 12:30" / "Buy Tickets". */
function parseBlocks(lines: string[], opts: ParseOptions, now: Date): ParsedFixture[] {
  const out: ParsedFixture[] = [];
  const endsOnButton = lines.some((l) => /^buy tickets?$/i.test(l));
  let day: Day | null = null;
  let block: string[] = [];
  let time: { hour: number; minute: number } | null = null;

  const flush = () => {
    if (block.length === 0 && !time) return;
    let sportLine = '';
    let round = '';
    let competition = '';
    const rest: string[] = [];
    for (const line of block) {
      if (/^(vs?\.?|buy tickets?)$/i.test(line)) continue;
      if (SPORT_LINE.test(line) && !sportLine) sportLine = line;
      else if (ROUND.test(line) && !round) round = line;
      else if (COMPETITION_WORDS.test(line) && !competition) competition = line;
      else if (VERSUS.test(` ${line} `)) rest.push(...line.split(VERSUS));
      else rest.push(line);
    }
    const [home, away, ...venue] = rest.map(tidy);
    const fullCompetition = tidy([competition, round].filter(Boolean).join(' - '));
    out.push(finish({
      sport: detectSport(`${competition} ${sportLine}`) ?? opts.defaultSport, level: opts.level, competition: fullCompetition,
      homeTeam: home || undefined, awayTeam: away || undefined, venueName: tidy(venue.join(', ')), raw: block.join(' | '),
    }, day, time, now));
    block = [];
    time = null;
  };

  // Lines left over with no time are page headings or footers unless there are enough to be a fixture.
  const settle = () => {
    if (time || block.length >= 3) flush();
    block = [];
  };

  for (const line of lines) {
    const date = parseDateLine(line, now);
    if (date) {
      settle();
      day = date;
      continue;
    }
    const at = line.match(/^at\s+(.+)$/i);
    const t = at ? readTime(at[1]) : null;
    if (t) {
      time = t;
      if (!endsOnButton) flush();
      continue;
    }
    if (/^buy tickets?$/i.test(line)) {
      flush();
      continue;
    }
    block.push(line);
  }
  settle();
  return out;
}

/** Turns pasted text into fixtures. Never throws: anything it cannot read is reported in `problems`. */
export function parseFixtures(text: string, opts: ParseOptions): ParsedFixture[] {
  const now = opts.now ?? new Date();
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const isBlocks = lines.some((l) => /^at\s+\d{1,2}[:.]\d{2}/i.test(l));
  return isBlocks ? parseBlocks(lines, opts, now) : parseLines(lines, opts, now);
}
