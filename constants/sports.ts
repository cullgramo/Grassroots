export type SportShape = 'match' | 'event';

export interface SportInfo {
  id: string;
  name: string;
  /** Sports in one group share a chip on the Explore strip. */
  group: string;
  shape: SportShape;
  color: string;
  /** What this sport calls the start of play. */
  startWord: string;
}

export const SPORTS = [
  { id: 'hurling', name: 'Hurling', group: 'gaa', shape: 'match', color: '#ea580c', startWord: 'Throw-in' },
  { id: 'gaelic-football', name: 'Gaelic Football', group: 'gaa', shape: 'match', color: '#16a34a', startWord: 'Throw-in' },
  { id: 'camogie', name: 'Camogie', group: 'gaa', shape: 'match', color: '#9333ea', startWord: 'Throw-in' },
  { id: 'ladies-football', name: 'Ladies Football', group: 'gaa', shape: 'match', color: '#db2777', startWord: 'Throw-in' },
  { id: 'soccer', name: 'Soccer', group: 'soccer', shape: 'match', color: '#2563eb', startWord: 'Kick-off' },
  { id: 'rugby', name: 'Rugby', group: 'rugby', shape: 'match', color: '#1e3a8a', startWord: 'Kick-off' },
  { id: 'hockey', name: 'Hockey', group: 'hockey', shape: 'match', color: '#0891b2', startWord: 'Push-back' },
  { id: 'basketball', name: 'Basketball', group: 'basketball', shape: 'match', color: '#d97706', startWord: 'Tip-off' },
  { id: 'cricket', name: 'Cricket', group: 'cricket', shape: 'match', color: '#4d7c0f', startWord: 'First ball' },
  { id: 'athletics', name: 'Athletics', group: 'athletics', shape: 'event', color: '#dc2626', startWord: 'Start' },
  { id: 'golf', name: 'Golf', group: 'golf', shape: 'event', color: '#0f766e', startWord: 'First tee' },
  { id: 'horse-racing', name: 'Horse Racing', group: 'racing', shape: 'event', color: '#7c2d12', startWord: 'First race' },
  { id: 'boxing', name: 'Boxing', group: 'boxing', shape: 'event', color: '#475569', startWord: 'First bell' },
] as const satisfies readonly SportInfo[];

export type SportId = (typeof SPORTS)[number]['id'];
export type GroupId = (typeof SPORTS)[number]['group'];

export const ALL_SPORT_IDS: SportId[] = SPORTS.map((s) => s.id);

const BY_ID = new Map<string, SportInfo>(SPORTS.map((s) => [s.id, s]));
const UNKNOWN: SportInfo = { id: 'other', name: 'Sport', group: 'other', shape: 'event', color: '#475569', startWord: 'Start' };

export function getSport(id: string): SportInfo {
  return BY_ID.get(id) ?? UNKNOWN;
}

export const GROUPS: { id: GroupId; label: string; color: string | null }[] = [
  { id: 'gaa', label: 'GAA', color: null },
  { id: 'soccer', label: 'Soccer', color: '#2563eb' },
  { id: 'rugby', label: 'Rugby', color: '#1e3a8a' },
  { id: 'hockey', label: 'Hockey', color: '#0891b2' },
  { id: 'basketball', label: 'Basketball', color: '#d97706' },
  { id: 'cricket', label: 'Cricket', color: '#4d7c0f' },
  { id: 'athletics', label: 'Athletics', color: '#dc2626' },
  { id: 'golf', label: 'Golf', color: '#0f766e' },
  { id: 'racing', label: 'Racing', color: '#7c2d12' },
  { id: 'boxing', label: 'Boxing', color: '#475569' },
];

export function sportsInGroup(group: string): (typeof SPORTS)[number][] {
  return SPORTS.filter((s) => s.group === group);
}
