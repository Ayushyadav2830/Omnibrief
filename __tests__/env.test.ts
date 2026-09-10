import { describe, it, expect } from 'vitest';
import { validateEnv } from '../lib/env';

describe('Environment Variable Validation', () => {
  it('should pass validation with valid environment variables', () => {
    const validEnv = {
      GROQ_API_KEY: 'gsk_test_key_12345',
      JWT_SECRET: 'super_secret_jwt_key_at_least_16_chars_long',
      GOOGLE_AI_API_KEY: 'test_google_key',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    };

    const result = validateEnv(validEnv);
    expect(result.GROQ_API_KEY).toBe('gsk_test_key_12345');
    expect(result.JWT_SECRET).toBe('super_secret_jwt_key_at_least_16_chars_long');
  });

  it('should throw error when GROQ_API_KEY is missing', () => {
    const invalidEnv = {
      GROQ_API_KEY: '',
      JWT_SECRET: 'super_secret_jwt_key_at_least_16_chars_long',
    };

    expect(() => validateEnv(invalidEnv)).toThrow('GROQ_API_KEY is required');
  });

  it('should throw error when JWT_SECRET is less than 16 characters', () => {
    const invalidEnv = {
      GROQ_API_KEY: 'gsk_test',
      JWT_SECRET: 'short',
    };

    expect(() => validateEnv(invalidEnv)).toThrow('JWT_SECRET must be at least 16 characters');
  });
});
