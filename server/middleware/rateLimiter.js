// server/middleware/rateLimiter.js
// ─────────────────────────────────────────────────────────────
// Rate limiting middleware using express-rate-limit.
// Protects general API routes and voice turn processing.
// ─────────────────────────────────────────────────────────────

import rateLimit from 'express-rate-limit';

/**
 * Standard error response handler ensuring consistent JSON error response format.
 *
 * @param {string} errorMessage - Error message to return in JSON.
 */
const createRateLimitHandler = (errorMessage) => (req, res, next, options) => {
  res.status(options.statusCode || 429).json({
    error: errorMessage,
  });
};

/**
 * Default rate limiter: 100 requests per minute per IP.
 * Applied across general API endpoints.
 */
export const defaultLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,            // 100 requests per minute per IP
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many requests, please try again later.'),
  message: {
    error: 'Too many requests, please try again later.',
  },
});

/**
 * Turn rate limiter: 20 requests per minute per IP.
 * Dedicated limiter for the voice turn endpoint (/api/calls/:id/turn).
 */
export const turnLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // 20 requests per minute per IP
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many requests, please wait a moment before trying again.'),
  message: {
    error: 'Too many requests, please wait a moment before trying again.',
  },
});

export default defaultLimiter;
