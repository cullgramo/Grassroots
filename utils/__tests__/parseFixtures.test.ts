import { detectSport, irishTimeToIso, parseDateLine, parseFixtures } from '../parseFixtures';

const now = new Date('2026-11-11T12:00:00Z');
const opts = { defaultSport: 'gaelic-football' as const, level: 'Local' as const, now };

// As copied from the Leinster GAA tickets page in the screenshot.
const LEINSTER = `Match Tickets
Sat, 14 Nov 2026
Ballinacor
Naomh Fionnbarra/St. Annes
AIB Leinster Club Junior Football Championship 2026
Echelon Park, Wicklow GAA County Grounds
Football
Quarter-Final
At 12:30
Buy Tickets
Naomh Olaf
VS
Ballon GFC
AIB Leinster Club Intermediate Football Championship 2026
Parnell Park
Football
Quarter-Final
At 13:00
Buy Tickets
Curraha VS St Joseph's
AIB Leinster Club Junior Football Championship 2026
Skryne GFC
Football
Quarter-Final
At 13:30
Buy Tickets`;

describe('parseFixtures: ticket-listing blocks', () => {
  const got = parseFixtures(LEINSTER, opts);
  it('reads each block as one ready fixture', () => {
    expect(got).toHaveLength(3);
    expect(got.map((f) => f.problems)).toEqual([[], [], []]);
  });
  it('reads teams, competition with round, venue, sport and Irish winter time', () => {
    expect(got[0]).toMatchObject({
      homeTeam: 'Ballinacor', awayTeam: 'Naomh Fionnbarra/St. Annes', sport: 'gaelic-football', level: 'Local',
      competition: 'AIB Leinster Club Junior Football Championship 2026 - Quarter-Final',
      venueName: 'Echelon Park, Wicklow GAA County Grounds', startsAt: '2026-11-14T12:30:00.000Z',
    });
    expect(got[1]).toMatchObject({ homeTeam: 'Naomh Olaf', awayTeam: 'Ballon GFC', venueName: 'Parnell Park', startsAt: '2026-11-14T13:00:00.000Z' });
    expect(got[2]).toMatchObject({ homeTeam: 'Curraha', awayTeam: "St Joseph's", venueName: 'Skryne GFC' });
  });
  it('works without the Buy Tickets lines, and takes the sport from the code line', () => {
    const text = 'Sun 15 Nov\nA\nB\nLeinster Club Senior Hurling Championship\nNowlan Park\nHurling\nSemi-Final\nAt 14:00\nC\nD\nSome Cup\nCroke Park\nCamogie\nFinal\nAt 16:00';
    const f = parseFixtures(text, opts);
    expect(f.map((x) => [x.homeTeam, x.awayTeam, x.sport, x.venueName, x.startsAt])).toEqual([
      ['A', 'B', 'hurling', 'Nowlan Park', '2026-11-15T14:00:00.000Z'],
      ['C', 'D', 'camogie', 'Croke Park', '2026-11-15T16:00:00.000Z'],
    ]);
  });
  it('flags a block with something missing instead of guessing', () => {
    const f = parseFixtures('Sat, 14 Nov 2026\nOnly One Team\nAt 12:30\nBuy Tickets', opts);
    expect(f[0].problems).toEqual(['No venue', 'No teams']);
    expect(parseFixtures('Welcome\nMatch Tickets\nSat, 14 Nov 2026\nA\nB\nSome Cup\nCroke Park\nAt 12:00\nBuy Tickets\nContact us\nPrivacy', opts)).toHaveLength(1);
  });
});

describe('parseFixtures: one fixture per line', () => {
  it('reads time, teams and venue under a date line', () => {
    const f = parseFixtures('Saturday 14th November\n12:30 Ballinacor v St Annes, Echelon Park\n2pm Naomh Olaf vs Ballon @ Parnell Park', opts);
    expect(f.map((x) => [x.homeTeam, x.awayTeam, x.venueName, x.startsAt, x.problems])).toEqual([
      ['Ballinacor', 'St Annes', 'Echelon Park', '2026-11-14T12:30:00.000Z', []],
      ['Naomh Olaf', 'Ballon', 'Parnell Park', '2026-11-14T14:00:00.000Z', []],
    ]);
  });
  it('reads a competition before a colon, in brackets, or from a heading line', () => {
    const f = parseFixtures('14/11/2026\nKilkenny SHC Final: Ballyhale v Dicksboro, Nowlan Park 3.30pm\nCorofin v Salthill at Pearse Stadium 19:00 (Galway Senior Football Championship)\nDublin Senior Camogie Championship\nNa Fianna v St Vincents, Parnell Park 12:00', opts);
    expect(f.map((x) => [x.competition, x.sport, x.venueName])).toEqual([
      ['Kilkenny SHC Final', 'hurling', 'Nowlan Park'],
      ['Galway Senior Football Championship', 'gaelic-football', 'Pearse Stadium'],
      ['Dublin Senior Camogie Championship', 'camogie', 'Parnell Park'],
    ]);
    expect(f[0].startsAt).toBe('2026-11-14T15:30:00.000Z');
  });
  it('keeps a ticket link and uses the chosen default sport', () => {
    const f = parseFixtures('20 Nov\nBohemians v Shelbourne, Dalymount Park 19:45 https://example.com/tickets/1', { ...opts, defaultSport: 'soccer', level: 'Top level' });
    expect(f[0]).toMatchObject({ sport: 'soccer', level: 'Top level', ticketUrl: 'https://example.com/tickets/1', venueName: 'Dalymount Park' });
  });
  it('reads titled events for sports without two teams', () => {
    const f = parseFixtures('26 Dec\n12:40 Leopardstown Christmas Festival, Leopardstown Racecourse', { ...opts, defaultSport: 'horse-racing' });
    expect(f[0]).toMatchObject({ title: 'Leopardstown Christmas Festival', venueName: 'Leopardstown Racecourse', problems: [] });
    expect(f[0].homeTeam).toBeUndefined();
  });
  it('says what is missing', () => {
    expect(parseFixtures('A v B, Somewhere 12:00', opts)[0].problems).toEqual(['No date']);
    expect(parseFixtures('14 Nov\nA v B, Somewhere', opts)[0].problems).toEqual(['No time']);
    expect(parseFixtures('14 Nov\nA v B 12:00', opts)[0].problems).toEqual(['No venue']);
    expect(parseFixtures('1 Nov 2026\nA v B, Somewhere 12:00', opts)[0].problems).toEqual(['Date is in the past']);
    expect(parseFixtures('random words\n\nmore text', opts)).toEqual([]);
  });
});

describe('dates and times', () => {
  it('reads Irish date styles, day first', () => {
    expect(parseDateLine('Sat, 14 Nov 2026', now)).toEqual({ year: 2026, month: 11, day: 14 });
    expect(parseDateLine('Sunday 3rd January', now)).toEqual({ year: 2027, month: 1, day: 3 });
    expect(parseDateLine('November 14, 2026', now)).toEqual({ year: 2026, month: 11, day: 14 });
    expect(parseDateLine('03/12/26', now)).toEqual({ year: 2026, month: 12, day: 3 });
    expect(parseDateLine('20 Oct', now)).toEqual({ year: 2026, month: 10, day: 20 });
    expect(parseDateLine('Ballinacor', now)).toBeNull();
    expect(parseDateLine('31/13/2026', now)).toBeNull();
  });
  it('allows for summer time', () => {
    expect(irishTimeToIso({ year: 2026, month: 11, day: 14 }, 12, 30)).toBe('2026-11-14T12:30:00.000Z');
    expect(irishTimeToIso({ year: 2026, month: 7, day: 19 }, 15, 30)).toBe('2026-07-19T14:30:00.000Z');
  });
  it('spots the sport from words', () => {
    expect(detectSport('Leinster Ladies Football Final')).toBe('ladies-football');
    expect(detectSport('Cork PIHC')).toBe('hurling');
    expect(detectSport('Junior B Football')).toBe('gaelic-football');
    expect(detectSport('Table quiz')).toBeNull();
  });
});
