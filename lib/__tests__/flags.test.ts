import { isFlagged } from '../flags';

const answer = (status: number, body: string) => (async () => new Response(body, { status })) as unknown as typeof fetch;

describe('reported fixtures', () => {
  it('is flagged only when the database says yes', async () => {
    expect(await isFlagged('id', answer(200, 'true'))).toBe(true);
    expect(await isFlagged('id', answer(200, 'false'))).toBe(false);
  });

  it('a failure never shows a warning', async () => {
    expect(await isFlagged('id', answer(404, '{"message":"not found"}'))).toBe(false);
    expect(await isFlagged('id', (async () => { throw new Error('offline'); }) as unknown as typeof fetch)).toBe(false);
  });
});
