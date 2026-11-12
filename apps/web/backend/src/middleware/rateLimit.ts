import rateLimit from "express-rate-limit";

// Strict limit for credential-guessing endpoints.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});

// Contact/enquiry form — public, keep it tight to avoid spam.
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Try again later." },
});

// Mobile app login + client-code checks — still strict, these are unauthenticated.
export const appAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});
