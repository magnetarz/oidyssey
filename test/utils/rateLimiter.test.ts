import { SnmpRateLimiter } from '../../src/utils/security/rateLimiter';

describe('SnmpRateLimiter', () => {
  it('allows requests under the limit and blocks once exceeded', () => {
    const rl = new SnmpRateLimiter({ maxRequestsPerWindow: 2, windowSizeMs: 2000, blockDurationMs: 2000 });
    const host = '192.168.1.50';
    expect(rl.checkRateLimit(host).allowed).toBe(true);
    expect(rl.checkRateLimit(host).allowed).toBe(true);
    const third = rl.checkRateLimit(host);
    expect(third.allowed).toBe(false);

    rl.shutdown();
  });
});


