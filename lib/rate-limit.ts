import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitStore>();

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
      if (now > value.resetTime) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  limit?: number; // max requests allowed in timeframe
  windowMs?: number; // timeframe window in ms (default 60s)
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  const limit = options.limit || 10;
  const windowMs = options.windowMs || 60 * 1000;
  const now = Date.now();

  const record = store.get(identifier);

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitStore = {
      count: 1,
      resetTime: now + windowMs,
    };
    store.set(identifier, newRecord);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil(newRecord.resetTime / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.ceil(record.resetTime / 1000),
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: Math.ceil(record.resetTime / 1000),
  };
}

export function getClientIp(request: NextRequest | Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

export function createRateLimitResponse(reset: number): NextResponse {
  const retryAfterSeconds = Math.max(1, reset - Math.floor(Date.now() / 1000));
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

export function clearRateLimitStore() {
  store.clear();
}
