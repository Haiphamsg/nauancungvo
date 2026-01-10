"use client";

import { RecipeCardsSkeleton } from "@/components/Skeletons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { RecipeCard } from "@/components/RecipeCard";
import { parseKeysParam, buildQueryParams } from "@/lib/query";
import { toUiError } from "@/lib/errors";
import { ErrorBox } from "@/components/ErrorBox";

// OLD: image_url, cook_time_minutes, category
// NEW: hero_image, description - từ function recommend_recipes mới
type RecommendationItem = {
  recipe_id: number;  // NEW: bigint
  name: string;
  slug: string;
  tag?: "weekday" | "weekend" | string | null;
  hero_image?: string | null;  // OLD: image_url
  description?: string | null; // NEW
  core_missing?: number | null;
  missing_core_names?: string[] | null;
  // REMOVED: category, cook_time_minutes
};

const tagLabels: Record<string, string> = {
  weekday: "Trong tuần",
  weekend: "Cuối tuần",
};

export default function RecommendationsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // tránh gọi lại khi signature y hệt
  const lastSignature = useRef<string | null>(null);

  const keys = useMemo(
    () => parseKeysParam(searchParams.get("keys")),
    [searchParams],
  );
  const tag = searchParams.get("tag") === "weekend" ? "weekend" : "weekday";

  useEffect(() => {
    if (!keys.length) {
      lastSignature.current = null;
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    const signature = `${keys.join(",")}::${tag}`;
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;

    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Route through API instead of direct Supabase call
        // This ensures env vars are read at runtime on the server
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selected_keys: keys,
            prefer_tag: tag,
            limit_n: 30,
            missing_core_allow: 2,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const data = await response.json();
        if (controller.signal.aborted) return;

        setItems(data.items ?? []);
      } catch (err) {
        lastSignature.current = null;
        if (controller.signal.aborted) return;

        const message =
          err instanceof Error ? err.message : "Không tải được gợi ý món ăn";
        setError(message);
        setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [keys, tag]);

  const handleTagChange = (nextTag: "weekday" | "weekend") => {
    const params = buildQueryParams({
      keys: keys.join(","),
      tag: nextTag,
    });
    router.replace(`/recommendations?${params}`);
  };

  const handleCardClick = (slug: string) => {
    const qs = buildQueryParams({
      keys: keys.join(","),
      tag,
    });

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "lastRecipeQuery",
        JSON.stringify({ keys: keys.join(","), tag }),
      );
    }

    router.push(`/recipe/${slug}?${qs}`);
  };

  const emptyState = !keys.length ? (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-slate-200 p-6 text-center">
      <p className="text-sm text-slate-600">
        Bạn chưa chọn nguyên liệu nào. Thử thêm 1–2 nguyên liệu.
      </p>
      <button
        type="button"
        onClick={() => router.push("/")}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Quay lại chọn nguyên liệu
      </button>
    </div>
  ) : null;

  // ✅ “Mở là biết nấu gì”
  const cookNow = useMemo(
    () => items.filter((i) => i.core_missing === 0),
    [items],
  );
  const cookLater = useMemo(
    () => items.filter((i) => typeof i.core_missing === "number" && i.core_missing > 0),
    [items],
  );

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-emerald-700">Gợi ý món ăn</p>
          <h1 className="text-2xl font-bold text-slate-900">
            Món phù hợp với nguyên liệu bạn có
          </h1>
          <p className="text-sm text-slate-600">
            Điều chỉnh nhãn thời gian để đổi gợi ý.
          </p>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Đang dùng {keys.length} nguyên liệu</span>
            <button
              type="button"
              onClick={() =>
                router.push(`/?${buildQueryParams({ keys: keys.join(","), tag })}`)
              }
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-emerald-400"
            >
              Chỉnh nguyên liệu
            </button>
          </div>
        </header>

        <div className="flex gap-2">
          {(["weekday", "weekend"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTagChange(value)}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${tag === value
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
            >
              {tagLabels[value]}
            </button>
          ))}
        </div>

        {loading ? (
          <RecipeCardsSkeleton count={6} />
        ) : error ? (
          <ErrorBox err={toUiError(new Error(error))} />
        ) : emptyState ? (
          emptyState
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-600">
              Không tìm thấy món phù hợp. Thử thêm 1–2 nguyên liệu.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Quay lại chọn nguyên liệu
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* 🍳 Nấu ngay */}
            {cookNow.length > 0 ? (
              <section className="flex flex-col gap-3">
                <div className="flex items-end justify-between">
                  <h2 className="text-base font-semibold text-emerald-700">
                    🍳 Nấu ngay
                  </h2>
                  <span className="text-xs text-slate-500">
                    {cookNow.length} món
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {cookNow.map((item) => (
                    <RecipeCard
                      key={item.slug}
                      name={item.name}
                      slug={item.slug}
                      imageUrl={item.hero_image}  // OLD: image_url
                      core_missing={item.core_missing}
                      missing_core_names={item.missing_core_names}
                      onClick={() => handleCardClick(item.slug)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {/* 🛒 Có thể nấu */}
            {cookLater.length > 0 ? (
              <section className="flex flex-col gap-3">
                <div className="flex items-end justify-between">
                  <h2 className="text-base font-semibold text-slate-800">
                    🛒 Có thể nấu (thiếu ít)
                  </h2>
                  <span className="text-xs text-slate-500">
                    {cookLater.length} món
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {cookLater.map((item) => (
                    <RecipeCard
                      key={item.slug}
                      name={item.name}
                      slug={item.slug}
                      imageUrl={item.hero_image}  // OLD: image_url
                      core_missing={item.core_missing}
                      missing_core_names={item.missing_core_names}
                      onClick={() => handleCardClick(item.slug)}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
