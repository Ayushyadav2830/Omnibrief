import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, clearRateLimitStore } from '../lib/rate-limit';

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it('should allow requests within limit', () => {
    const res1 = checkRateLimit('user1', { limit: 3, windowMs: 60000 });
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit('user1', { limit: 3, windowMs: 60000 });
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit('user1', { limit: 3, windowMs: 60000 });
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it('should block requests exceeding the limit', () => {
    checkRateLimit('user2', { limit: 2, windowMs: 60000 });
    checkRateLimit('user2', { limit: 2, windowMs: 60000 });

    const blockedRes = checkRateLimit('user2', { limit: 2, windowMs: 60000 });
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.remaining).toBe(0);
  });

  it('should maintain independent limits per identifier', () => {
    const resA = checkRateLimit('clientA', { limit: 2, windowMs: 60000 });
    const resB = checkRateLimit('clientB', { limit: 2, windowMs: 60000 });

    expect(resA.success).toBe(true);
    expect(resB.success).toBe(true);
    expect(resA.remaining).toBe(1);
    expect(resB.remaining).toBe(1);
  });
});
