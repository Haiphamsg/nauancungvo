const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate env vars at runtime
function getSupabaseUrl(): string {
  if (!SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }
  return SUPABASE_URL;
}

function getAnonKey(): string {
  if (!ANON) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
  }
  return ANON;
}

function headers() {
  const anonKey = getAnonKey();
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
  };
}

export async function sbSelect<T>(
  path: string,
  query: Record<string, string | number | boolean | undefined> = {},
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    qs.set(k, String(v));
  }

  const baseUrl = getSupabaseUrl();
  const url = `${baseUrl}/rest/v1/${path}${qs.toString() ? `?${qs}` : ""}`;

  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export async function sbRpc<T>(fn: string, body: any) {
  const baseUrl = getSupabaseUrl();
  const url = `${baseUrl}/rest/v1/rpc/${fn}`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase RPC ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}
