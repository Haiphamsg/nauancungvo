/**
 * API Error Handler Utility
 * Chuẩn hóa error response cho tất cả API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export type ApiErrorResponse = {
    ok: false;
    error: string;
    code?: string;
};

export type ApiSuccessResponse<T> = {
    ok?: true;
} & T;

/**
 * Wrap API handler với error handling chuẩn
 */
export function withErrorHandler<T>(
    handler: (request: NextRequest) => Promise<NextResponse<T>>
) {
    return async (request: NextRequest): Promise<NextResponse<T | ApiErrorResponse>> => {
        try {
            return await handler(request);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const code = (error as any)?.code;

            logger.error("API Error:", { message, code, error });

            return NextResponse.json(
                { ok: false, error: message, code } as ApiErrorResponse,
                { status: 500 }
            );
        }
    };
}

/**
 * Parse và validate request body
 */
export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
    try {
        return await request.json() as T;
    } catch {
        throw new Error("Invalid JSON body");
    }
}
