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

export function timeLabel(startsAt: string): string {
  return new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
