/**
 * Environment validation với runtime checks
 * FIXED: Không throw error trên client-side, chỉ log warning
 */

import { logger } from "@/lib/logger";

function getEnvVar(key: string, required = true): string {
    const value = process.env[key];

    if (required && !value) {
        // Chỉ log warning thay vì throw error
        // Vì client-side có thể không có access đến env vars đúng cách
        if (typeof window !== "undefined") {
            // Client-side: log warning, không crash
            console.warn(`[ENV] Missing environment variable: ${key}`);
            return "";
        } else {
            // Server-side: có thể throw hoặc log
            logger.warn(`Missing environment variable: ${key}`);
            return "";
        }
    }
    return value ?? "";
}

// Public env vars (exposed to client)
// Được set lúc build time bởi Next.js
export const env = {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",

    // Node env
    NODE_ENV: process.env.NODE_ENV ?? "development",
    isDev: process.env.NODE_ENV === "development",
    isProd: process.env.NODE_ENV === "production",
} as const;

// Server-only env vars (không expose ra client)
export function getServerEnv() {
    // Đọc trực tiếp từ process.env tại runtime (không dùng const env vì nó được set lúc build time)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    return {
        SUPABASE_URL: supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    };
}

// Utility để check env vars có valid không
export function validateEnv(): boolean {
    const missing: string[] = [];

    if (!env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    if (missing.length > 0) {
        console.warn(`[ENV] Missing environment variables: ${missing.join(", ")}`);
        return false;
    }
    return true;
}
