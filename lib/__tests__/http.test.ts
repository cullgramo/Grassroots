import { fetchT, TimeoutError } from '../http';

describe('fetchT', () => {
  it('returns the response when the server answers in time', async () => {
    const ok = async () => new Response('hi');
    expect(await (await fetchT('https://x.test', {}, 1000, ok as unknown as typeof fetch)).text()).toBe('hi');
  });
  it('gives up with a clear error when the server never answers', async () => {
    // a fetch that only ends when it is told to stop, like a stalled connection
    const hangs = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    const started = Date.now();
    await expect(fetchT('https://x.test', {}, 50, hangs as unknown as typeof fetch)).rejects.toBeInstanceOf(TimeoutError);
    expect(Date.now() - started).toBeLessThan(1000);
  });
  it('passes a real network failure through unchanged', async () => {
    const down = async () => { throw new TypeError('Network request failed'); };
    await expect(fetchT('https://x.test', {}, 1000, down as unknown as typeof fetch)).rejects.toThrow('Network request failed');
  });
});
