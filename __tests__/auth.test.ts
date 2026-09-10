import { describe, it, expect } from 'vitest';
import { generateToken, verifyToken } from '../lib/auth';

describe('Auth Utilities', () => {
  it('should generate and verify JWT token successfully', () => {
    const payload = { userId: 'user_123', email: 'test@example.com' };
    const token = generateToken(payload);

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);

    const verified = verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('user_123');
    expect(verified?.email).toBe('test@example.com');
  });

  it('should return null for invalid JWT token', () => {
    const verified = verifyToken('invalid.jwt.token');
    expect(verified).toBeNull();
  });
});
