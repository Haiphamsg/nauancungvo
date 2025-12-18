"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { sbSelect } from "@/lib/supabaseRest";
import Image from "next/image";
import { getRecipeImageSrc } from "@/lib/images";

type RecipeRow = {
  id: string; // uuid
  name: string;
  slug: string;
  tag: string | null;
  category: string | null;
  cook_time_minutes: number | null;
  difficulty: string | null;
  image_url: string | null;
  short_note: string | null;
};

type IngredientItem = {
  key: string | null;
  display_name: string | null;
  role: string | null;
  amount: number | null;
  unit: string | null;
  note: string | null;
};

type StepItem = {
  step_no: number;
  content: string;
  tip: string | null;
};

type RecipeResponse = {
  recipe: RecipeRow;
  ingredients: IngredientItem[];
  steps: StepItem[];
};

export default function RecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<RecipeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heroSrc, setHeroSrc] = useState<string | null>(null);

  // ✅ ownedKeysSet: nguyên liệu user đang có (từ URL / sessionStorage)
  const [ownedKeysSet, setOwnedKeysSet] = useState<Set<string>>(new Set());

  // ✅ checked: checklist user tick (độc lập với ownedKeysSet)
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const [backHref, setBackHref] = useState("/recommendations");

  // const checklistInitialized = useRef(false);

  // Build back link + parse keys user đang có
  useEffect(() => {
    const params = new URLSearchParams();
    let keysParam = searchParams.get("keys");
    const tagParam = searchParams.get("tag");

    if (keysParam) params.set("keys", keysParam);
    if (tagParam) params.set("tag", tagParam);

    // Nếu không có keys/tag trên URL, fallback sessionStorage
    if (!keysParam && !tagParam) {
      const saved =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("lastRecipeQuery")
          : null;
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { keys?: string; tag?: string };
          if (parsed.keys) {
            keysParam = parsed.keys;
            params.set("keys", parsed.keys);
          }
          if (parsed.tag) params.set("tag", parsed.tag);
        } catch {
          // ignore
        }
      }
    }

    // set back link
    const qs = params.toString();
    setBackHref(`/recommendations${qs ? `?${qs}` : ""}`);

    // set owned keys
    const owned =
      keysParam
        ?.split(",")
        .map((k) => k.trim())
        .filter(Boolean) ?? [];
    setOwnedKeysSet(new Set(owned));
  }, [searchParams]);

  // Fetch recipe + ingredients + steps
  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();

    const fetchRecipe = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) recipe by slug
        const recipeRows = await sbSelect<RecipeRow[]>("recipes", {
          select:
            "id,name,slug,tag,category,cook_time_minutes,difficulty,image_url,short_note",
          slug: `eq.${slug}`,
          limit: 1,
        });

        if (controller.signal.aborted) return;

        const recipe = recipeRows?.[0];
        if (!recipe) {
          setError("Không tìm thấy công thức");
          setData(null);
          return;
        }
        const { bySlug, fallback } = getRecipeImageSrc(recipe.slug, recipe.category);
        setHeroSrc(bySlug);

        // 2) ingredients with join
        const riRows = await sbSelect<any[]>("recipe_ingredients", {
          select: "role,amount,unit,note,ingredients(key,display_name)",
          recipe_id: `eq.${recipe.id}`,
          order: "role.asc",
        });

        // 3) steps
        const stepRows = await sbSelect<StepItem[]>("recipe_steps", {
          select: "step_no,content,tip",
          recipe_id: `eq.${recipe.id}`,
          order: "step_no.asc",
        });

        if (controller.signal.aborted) return;

        const ingredientItems: IngredientItem[] =
          riRows?.map((item) => {
            const ing = Array.isArray(item.ingredients)
              ? item.ingredients[0]
              : item.ingredients;

            return {
              key: ing?.key ?? null,
              display_name: ing?.display_name ?? null,
              role: item.role ?? null,
              amount: item.amount ?? null,
              unit: item.unit ?? null,
              note: item.note ?? null,
            };
          }) ?? [];

        const json: RecipeResponse = {
          recipe,
          ingredients: ingredientItems,
          steps: stepRows ?? [],
        };

        setData(json);

        // ✅ Init checklist 1 lần:
        // auto-check những ingredient mà user "đang có" (ownedKeysSet)
        // để checklist hợp lý ngay từ đầu, nhưng không override sau khi user tick.
/*         if (!checklistInitialized.current) {
          const initial = new Set<string>();
          for (const ing of ingredientItems) {
            if (ing.key && ownedKeysSet.has(ing.key)) initial.add(ing.key);
          }
          setChecked(initial);
          checklistInitialized.current = true;
        } */
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "Không tải được công thức";
        setError(message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchRecipe();

    return () => {
      controller.abort();
    };
  }, [slug, ownedKeysSet]);

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

  // ✅ Summary dựa theo ownedKeysSet (đang có/thiếu)
  const ingredientStats = useMemo(() => {
    const list = sortedIngredients ?? [];

    const have = list.filter((i) => i.key && ownedKeysSet.has(i.key)).length;
    const miss = list.filter((i) => i.key && !ownedKeysSet.has(i.key)).length;

    const coreList = list.filter((i) => i.role === "core");
    const coreHave = coreList.filter((i) => i.key && ownedKeysSet.has(i.key)).length;
    const coreMiss = coreList.filter((i) => i.key && !ownedKeysSet.has(i.key)).length;

    return { have, miss, coreHave, coreMiss };
  }, [sortedIngredients, ownedKeysSet]);

  // ✅ checkbox = checklist (không liên quan ownedKeysSet)
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
      const amount = item.amount
        ? `${item.amount}${item.unit ? ` ${item.unit}` : ""}`
        : "";
      const note = item.note ? ` (${item.note})` : "";
      return `- ${item.display_name ?? "Nguyên liệu"}${
        amount ? `: ${amount}` : ""
      }${note}`;
    });
    const text = [`${data.recipe.name} - danh sách nguyên liệu`, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(text);
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

  if (!data) return null;

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

        {data?.recipe ? (
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <div className="relative aspect-[16/9] w-full">
              <Image
                src={heroSrc ?? getRecipeImageSrc(data.recipe.slug, data.recipe.category).bySlug}
                alt={data.recipe.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                onError={() => {
                  const { fallback } = getRecipeImageSrc(data.recipe.slug, data.recipe.category);
                  setHeroSrc(fallback);
                }}
              />
            </div>
          </div>
        ) : null}


        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900">{data.recipe.name}</h1>
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

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-400"
            >
              Copy danh sách mua sắm
            </button>

            <span className="text-xs text-slate-500">
              Checkbox = checklist (bạn tự tick)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">
              Bạn đang có{" "}
              <span className="font-semibold text-emerald-700">
                {ingredientStats.have}
              </span>{" "}
              nguyên liệu, còn thiếu{" "}
              <span className="font-semibold text-amber-700">
                {ingredientStats.miss}
              </span>
              .
            </span>

            <span className="text-slate-500">
              (Core: có{" "}
              <span className="font-semibold text-emerald-700">
                {ingredientStats.coreHave}
              </span>
              , thiếu{" "}
              <span className="font-semibold text-amber-700">
                {ingredientStats.coreMiss}
              </span>
              )
            </span>
          </div>

          <ul className="flex flex-col gap-3">
            {(sortedIngredients ?? []).map((item) => {
              const hasIt = item.key ? ownedKeysSet.has(item.key) : false;

              return (
                <li
                  key={item.key ?? `${item.display_name}-${item.role}`}
                  className={[
                    "flex items-start justify-between gap-3 rounded-md border p-3",
                    hasIt
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-amber-200 bg-amber-50",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <label
                      className="sr-only"
                      htmlFor={`ingredient-checkbox-${item.key ?? item.display_name}`}
                    >
                      {item.display_name ?? "Nguyên liệu"}
                    </label>

                    <input
                      id={`ingredient-checkbox-${item.key ?? item.display_name}`}
                      type="checkbox"
                      disabled={!item.key}
                      checked={item.key ? checked.has(item.key) : false}
                      onChange={() => toggleChecked(item.key)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
                      title={item.display_name ?? "Nguyên liệu"}
                    />

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {item.display_name ?? "Nguyên liệu"}
                        </span>

                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            hasIt
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800",
                          ].join(" ")}
                        >
                          {hasIt ? "Đang có" : "Còn thiếu"}
                        </span>

                        <span className="text-xs text-slate-600">
                          {item.role === "core" ? "Core" : "Tùy chọn"}
                        </span>
                      </div>

                      {item.amount ? (
                        <span className="text-sm text-slate-700">
                          {item.amount}
                          {item.unit ? ` ${item.unit}` : ""}
                          {item.note ? ` (${item.note})` : ""}
                        </span>
                      ) : item.note ? (
                        <span className="text-sm text-slate-700">{item.note}</span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Các bước</h2>
          <ol className="flex flex-col gap-3">
            {(data.steps ?? []).map((step) => (
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