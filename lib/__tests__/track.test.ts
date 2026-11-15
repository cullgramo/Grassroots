import { countAction, resetViewed, track } from '../track';

const ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';

describe('countAction', () => {
  it('posts only the fixture id, the action and the channel', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true });
    await countAction(ID, 'ticket', 'web', fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toMatch(/\/rest\/v1\/rpc\/count_action$/);
    expect(JSON.parse(init.body)).toEqual({ p_fixture: ID, p_action: 'ticket', p_channel: 'web' });
  });

  it('skips sample fixtures that are not in the database', async () => {
    const fetchImpl = jest.fn();
    await countAction('12', 'view', 'app', fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('never throws when the network fails', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(countAction(ID, 'share', 'app', fetchImpl as unknown as typeof fetch)).resolves.toBeUndefined();
  });
});

describe('track', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    resetViewed();
  });

  it('counts a view once per fixture per session, but every tap', () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    track(ID, 'view');
    track(ID, 'view');
    track(ID, 'directions');
    track(ID, 'directions');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
