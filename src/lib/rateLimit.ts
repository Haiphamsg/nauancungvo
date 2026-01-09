/**
 * Rate Limiter utility
 * Simple in-memory rate limiter (reset mỗi khi server restart)
 * Cho production nên dùng Redis hoặc external store
 */

type RateLimitEntry = {
    count: number;
    resetAt: number;
};

// In-memory store (sẽ reset khi server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default config
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute

/**
 * Check if request should be rate limited
 * @returns true if rate limited (should block), false if ok
 */
export function isRateLimited(
    identifier: string,
    options?: { windowMs?: number; maxRequests?: number }
): { limited: boolean; remaining: number; resetIn: number } {
    const windowMs = options?.windowMs ?? WINDOW_MS;
    const maxRequests = options?.maxRequests ?? MAX_REQUESTS;
    const now = Date.now();

    let entry = rateLimitStore.get(identifier);

    // Reset nếu window đã hết
    if (!entry || entry.resetAt < now) {
        entry = { count: 0, resetAt: now + windowMs };
        rateLimitStore.set(identifier, entry);
    }

    entry.count++;

    const remaining = Math.max(0, maxRequests - entry.count);
    const resetIn = Math.max(0, entry.resetAt - now);
    const limited = entry.count > maxRequests;

    return { limited, remaining, resetIn };
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header or fallback to IP
 */
export function getClientIdentifier(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    // Fallback
    return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key);
        }
    }
}

// Auto cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
    setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
