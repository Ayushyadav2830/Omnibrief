import { z } from 'zod';

export const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required in environment variables.'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long.'),
  GOOGLE_AI_API_KEY: z.string().optional().or(z.literal('')),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().or(z.literal('')).default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(customEnv?: Record<string, string | undefined>): Env {
  const envToValidate = customEnv || process.env;
  const parsed = envSchema.safeParse(envToValidate);

  if (!parsed.success) {
    const errorMessages = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n  - ');
    
    console.error('❌ Environment validation failed:\n  - ' + errorMessages);
    throw new Error(`Environment variable validation failed:\n  - ${errorMessages}`);
  }

  return parsed.data;
}

// Helper to safely fetch env in app runtime
export function getEnv(): Env {
  try {
    return validateEnv();
  } catch (error) {
    if (process.env.NODE_ENV === 'test') {
      // Return safe defaults during test if process.env is unconfigured
      return {
        GROQ_API_KEY: process.env.GROQ_API_KEY || 'mock_groq_key',
        JWT_SECRET: process.env.JWT_SECRET || 'mock_jwt_secret_for_testing_only_32bytes',
        GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || '',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        NODE_ENV: 'test',
      };
    }
    throw error;
  }
}
