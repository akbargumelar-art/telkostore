// ==============================
// TELKO.STORE — Rate Limiter
// Simple in-memory rate limiting
// ==============================

/**
 * Create a rate limiter instance.
 * @param {Object} options
 * @param {number} options.maxAttempts - Maximum attempts allowed in the window
 * @param {number} options.windowMs - Time window in milliseconds
 * @returns {{ check: (key: string) => { allowed: boolean, remaining: number, resetIn: number } }}
 */
export function createRateLimiter({ maxAttempts = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const attempts = new Map(); // key → { count, firstAttempt }

  // Cleanup expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of attempts) {
      if (now - data.firstAttempt > windowMs) {
        attempts.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();

  return {
    /**
     * Check if a request is allowed under the rate limit.
     * @param {string} key - Identifier (typically IP address)
     * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
     */
    check(key) {
      const now = Date.now();
      const entry = attempts.get(key);

      // No previous attempts or window expired
      if (!entry || now - entry.firstAttempt > windowMs) {
        attempts.set(key, { count: 1, firstAttempt: now });
        return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs };
      }

      // Within window
      entry.count++;
      const resetIn = windowMs - (now - entry.firstAttempt);

      if (entry.count > maxAttempts) {
        return { allowed: false, remaining: 0, resetIn };
      }

      return { allowed: true, remaining: maxAttempts - entry.count, resetIn };
    },
  };
}

// ===== Pre-configured limiters =====

/** Admin login: 5 attempts per 15 minutes */
export const adminLoginLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
});

/** Checkout: 10 orders per 5 minutes per IP */
export const checkoutLimiter = createRateLimiter({
  maxAttempts: 10,
  windowMs: 5 * 60 * 1000,
});

/** Contact form: 3 messages per 10 minutes per IP */
export const contactLimiter = createRateLimiter({
  maxAttempts: 3,
  windowMs: 10 * 60 * 1000,
});
