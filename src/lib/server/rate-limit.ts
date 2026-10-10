import "server-only";
import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env";

type Rule = { limit: number; window: Duration };

/** Every abusable endpoint has its own bucket. Keys are hashed identifiers, never raw PII. */
export const RULES = {
  otpRequestById: { limit: 3, window: "10 m" },
  otpRequestByIp: { limit: 10, window: "1 h" },
  otpVerify: { limit: 8, window: "10 m" },
  totpVerify: { limit: 6, window: "10 m" },
  booking: { limit: 12, window: "10 m" },
  contact: { limit: 5, window: "1 h" },
  sosCheck: { limit: 30, window: "5 m" },
  splitPay: { limit: 20, window: "10 m" },
} satisfies Record<string, Rule>;

export type RuleName = keyof typeof RULES;

export interface LimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

const limiters = new Map<RuleName, Ratelimit>();
let warned = false;

function upstash(rule: RuleName): Ratelimit | null {
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token, NODE_ENV } = env();
  if (!url || !token) {
    if (NODE_ENV === "production") throw new Error("Upstash Redis is required for rate limiting in production");
    return null;
  }
  let l = limiters.get(rule);
  if (!l) {
    const { limit, window } = RULES[rule];
    l = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `rl:${rule}`,
      analytics: false,
    });
    limiters.set(rule, l);
  }
  return l;
}

// Development fallback: single-process fixed window. Not shared across instances.
const memory = new Map<string, { count: number; reset: number }>();
const UNIT_MS = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

function windowMs(window: Duration): number {
  const [n, unit] = window.split(" ") as [string, keyof typeof UNIT_MS];
  return Number(n) * UNIT_MS[unit];
}

function memoryLimit(rule: RuleName, key: string): LimitResult {
  if (!warned) {
    console.warn("[rate-limit] Upstash not configured — using in-memory limiter (dev only)");
    warned = true;
  }
  const { limit, window } = RULES[rule];
  const now = Date.now();
  const k = `${rule}:${key}`;
  const entry = memory.get(k);
  if (!entry || entry.reset < now) {
    memory.set(k, { count: 1, reset: now + windowMs(window) });
    return { success: true, remaining: limit - 1, reset: now + windowMs(window) };
  }
  entry.count += 1;
  return { success: entry.count <= limit, remaining: Math.max(0, limit - entry.count), reset: entry.reset };
}

export async function rateLimit(rule: RuleName, key: string): Promise<LimitResult> {
  const l = upstash(rule);
  if (!l) return memoryLimit(rule, key);
  const { success, remaining, reset } = await l.limit(key);
  return { success, remaining, reset };
}

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many requests");
  }
}

/** Throws RateLimitError on the first failing rule. */
export async function enforce(...checks: [RuleName, string][]): Promise<void> {
  for (const [rule, key] of checks) {
    const r = await rateLimit(rule, key);
    if (!r.success) throw new RateLimitError(Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)));
  }
}
