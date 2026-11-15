import { clearRecentErrors, recentErrors, report, reportTo, setReporter } from '../report';

describe('report', () => {
  beforeEach(() => { clearRecentErrors(); setReporter(null); jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());

  it('keeps what went wrong and where, instead of swallowing it', () => {
    report(new Error('disk full'), 'saving the age choice');
    expect(recentErrors()).toEqual([expect.objectContaining({ where: 'saving the age choice', message: 'disk full' })]);
  });
  it('works as a promise catch handler', async () => {
    await Promise.reject(new Error('nope')).catch(reportTo('loading fixtures'));
    expect(recentErrors()[0]).toMatchObject({ where: 'loading fixtures', message: 'nope' });
  });
  it('hands each error to a crash service when one is plugged in, and survives a broken one', () => {
    const seen: string[] = [];
    setReporter((e, where) => seen.push(`${where}: ${(e as Error).message}`));
    report(new Error('a'), 'x');
    expect(seen).toEqual(['x: a']);
    setReporter(() => { throw new Error('reporter down'); });
    expect(() => report(new Error('b'), 'y')).not.toThrow();
  });
  it('remembers only the last 30', () => {
    for (let i = 0; i < 40; i++) report(new Error(`e${i}`), 'loop');
    expect(recentErrors()).toHaveLength(30);
    expect(recentErrors()[0].message).toBe('e10');
  });
});
