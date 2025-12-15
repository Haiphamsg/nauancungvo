"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type RecipeResponse = {
  recipe: {
    id: number;
    name: string;
    slug: string;
    tag: string | null;
    category: string | null;
    cook_time_minutes: number | null;
    difficulty: string | null;
    image_url: string | null;
    short_note: string | null;
  };
  ingredients: Array<{
    key: string | null;
    display_name: string | null;
    role: string | null;
    amount: number | null;
    unit: string | null;
    note: string | null;
  }>;
  steps: Array<{
    step_no: number;
    content: string;
    tip: string | null;
  }>;
};

export default function RecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<RecipeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [backHref, setBackHref] = useState("/recommendations");

  useEffect(() => {
    const params = new URLSearchParams();
    const keysParam = searchParams.get("keys");
    const tagParam = searchParams.get("tag");
    if (keysParam) params.set("keys", keysParam);
    if (tagParam) params.set("tag", tagParam);
    if (!keysParam && !tagParam) {
      const saved =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("lastRecipeQuery")
          : null;
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { keys?: string; tag?: string };
          if (parsed.keys) params.set("keys", parsed.keys);
          if (parsed.tag) params.set("tag", parsed.tag);
        } catch {
          // ignore
        }
      }
    }
    const qs = params.toString();
    setBackHref(`/recommendations${qs ? `?${qs}` : ""}`);
  }, [searchParams]);

  useEffect(() => {
    if (!slug) return;
    let ignore = false;
    const fetchRecipe = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/recipe/${slug}`);
        if (!res.ok) {
          throw new Error("Không tải được công thức");
        }
        const json = (await res.json()) as RecipeResponse;
        if (ignore) return;
        setData(json);
        const initialChecked = new Set(
          json.ingredients
            .map((ing) => ing.key)
            .filter((key): key is string => Boolean(key)),
        );
        setChecked(initialChecked);
      } catch (err) {
        if (ignore) return;
        const message =
          err instanceof Error ? err.message : "Không tải được công thức";
        setError(message);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    fetchRecipe();
    return () => {
      ignore = true;
    };
  }, [slug]);

  const sortedIngredients = useMemo(() => {
    if (!data) return [];
    const copy = [...data.ingredients];
    return copy.sort((a, b) => {
      const rank = (role: string | null) => (role === "core" ? 0 : 1);
      const diff = rank(a.role) - rank(b.role);
      if (diff !== 0) return diff;
      return (a.display_name ?? "").localeCompare(b.display_name ?? "");
    });
  }, [data]);

  const toggleChecked = (key?: string | null) => {
    if (!key) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCopy = async () => {
    if (!data) return;
    const lines = data.ingredients.map((item) => {
      const amount = item.amount ? `${item.amount}${item.unit ? ` ${item.unit}` : ""}` : "";
      const note = item.note ? ` (${item.note})` : "";
      return `- ${item.display_name ?? "Nguyên liệu"}${amount ? `: ${amount}` : ""}${note}`;
    });
    const text = [`${data.recipe.name} - danh sách nguyên liệu`, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      // optionally we could show toast; keep silent for minimal change
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-slate-600">
        Đang tải công thức...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          ← Quay lại gợi ý
        </button>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900">
            {data.recipe.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            {data.recipe.cook_time_minutes ? (
              <span>Thời gian: {data.recipe.cook_time_minutes} phút</span>
            ) : null}
            {data.recipe.difficulty ? (
              <span>Độ khó: {data.recipe.difficulty}</span>
            ) : null}
          </div>
          {data.recipe.short_note ? (
            <p className="text-sm text-slate-700">{data.recipe.short_note}</p>
          ) : null}
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Nguyên liệu</h2>
          <div>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-400"
            >
              Copy danh sách mua sắm
            </button>
          </div>
          <ul className="flex flex-col gap-3">
            {sortedIngredients.map((item) => (
              <li
                key={item.key ?? `${item.display_name}-${item.role}`}
                className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.key ? checked.has(item.key) : false}
                    onChange={() => toggleChecked(item.key)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">
                      {item.display_name ?? "Nguyên liệu"}
                    </span>
                    <span className="text-xs text-slate-600">
                      {item.role === "core" ? "Core" : "Tùy chọn"}
                    </span>
                    {item.amount ? (
                      <span className="text-sm text-slate-700">
                        {item.amount}
                        {item.unit ? ` ${item.unit}` : ""}
                        {item.note ? ` (${item.note})` : ""}
                      </span>
                    ) : item.note ? (
                      <span className="text-sm text-slate-700">
                        {item.note}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Các bước</h2>
          <ol className="flex flex-col gap-3">
            {data.steps.map((step) => (
              <li
                key={step.step_no}
                className="rounded-md border border-slate-200 p-3"
              >
                <div className="mb-1 text-sm font-semibold text-slate-900">
                  Bước {step.step_no}
                </div>
                <p className="text-sm text-slate-700">{step.content}</p>
                {step.tip ? (
                  <p className="mt-1 text-xs text-slate-500">Mẹo: {step.tip}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
