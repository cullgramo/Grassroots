export function startOfDay(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

export function addDays(d: Date, days: number): Date {
  const s = new Date(d);
  s.setDate(s.getDate() + days);
  return s;
}

/** A day as the phone's own calendar names it: "2026-11-21". This is how a day picked on the day strip is kept. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Midnight at the start of that day on the phone's clock, or null when the text is not a real date. */
export function dayFromKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
}

/** Whole calendar days from now until the fixture; 0 means today. */
export function getDaysUntil(startsAt: string, now: Date = new Date()): number {
  const ms = startOfDay(new Date(startsAt)).getTime() - startOfDay(now).getTime();
  return Math.round(ms / 86_400_000);
}

/** Saturday 00:00 to Monday 00:00 of the current week; on a Sunday it starts today. */
export function weekendRange(now: Date = new Date()): [Date, Date] {
  const today = startOfDay(now);
  const dow = today.getDay();
  const start = dow === 0 ? today : addDays(today, 6 - dow);
  const end = dow === 0 ? addDays(today, 1) : addDays(start, 2);
  return [start, end];
}

export function dayLabel(startsAt: string, now: Date = new Date()): string {
  const days = getDaysUntil(startsAt, now);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return new Date(startsAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** 24-hour clock, the convention on Irish fixture lists. */
export function timeLabel(startsAt: string): string {
  const d = new Date(startsAt);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Day shown in a card's time block: "TODAY", "SAT", or "19 NOV" beyond a week. */
export function shortDay(startsAt: string, now: Date = new Date()): string {
  const d = new Date(startsAt);
  const days = getDaysUntil(startsAt, now);
  if (days === 0) return 'TODAY';
  if (days > 0 && days < 7) return WEEKDAYS[d.getDay()].toUpperCase();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`.toUpperCase();
}

/** Short label for a map pin: "Today 19:30", "Sat 14:00", "19 Nov". */
export function pinLabel(startsAt: string, now: Date = new Date(), timeTbc = false): string {
  const d = new Date(startsAt);
  const days = getDaysUntil(startsAt, now);
  if (timeTbc) return days === 0 ? 'Today' : days > 0 && days < 7 ? WEEKDAYS[d.getDay()] : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  if (days === 0) return `Today ${timeLabel(startsAt)}`;
  if (days > 0 && days < 7) return `${WEEKDAYS[d.getDay()]} ${timeLabel(startsAt)}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** What a map pin says for a fixture: a game that is off says so, in place of a time people would turn up for. */
export function pinLabelFor(f: { startsAt: string; timeTbc?: boolean; status?: string }, now: Date = new Date(), timeOnly = false): string {
  if (f.status === 'cancelled') return 'Cancelled';
  if (f.status === 'postponed') return 'Postponed';
  // With one day chosen, the day goes without saying: the pin is just the time.
  if (timeOnly) return f.timeTbc ? 'Time TBC' : timeLabel(f.startsAt);
  return pinLabel(f.startsAt, now, f.timeTbc);
}

/** True once a fixture's start time has gone by. A fixture with no confirmed time never counts as started. */
export function hasStarted(f: { startsAt: string; timeTbc?: boolean }, now: Date = new Date()): boolean {
  return !f.timeTbc && new Date(f.startsAt).getTime() < now.getTime();
}

/** Card badge that stresses how soon a game is, or null when it is more than a day away. */
export function urgencyLabel(startsAt: string, now: Date = new Date(), timeTbc = false): string | null {
  const mins = Math.round((new Date(startsAt).getTime() - now.getTime()) / 60_000);
  const days = getDaysUntil(startsAt, now);
  // With no start time there is nothing to count down to; only the day is known.
  if (timeTbc) return days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : null;
  if (days < 0) return null;
  if (mins < 0) return days === 0 ? 'Started' : null;
  if (mins < 60) return `In ${Math.max(mins, 1)} min`;
  if (mins < 360) return `In ${Math.round(mins / 60)}h`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return null;
}
