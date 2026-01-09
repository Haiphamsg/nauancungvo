/**
 * Supabase REST API utilities
 * Dùng cho client-side fetching (với ANON key)
 */

import { env, getServerEnv } from "./env";

/**
 * Headers for client‑side SELECT (public anon key)
 */
function clientHeaders() {
  return {
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

/**
 * Headers for server‑side RPC (service‑role key)
 */
function serverHeaders() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

/**
 * SELECT query via REST API (client‑side)
 */
export async function sbSelect<T>(
  path: string,
  query: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    qs.set(k, String(v));
  }

  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}${qs.toString() ? `?${qs}` : ""}`;

  const res = await fetch(url, { headers: clientHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/**
 * RPC call via REST API (server‑side, uses service‑role key)
 */
export async function sbRpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${fn}`;
  const res = await fetch(url, {
    method: "POST",
    headers: serverHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Supabase RPC ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}
