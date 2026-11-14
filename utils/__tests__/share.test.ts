import type { Fixture } from '@/types/fixture';
import { directionsUrl, emailUrl, fixtureLink, mapLink, shareMessage, smsUrl, whatsAppUrl } from '../share';

const base: Fixture = {
  id: 'f1', sport: 'soccer', level: 'Top level', competition: 'NIFL Premiership',
  homeTeam: 'Ballymena United', awayTeam: 'Larne', venue: 'Ballymena Showgrounds', county: 'Antrim',
  latitude: 54.87, longitude: -6.265, startsAt: '2026-12-01T19:45:00.000Z', ticketed: false,
};

describe('shareMessage', () => {
  it('carries the teams, sport, competition, Irish local time, ground and directions', () => {
    const m = shareMessage(base, null).split('\n');
    expect(m[0]).toBe('Ballymena United v Larne');
    expect(m[1]).toBe('Soccer · NIFL Premiership');
    expect(m[2]).toBe('Tuesday 1 December, 19:45');
    expect(m[3]).toBe('Ballymena Showgrounds, Antrim');
    expect(m[4]).toBe('Directions: https://maps.google.com/?q=54.87,-6.265');
    expect(m[m.length - 1]).toBe('Found on Grassroots');
  });

  it('shows Irish summer time whatever the sender’s clock', () => {
    expect(shareMessage({ ...base, startsAt: '2026-07-04T13:00:00.000Z' }, null)).toContain('Saturday 4 July, 14:00');
  });

  it('adds the ticket seller link only when one is known', () => {
    expect(shareMessage(base, null)).not.toContain('Tickets:');
    expect(shareMessage({ ...base, ticketed: true, ticketUrl: 'https://club.example/tickets' }, null)).toContain('Tickets: https://club.example/tickets');
    // a web search is not a link we vouch for
    expect(shareMessage({ ...base, ticketed: true }, null)).not.toContain('google.com/search');
  });

  it('says when the time is not confirmed, and when a fixture is off', () => {
    expect(shareMessage({ ...base, timeTbc: true }, null)).toContain('Tuesday 1 December, time to be confirmed');
    expect(shareMessage({ ...base, status: 'postponed' }, null).split('\n')[0]).toBe('POSTPONED');
    expect(shareMessage({ ...base, status: 'cancelled' }, null).split('\n')[0]).toBe('CANCELLED');
  });

  it('works for an event with a title and no competition', () => {
    const m = shareMessage({ ...base, sport: 'horse-racing', homeTeam: undefined, awayTeam: undefined, title: 'Leopardstown, Day 1', competition: '' }, null);
    expect(m.split('\n')[0]).toBe('Leopardstown, Day 1');
    expect(m.split('\n')[1]).toBe('Horse Racing');
  });
});

describe('share links', () => {
  const text = 'A v B\nSat 14:00 & more';
  it('encodes the message for WhatsApp, text and email', () => {
    expect(whatsAppUrl(text)).toBe('https://wa.me/?text=A%20v%20B%0ASat%2014%3A00%20%26%20more');
    expect(smsUrl(text, 'ios')).toBe('sms:&body=A%20v%20B%0ASat%2014%3A00%20%26%20more');
    expect(smsUrl(text, 'android')).toBe('sms:?body=A%20v%20B%0ASat%2014%3A00%20%26%20more');
    expect(emailUrl('A v B', text)).toBe('mailto:?subject=A%20v%20B&body=A%20v%20B%0ASat%2014%3A00%20%26%20more');
  });
  it('gives a short map link for messages', () => {
    expect(mapLink({ latitude: 53.36, longitude: -6.25 })).toBe('https://maps.google.com/?q=53.36,-6.25');
  });
  it('builds a directions link from the ground’s position', () => {
    expect(directionsUrl({ latitude: 53.36, longitude: -6.25 })).toBe('https://www.google.com/maps/dir/?api=1&destination=53.36,-6.25');
  });
});

describe('sharing with the site live', () => {
  const site = 'https://grassroots.example/';
  it('is short with a single link, so chat apps can show a card', () => {
    const m = shareMessage(base, site);
    expect(m.split('\n')).toEqual([
      'Ballymena United v Larne',
      'Tuesday 1 December, 19:45 · Ballymena Showgrounds, Antrim',
      'Directions, tickets and more on Grassroots:',
      'https://grassroots.example/f/f1',
    ]);
    expect((m.match(/https?:\/\//g) ?? []).length).toBe(1);
  });
  it('leaves directions and tickets to the page, even when a seller is known', () => {
    const m = shareMessage({ ...base, ticketed: true, ticketUrl: 'https://club.example/tickets' }, site);
    expect(m).not.toContain('club.example');
    expect((m.match(/https?:\/\//g) ?? []).length).toBe(1);
  });
  it('still leads with a postponement', () => {
    expect(shareMessage({ ...base, status: 'postponed' }, site).split('\n')[0]).toBe('POSTPONED');
  });
  it('has no link until the site exists', () => {
    expect(fixtureLink('f1', null)).toBeNull();
    expect(fixtureLink('a b', 'https://x.example')).toBe('https://x.example/f/a%20b');
  });
});
