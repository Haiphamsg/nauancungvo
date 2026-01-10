import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import fetch from "node-fetch";

/**
 * Server‑only Supabase client (uses service‑role key).
 * Falls back to the public URL if the explicit SUPABASE_URL env var is missing –
 * this prevents a hard crash in production when only the public vars are set.
 */
export function createSupabaseServer() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  if (!SUPABASE_URL) {
    throw new Error("Missing SUPABASE_URL (environment variable)");
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (environment variable)");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      fetch: fetch as any,
    },
  });
}
