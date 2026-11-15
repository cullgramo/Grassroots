/**
 * What the public can send us: a problem with a fixture, and a request to claim a club.
 * See supabase/migrations/0007_reports_claims_sponsors.sql.
 */
import { rpc } from '@/lib/rpc';

export type Problem = 'time' | 'ground' | 'off' | 'teams' | 'tickets' | 'other';

export const PROBLEMS: { id: Problem; label: string }[] = [
  { id: 'time', label: 'Wrong date or time' },
  { id: 'ground', label: 'Wrong ground or pin' },
  { id: 'off', label: 'Cancelled or postponed' },
  { id: 'teams', label: 'Wrong teams or competition' },
  { id: 'tickets', label: 'Ticket link wrong' },
  { id: 'other', label: 'Something else' },
];

export const NOTE_MAX = 300;

/** True when the report was taken. False when the fixture is not one we can report on (a sample fixture, say). */
export async function reportFixture(fixtureId: string, problem: Problem, note: string, fetchImpl?: typeof fetch): Promise<boolean> {
  const clean = note.trim().slice(0, NOTE_MAX);
  return (await rpc<boolean>('report_fixture', { p_fixture: fixtureId, p_problem: problem, p_note: clean || null }, fetchImpl)) === true;
}

export const ROLES = ['PRO', 'Secretary', 'Chairperson', 'Coach', 'Other officer'] as const;
export type Role = (typeof ROLES)[number];

export interface Claim {
  club: string;
  county: string;
  name: string;
  role: Role;
  email: string;
  message: string;
}

export const MESSAGE_MAX = 500;

/** What is missing or wrong in a claim, in words to show beside the form. Empty when it can be sent. */
export function claimProblems(c: Partial<Claim>): string[] {
  const out: string[] = [];
  if ((c.club ?? '').trim().length < 2) out.push('Add the club name.');
  if ((c.name ?? '').trim().length < 2) out.push('Add your name.');
  if (!c.role) out.push('Choose your role in the club.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((c.email ?? '').trim())) out.push('Add an email address we can reach you on.');
  return out;
}

export async function claimClub(c: Claim, fetchImpl?: typeof fetch): Promise<boolean> {
  return (
    (await rpc<boolean>(
      'claim_club',
      {
        p_club: c.club.trim(),
        p_county: c.county.trim() || null,
        p_name: c.name.trim(),
        p_role: c.role,
        p_email: c.email.trim(),
        p_message: c.message.trim().slice(0, MESSAGE_MAX) || null,
      },
      fetchImpl,
    )) === true
  );
}
