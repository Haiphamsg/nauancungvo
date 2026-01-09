/**
 * Environment validation với runtime checks
 * Throw error sớm nếu thiếu env vars quan trọng
 */

function getEnvVar(key: string, required = true): string {
    const value = process.env[key];
    if (required && !value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value ?? "";
}

// Public env vars (exposed to client)
export const env = {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),

    // Node env
    NODE_ENV: process.env.NODE_ENV ?? "development",
    isDev: process.env.NODE_ENV === "development",
    isProd: process.env.NODE_ENV === "production",
} as const;

// Server-only env vars (không expose ra client)
export function getServerEnv() {
    return {
        SUPABASE_SERVICE_ROLE_KEY: getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
        SUPABASE_URL: getEnvVar("SUPABASE_URL", false) || env.NEXT_PUBLIC_SUPABASE_URL,
    };
}
