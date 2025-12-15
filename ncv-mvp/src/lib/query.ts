export function parseKeysParam(param: string | null): string[] {
  if (!param) return [];
  return param
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

export function buildQueryParams(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      search.set(key, value);
    }
  });
  return search.toString();
}
