import { RATE_LIMIT_CONFIG } from './constants';

import type { RateLimitEntry } from './types';

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, RATE_LIMIT_CONFIG.WINDOW_MS);
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.requests.forEach((entry, key) => {
      if (now - entry.lastRequest > RATE_LIMIT_CONFIG.WINDOW_MS * 2) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.requests.delete(key));
  }

  public checkLimit(identifier: string, maxRequests: number = RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE): boolean {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry) {
      this.requests.set(identifier, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
      });
      return true;
    }

    const timeWindow = now - entry.firstRequest;

    if (timeWindow > RATE_LIMIT_CONFIG.WINDOW_MS) {
      this.requests.set(identifier, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
      });
      return true;
    }

    if (entry.count >= maxRequests) {
      return false;
    }

    entry.count += 1;
    entry.lastRequest = now;
    this.requests.set(identifier, entry);

    return true;
  }

  public getRemainingRequests(identifier: string, maxRequests: number = RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE): number {
    const entry = this.requests.get(identifier);

    if (!entry) {
      return maxRequests;
    }

    const now = Date.now();
    const timeWindow = now - entry.firstRequest;

    if (timeWindow > RATE_LIMIT_CONFIG.WINDOW_MS) {
      return maxRequests;
    }

    return Math.max(0, maxRequests - entry.count);
  }

  public getResetTime(identifier: string): number {
    const entry = this.requests.get(identifier);

    if (!entry) {
      return 0;
    }

    return entry.firstRequest + RATE_LIMIT_CONFIG.WINDOW_MS;
  }

  public reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
  }
}

export const rateLimiter = new RateLimiter();

export const checkRateLimit = (
  identifier: string,
  maxRequests?: number
): { allowed: boolean; remaining: number; resetAt: number } => {
  const allowed = rateLimiter.checkLimit(identifier, maxRequests);
  const remaining = rateLimiter.getRemainingRequests(identifier, maxRequests);
  const resetAt = rateLimiter.getResetTime(identifier);

  return { allowed, remaining, resetAt };
};

export const withRateLimit = async <T>(
  identifier: string,
  fn: () => Promise<T>,
  maxRequests?: number
): Promise<T> => {
  const { allowed, resetAt } = checkRateLimit(identifier, maxRequests);

  if (!allowed) {
    const waitTime = Math.ceil((resetAt - Date.now()) / 1000);
    throw new Error(`Limite de requisições excedido. Tente novamente em ${waitTime} segundos.`);
  }

  return fn();
};

export const createUserRateLimiter = (userId: string) => {
  return {
    check: (action: string, maxRequests?: number) => {
      const identifier = `${userId}:${action}`;
      return checkRateLimit(identifier, maxRequests);
    },
    wrap: async <T>(action: string, fn: () => Promise<T>, maxRequests?: number): Promise<T> => {
      const identifier = `${userId}:${action}`;
      return withRateLimit(identifier, fn, maxRequests);
    },
  };
};
