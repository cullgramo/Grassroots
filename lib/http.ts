/**
 * fetch with a time limit. Without one, a stalled connection leaves the app waiting for as long as the phone's network
 * stack allows, with no error to show. Aborting turns it into a normal failure the screens already handle.
 */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`The request took longer than ${Math.round(ms / 1000)} seconds`);
    this.name = 'TimeoutError';
  }
}

export async function fetchT(url: string, init: RequestInit = {}, ms = 15_000, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) throw new TimeoutError(ms);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
