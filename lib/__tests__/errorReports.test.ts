import { makeSender, MAX_PER_SESSION, scrub } from '../errorReports';

describe('scrub', () => {
  it('keeps the kind of error and its message, on one line', () => {
    expect(scrub(new TypeError('x is not\n a function'))).toBe('TypeError: x is not a function');
    expect(scrub('plain text')).toBe('plain text');
  });
  it('drops query strings, which can carry keys and search words', () => {
    expect(scrub(new Error('GET https://x.supabase.co/rest/v1/fixtures?apikey=secret&q=naas failed'))).toBe('Error: GET https://x.supabase.co/rest/v1/fixtures failed');
  });
  it('drops email addresses', () => {
    expect(scrub(new Error('claim from jane.doe@example.ie refused'))).toBe('Error: claim from [email] refused');
  });
  it('is never longer than the database allows', () => {
    expect(scrub(new Error('a'.repeat(1000))).length).toBe(300);
  });
});

describe('makeSender', () => {
  it('sends each different fault once', () => {
    const sent: string[] = [];
    const sender = makeSender((place, message) => sent.push(`${place}: ${message}`));
    expect(sender(new Error('boom'), 'loading fixtures')).toBe(true);
    expect(sender(new Error('boom'), 'loading fixtures')).toBe(false);
    expect(sender(new Error('boom'), 'saving a saved fixture')).toBe(true);
    expect(sent).toEqual(['loading fixtures: Error: boom', 'saving a saved fixture: Error: boom']);
  });
  it('stops at the limit for one session, so a fault that keeps changing cannot flood us', () => {
    let count = 0;
    const sender = makeSender(() => { count++; });
    for (let i = 0; i < MAX_PER_SESSION + 30; i++) sender(new Error(`fault ${i}`), 'somewhere');
    expect(count).toBe(MAX_PER_SESSION);
  });
  it('sends nothing for an empty place or message', () => {
    const sender = makeSender(() => { throw new Error('should not send'); });
    expect(sender(new Error('boom'), '  ')).toBe(false);
    expect(sender('', 'somewhere')).toBe(false);
  });
});
