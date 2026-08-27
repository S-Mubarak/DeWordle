import {
  EVENT_DEDUP_KEY_PREFIX,
  EVENT_DEDUP_TTL_SECONDS,
  EventDedupService,
  RedisEventDedupCache,
} from './event-dedup.service';

const makeCache = () => ({
  has: jest.fn(),
  set: jest.fn(),
});

describe('IDX-DEDUP-1214: EventDedupService', () => {
  it('exposes a 24 hour TTL for dedup cache keys', () => {
    expect(EVENT_DEDUP_TTL_SECONDS).toBe(24 * 60 * 60);
  });

  it('builds a namespaced key from txHash and eventIndex', () => {
    const service = new EventDedupService(makeCache() as never);
    expect(service.buildKey('abc123', 7)).toBe(
      `${EVENT_DEDUP_KEY_PREFIX}:abc123:7`,
    );
  });

  it('records a first-seen event and returns false (not a duplicate)', async () => {
    const cache = makeCache();
    cache.has.mockResolvedValue(false);
    const service = new EventDedupService(cache as never);

    await expect(service.isDuplicate('tx-1', 0)).resolves.toBe(false);
    expect(cache.has).toHaveBeenCalledWith(
      `${EVENT_DEDUP_KEY_PREFIX}:tx-1:0`,
    );
    expect(cache.set).toHaveBeenCalledWith(
      `${EVENT_DEDUP_KEY_PREFIX}:tx-1:0`,
      EVENT_DEDUP_TTL_SECONDS,
    );
  });

  it('skips a redelivered event already present in the cache', async () => {
    const cache = makeCache();
    cache.has.mockResolvedValue(true);
    const service = new EventDedupService(cache as never);

    await expect(service.isDuplicate('tx-1', 0)).resolves.toBe(true);
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('treats distinct event indexes of the same tx as different events', async () => {
    const cache = makeCache();
    cache.has.mockImplementation(async (key: string) =>
      key.endsWith(':0'),
    );
    const service = new EventDedupService(cache as never);

    await expect(service.isDuplicate('tx-1', 0)).resolves.toBe(true);
    await expect(service.isDuplicate('tx-1', 1)).resolves.toBe(false);
  });
});

describe('IDX-DEDUP-1214: RedisEventDedupCache', () => {
  it('delegates existence checks to the Redis client', async () => {
    const client = {
      exists: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue('OK'),
    };
    const cache = new RedisEventDedupCache(client as never);

    await expect(cache.has('k')).resolves.toBe(true);
    expect(client.exists).toHaveBeenCalledWith('k');
  });

  it('writes cache entries with the requested TTL', async () => {
    const client = {
      exists: jest.fn().mockResolvedValue(0),
      set: jest.fn().mockResolvedValue('OK'),
    };
    const cache = new RedisEventDedupCache(client as never);

    await cache.set('k', EVENT_DEDUP_TTL_SECONDS);
    expect(client.set).toHaveBeenCalledWith(
      'k',
      '1',
      'EX',
      EVENT_DEDUP_TTL_SECONDS,
    );
  });
});
