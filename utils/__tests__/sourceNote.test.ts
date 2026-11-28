import { checkedLabel, siteName, sourceNote } from '../sourceNote';

const now = new Date('2026-11-28T12:00:00Z');

describe('where a fixture came from', () => {
  it('names the site without www, and ignores anything that is not a web address', () => {
    expect(siteName('https://www.offalygaa.ie/fixtures?x=1')).toBe('offalygaa.ie');
    expect(siteName('https://offaly.clubandcounty.com/')).toBe('offaly.clubandcounty.com');
    expect(siteName('javascript:alert(1)')).toBeNull();
    expect(siteName('not a url')).toBeNull();
    expect(siteName(undefined)).toBeNull();
  });

  it('says when it was checked, in Irish time', () => {
    expect(checkedLabel('2026-11-28T05:10:00Z', now)).toBe('today at 05:10');
    expect(checkedLabel('2026-11-27T05:10:00Z', now)).toBe('yesterday at 05:10');
    expect(checkedLabel('2026-11-24T05:10:00Z', now)).toBe('on Tue 24 Nov');
    // Summer time: 04:10 UTC is 05:10 in Ireland.
    expect(checkedLabel('2026-07-01T04:10:00Z', new Date('2026-07-01T12:00:00Z'))).toBe('today at 05:10');
  });

  it('a daily source shows its site, a link and when it was checked', () => {
    expect(sourceNote({ source: 'county-gaa', sourceUrl: 'https://offaly.clubandcounty.com/fixtures', checkedAt: '2026-11-28T05:10:00Z' }, now)).toEqual({
      text: 'From offaly.clubandcounty.com, checked today at 05:10',
      url: 'https://offaly.clubandcounty.com/fixtures',
    });
  });

  it('a saved copy never claims to be checked today', () => {
    const n = sourceNote({ source: 'nifl-snapshot', sourceUrl: 'https://www.nifl.co.uk/fixtures', checkedAt: '2026-11-28T05:10:00Z' }, now);
    expect(n?.text).toMatch(/^From a saved copy of the fixture list on nifl\.co\.uk, not checked daily\./);
    expect(n?.text).not.toMatch(/today/);
  });

  it('hand-added games say so; with nothing known there is no line', () => {
    expect(sourceNote({ source: 'admin' }, now)?.text).toMatch(/^Added by hand/);
    expect(sourceNote({ source: 'county-gaa' }, now)).toBeNull();
    expect(sourceNote({ source: 'county-gaa', checkedAt: '2026-11-28T05:10:00Z' }, now)?.text).toBe('From the organiser, checked today at 05:10');
  });
});
