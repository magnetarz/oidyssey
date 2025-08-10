import { SnmpRateLimiter } from '../../src/utils/security/rateLimiter';

describe('SnmpRateLimiter', () => {
  it('allows requests under the limit and blocks once exceeded', () => {
    const rl = new SnmpRateLimiter({ maxRequestsPerWindow: 2, windowSizeMs: 2000, blockDurationMs: 2000 });
    const host = '192.168.1.50';
    expect(rl.checkRateLimit(host).allowed).toBe(true);
    expect(rl.checkRateLimit(host).allowed).toBe(true);
    const third = rl.checkRateLimit(host);
    expect(third.allowed).toBe(false);
  });

  it('should reset the rate limit after the window expires', (done) => {
    const rl = new SnmpRateLimiter({ maxRequestsPerWindow: 1, windowSizeMs: 100, blockDurationMs: 100 });
    const host = '192.168.1.51';
    expect(rl.checkRateLimit(host).allowed).toBe(true);
    expect(rl.checkRateLimit(host).allowed).toBe(false);

    setTimeout(() => {
      expect(rl.checkRateLimit(host).allowed).toBe(true);
      done();
    }, 150);
  });

  it('should respect the block duration', (done) => {
    const rl = new SnmpRateLimiter({ maxRequestsPerWindow: 1, windowSizeMs: 100, blockDurationMs: 200 });
    const host = '192.168.1.52';
    expect(rl.checkRateLimit(host).allowed).toBe(true);
    expect(rl.checkRateLimit(host).allowed).toBe(false);

    setTimeout(() => {
      expect(rl.checkRateLimit(host).allowed).toBe(false);
    }, 150);

    setTimeout(() => {
      expect(rl.checkRateLimit(host).allowed).toBe(true);
      done();
    }, 250);
  });

  it('should handle different hosts independently', () => {
    const rl = new SnmpRateLimiter({ maxRequestsPerWindow: 1, windowSizeMs: 1000, blockDurationMs: 1000 });
    const host1 = '192.168.1.53';
    const host2 = '192.168.1.54';
    expect(rl.checkRateLimit(host1).allowed).toBe(true);
    expect(rl.checkRateLimit(host1).allowed).toBe(false);
    expect(rl.checkRateLimit(host2).allowed).toBe(true);
    expect(rl.checkRateLimit(host2).allowed).toBe(false);
  });
});


