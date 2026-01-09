import { NextResponse, type NextRequest } from "next/server";
import { isRateLimited, getClientIdentifier } from "@/lib/rateLimit";
import { env } from "@/lib/env";

/**
 * CORS Configuration
 * Chỉ cho phép domain của bạn gọi API
 */
const ALLOWED_ORIGINS = [
    // Production domain (thay bằng domain thật của bạn)
    "https://anngoncungvo.com",
    "https://www.anngoncungvo.com",
    // Development
    "http://localhost:3000",
    "http://127.0.0.1:3000",
];

// Cho phép tất cả origins trong development
const ALLOW_ALL_ORIGINS = env.isDev;

function isOriginAllowed(origin: string | null): boolean {
    if (!origin) return true; // Same-origin requests
    if (ALLOW_ALL_ORIGINS) return true;
    return ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(origin: string | null): HeadersInit {
    const allowedOrigin = isOriginAllowed(origin) && origin ? origin : ALLOWED_ORIGINS[0];

    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400", // 24 hours
    };
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const origin = request.headers.get("origin");

    // Only apply to API routes
    if (!pathname.startsWith("/api/")) {
        return NextResponse.next();
    }

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
        return new NextResponse(null, {
            status: 204,
            headers: getCorsHeaders(origin),
        });
    }

    // Check CORS
    if (!isOriginAllowed(origin)) {
        return new NextResponse(
            JSON.stringify({ error: "Origin not allowed" }),
            {
                status: 403,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    // Rate Limiting
    const clientId = getClientIdentifier(request);
    const { limited, remaining, resetIn } = isRateLimited(clientId);

    if (limited) {
        return new NextResponse(
            JSON.stringify({
                error: "Too many requests. Please try again later.",
                retryAfter: Math.ceil(resetIn / 1000),
            }),
            {
                status: 429,
                headers: {
                    "Content-Type": "application/json",
                    "Retry-After": String(Math.ceil(resetIn / 1000)),
                    "X-RateLimit-Remaining": "0",
                    ...getCorsHeaders(origin),
                },
            }
        );
    }

    // Add CORS and rate limit headers to response
    const response = NextResponse.next();

    Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetIn / 1000)));

    return response;
}

export const config = {
    matcher: ["/api/:path*"],
};
