import {
  POOL_PRESSURE_THRESHOLD,
  PoolPressureMonitor,
  isPoolExhaustionError,
  withConnectionRetry,
  PoolStats,
} from './pool-pressure';

describe('DB-POOL-1210: PoolPressureMonitor', () => {
  const idlePool: PoolStats = { total: 20, idle: 18, waiting: 0, used: 2 };

  it('does not flag backpressure at low utilization', () => {
    const monitor = new PoolPressureMonitor();
    const decision = monitor.evaluate(idlePool);
    expect(decision.underPressure).toBe(false);
    expect(decision.utilization).toBeCloseTo(0.1);
    expect(decision.suggestedBackoffMs).toBe(0);
  });

  it('flags backpressure exactly at the 90% threshold', () => {
    const monitor = new PoolPressureMonitor();
    const decision = monitor.evaluate({ total: 20, idle: 2, waiting: 0, used: 18 });
    expect(decision.utilization).toBeCloseTo(POOL_PRESSURE_THRESHOLD);
    expect(decision.underPressure).toBe(true);
  });

  it('flags backpressure above the 90% threshold', () => {
    const monitor = new PoolPressureMonitor();
    const decision = monitor.evaluate({ total: 20, idle: 1, waiting: 0, used: 19 });
    expect(decision.underPressure).toBe(true);
    expect(decision.utilization).toBeCloseTo(0.95);
  });

  it('flags backpressure when clients are queued even below threshold', () => {
    const monitor = new PoolPressureMonitor();
    const decision = monitor.evaluate({ total: 20, idle: 14, waiting: 3, used: 6 });
    expect(decision.underPressure).toBe(true);
    expect(decision.utilization).toBeCloseTo(0.3);
  });

  it('handles a zero-total pool without dividing by zero', () => {
    const monitor = new PoolPressureMonitor();
    const decision = monitor.evaluate({ total: 0, idle: 0, waiting: 0, used: 0 });
    expect(decision.underPressure).toBe(false);
    expect(decision.utilization).toBe(0);
  });

  it('suggests exponential backoff that grows with consecutive retries', () => {
    const monitor = new PoolPressureMonitor();
    monitor.recordRetry();
    const first = monitor.evaluate({ total: 20, idle: 0, waiting: 2, used: 20 });
    monitor.recordRetry();
    const second = monitor.evaluate({ total: 20, idle: 0, waiting: 2, used: 20 });
    expect(second.suggestedBackoffMs).toBeGreaterThan(
      first.suggestedBackoffMs,
    );
    monitor.reset();
    const afterReset = monitor.evaluate({
      total: 20,
      idle: 0,
      waiting: 2,
      used: 20,
    });
    expect(afterReset.suggestedBackoffMs).toBeLessThan(
      second.suggestedBackoffMs,
    );
  });

  describe('isPoolExhaustionError', () => {
    it('matches acquisition timeouts', () => {
      expect(
        isPoolExhaustionError(
          new Error('timeout exceeded when trying to connect'),
        ),
      ).toBe(true);
    });

    it('matches connection-level errors by code', () => {
      const err = new Error('connect failed') as Error & { code?: string };
      err.code = 'ETIMEDOUT';
      expect(isPoolExhaustionError(err)).toBe(true);
      expect(isPoolExhaustionError(new Error('ECONNREFUSED'))).toBe(true);
    });

    it('does not match unrelated errors', () => {
      expect(isPoolExhaustionError(new Error('relation does not exist'))).toBe(
        false,
      );
      expect(isPoolExhaustionError(null)).toBe(false);
    });
  });

  describe('withConnectionRetry', () => {
    let timers: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers();
      timers = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((cb: () => void) => {
          cb();
          return 1 as unknown as NodeJS.Timeout;
        });
    });

    afterEach(() => {
      timers.mockRestore();
      jest.useRealTimers();
    });

    it('retries a pool-timeout operation and eventually succeeds', async () => {
      const monitor = new PoolPressureMonitor();
      let calls = 0;
      const op = jest.fn(async () => {
        calls += 1;
        if (calls < 3) {
          throw new Error('timeout exceeded when trying to connect');
        }
        return 'ok';
      });

      await expect(withConnectionRetry(op, monitor)).resolves.toBe('ok');
      expect(op).toHaveBeenCalledTimes(3);
    });

    it('gives up after maxRetries for persistent pool exhaustion', async () => {
      const monitor = new PoolPressureMonitor(0.9, 2, 10);
      const op = jest.fn(async () => {
        throw new Error('timeout exceeded when trying to connect');
      });

      await expect(withConnectionRetry(op, monitor)).rejects.toThrow(
        'timeout exceeded',
      );
      expect(op).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('does not retry non-pool errors', async () => {
      const monitor = new PoolPressureMonitor();
      const op = jest.fn(async () => {
        throw new Error('syntax error at or near "SELECT"');
      });

      await expect(withConnectionRetry(op, monitor)).rejects.toThrow(
        'syntax error',
      );
      expect(op).toHaveBeenCalledTimes(1);
    });

    it('respects an overall deadline', async () => {
      const monitor = new PoolPressureMonitor(0.9, 100, 1);
      const op = jest.fn(async () => {
        throw new Error('timeout exceeded when trying to connect');
      });

      // Freeze time at t=0; the deadline is 5ms later. Advance the clock
      // after the first attempt so the deadline check triggers.
      let now = 0;
      const nowSpy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => (now += 5));

      await expect(
        withConnectionRetry(op, monitor, { timeoutMs: 5 }),
      ).rejects.toThrow('timeout exceeded');
      expect(op.mock.calls.length).toBeLessThan(100);

      nowSpy.mockRestore();
    });
  });
});
