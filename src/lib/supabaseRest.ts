const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function headers() {
  return {
    apikey: ANON,
    Authorization: `Bearer ${ANON}`,
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

  const url = `${SUPABASE_URL}/rest/v1/${path}${qs.toString() ? `?${qs}` : ""}`;

  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export async function sbRpc<T>(fn: string, body: any) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fn}`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase RPC ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}
