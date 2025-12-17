"use client";

import { useEffect, useMemo, useState } from "react";
import { sbSelect } from "@/lib/supabaseRest";

export type Ingredient = {
  key: string;
  display_name: string;
  group?: string | null;
  // thêm field khác nếu bạn có
};

type CacheShape = {
  version: number;
  savedAt: number; // epoch ms
  items: Ingredient[];
};

const CACHE_KEY = "ncv.ingredients.cache.v1";
const CACHE_VERSION = 1;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function readCache(): CacheShape | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (parsed.version !== CACHE_VERSION) return null;
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(items: Ingredient[]) {
  try {
    const payload: CacheShape = {
      version: CACHE_VERSION,
      savedAt: Date.now(),
      items,
    };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

async function fetchIngredientsFromSupabase(): Promise<Ingredient[]> {
  // NOTE: sửa select/order theo schema thật của bạn
  const rows = await sbSelect<Ingredient[]>("ingredients", {
    select: "key,display_name,group,is_core_default",
  });
  return rows ?? [];
}

export function useIngredients() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = Date.now();

  const cacheInfo = useMemo(() => {
    if (typeof window === "undefined") return { cached: false, stale: true };
    const c = readCache();
    if (!c) return { cached: false, stale: true };
    const age = now - c.savedAt;
    return { cached: true, stale: age > TTL_MS, cache: c };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let ignore = false;

    // 1) nếu có cache => show ngay (fast)
    if (cacheInfo.cached && cacheInfo.cache?.items?.length) {
      setItems(cacheInfo.cache.items);
      setLoading(false);
    }

    // 2) nếu stale hoặc không có cache => fetch & update
    if (!cacheInfo.cached || cacheInfo.stale) {
      setLoading(!cacheInfo.cached); // nếu chưa có cache thì mới show loading
      fetchIngredientsFromSupabase()
        .then((fresh) => {
          if (ignore) return;
          setItems(fresh);
          writeCache(fresh);
          setError(null);
        })
        .catch((e) => {
          if (ignore) return;
          setError(e instanceof Error ? e.message : "Không tải được nguyên liệu");
        })
        .finally(() => {
          if (ignore) return;
          setLoading(false);
        });
    }

    return () => {
      ignore = true;
    };
  }, [cacheInfo.cached, cacheInfo.stale]);

  return { items, loading, error, cached: cacheInfo.cached, stale: cacheInfo.stale };
}
