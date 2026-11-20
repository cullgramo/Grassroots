import { fixtureTitle, type Fixture } from '@/types/fixture';
import { clubFixtures, type FollowedClub } from '@/utils/club';
import { dayLabel, timeLabel } from '@/utils/date';

/** One reminder the phone should hold. */
export interface Reminder {
  /** Carries the fixture and the moment, so a game whose time changes gets a new reminder and the old one is removed. */
  id: string;
  fixtureId: string;
  at: Date;
  title: string;
  body: string;
}

/** Every reminder this app sets starts with this, so it never touches anything else on the phone. */
export const REMINDER_PREFIX = 'fx-';
/** How long before the start a reminder arrives. */
export const LEAD_MINUTES = 120;
/** With no start time announced, the reminder comes at this hour on the day. */
export const TBC_HOUR = 9;
/** iPhones hold at most 64 pending reminders for one app; staying well under leaves room. */
export const MAX_REMINDERS = 40;
/** Fixtures further off than this are picked up on a later opening of the app. */
export const WINDOW_DAYS = 14;

const MINUTE = 60_000;

/** When the reminder for a fixture is due. */
export function reminderTime(f: Pick<Fixture, 'startsAt' | 'timeTbc'>): Date {
  const start = new Date(f.startsAt);
  if (!f.timeTbc) return new Date(start.getTime() - LEAD_MINUTES * MINUTE);
  // The clock part of a "Time TBC" fixture is a placeholder; only its day is real.
  return new Date(start.getFullYear(), start.getMonth(), start.getDate(), TBC_HOUR, 0, 0, 0);
}

function wording(f: Fixture, at: Date): { title: string; body: string } {
  const day = dayLabel(f.startsAt, at);
  const when = f.timeTbc ? `${day}, time to be confirmed` : `${day} ${timeLabel(f.startsAt)}`;
  const where = f.venue ? ` · ${f.venue}${f.venueUnconfirmed ? ' (ground not confirmed)' : ''}` : '';
  return { title: fixtureTitle(f), body: `${when}${where}. Fixtures can change: check before you travel.` };
}

/**
 * The reminders the phone should hold right now: one for each starred fixture and each fixture of a followed club,
 * soonest first. Cancelled, postponed and finished games get none, and neither does a game whose reminder time has
 * already gone by.
 */
export function planReminders(upcoming: Fixture[], savedIds: string[], followedClubs: FollowedClub[], now: Date = new Date()): Reminder[] {
  const wanted = new Map<string, Fixture>();
  const saved = new Set(savedIds);
  for (const f of upcoming) if (saved.has(f.id)) wanted.set(f.id, f);
  for (const club of followedClubs) for (const f of clubFixtures(upcoming, club.name, club.group)) wanted.set(f.id, f);

  const earliest = now.getTime() + MINUTE;
  const latest = now.getTime() + WINDOW_DAYS * 24 * 60 * MINUTE;
  const out: Reminder[] = [];
  for (const f of wanted.values()) {
    if (f.status && f.status !== 'scheduled') continue;
    const at = reminderTime(f);
    if (Number.isNaN(at.getTime()) || at.getTime() < earliest || at.getTime() > latest) continue;
    out.push({ id: `${REMINDER_PREFIX}${f.id}-${at.getTime()}`, fixtureId: f.id, at, ...wording(f, at) });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id)).slice(0, MAX_REMINDERS);
}

/**
 * What to change on the phone so it holds exactly the plan: which of our reminders to cancel and which to add.
 * Reminders set by anything else (ids without our prefix) are left alone.
 */
export function reminderChanges(scheduledIds: string[], plan: Reminder[]): { cancel: string[]; add: Reminder[] } {
  const ours = scheduledIds.filter((id) => id.startsWith(REMINDER_PREFIX));
  const want = new Set(plan.map((r) => r.id));
  const have = new Set(ours);
  return { cancel: ours.filter((id) => !want.has(id)), add: plan.filter((r) => !have.has(r.id)) };
}
