"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { sbSelect } from "@/lib/supabaseRest";
import Image from "next/image";
import { getRecipeImageSrc } from "@/lib/images";

// OLD: id (uuid), category, cook_time_minutes, difficulty, image_url, short_note
// NEW: recipe_id (bigint), hero_image, description
type RecipeRow = {
  recipe_id: number;  // OLD: id: string (uuid)
  name: string;
  slug: string;
  tag: string | null;
  hero_image: string | null;  // OLD: image_url
  description: string | null; // OLD: short_note
  is_active: boolean | null;
  // REMOVED: category, cook_time_minutes, difficulty
};

// OLD: role, amount, unit, note, ingredients(key, display_name, is_core_default)
// NEW: ingredient_index, ingredient_text, join via ingredient_aliases
type IngredientItem = {
  ingredient_index: number;
  ingredient_text: string;
  key: string | null;
  display_name: string | null;
  is_core_default: boolean;
  // REMOVED: role, amount, unit, note
};

// Response from ingredient_aliases -> ingredients join
type RecipeIngredientJoinRow = {
  ingredient_index: number;
  ingredient_text: string;
  ingredient_aliases: {
    ingredient_id: string;
    alias: string;
    ingredients: {
      key: string;
      display_name: string;
      is_core_default: boolean | null;
    } | null;
  } | null;
};

// OLD: step_no, content, tip
// NEW: step_index, step_text, step_image
type StepItem = {
  step_index: number;   // OLD: step_no
  step_text: string;    // OLD: content
  step_image: string | null;  // NEW
  // REMOVED: tip
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

  // Collapse states for sections
  const [isIngredientsCollapsed, setIsIngredientsCollapsed] = useState(false);

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
        // OLD: id,name,slug,tag,category,cook_time_minutes,difficulty,image_url,short_note
        // NEW: recipe_id,name,slug,tag,hero_image,description,is_active
        const recipeRows = await sbSelect<RecipeRow[]>("recipes", {
          select: "recipe_id,name,slug,tag,hero_image,description,is_active",
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

        // OLD: getRecipeImageSrc(recipe.slug, recipe.category)
        // NEW: no category, use slug only
        const { bySlug } = getRecipeImageSrc(recipe.slug, null);
        setHeroSrc(recipe.hero_image?.trim() || bySlug);

        // 2) ingredients with join via ingredient_aliases
        // OLD: role,amount,unit,note,ingredients(key,display_name,is_core_default)
        // NEW: ingredient_index,ingredient_text,ingredient_aliases(ingredient_id,alias,ingredients(key,display_name,is_core_default))
        const riRows = await sbSelect<RecipeIngredientJoinRow[]>("recipe_ingredients", {
          select: "ingredient_index,ingredient_text,ingredient_aliases(ingredient_id,alias,ingredients(key,display_name,is_core_default))",
          recipe_id: `eq.${recipe.recipe_id}`,  // OLD: recipe.id
          order: "ingredient_index.asc",
        });

        // 3) steps
        // OLD: step_no,content,tip
        // NEW: step_index,step_text,step_image
        const stepRows = await sbSelect<StepItem[]>("recipe_steps", {
          select: "step_index,step_text,step_image",
          recipe_id: `eq.${recipe.recipe_id}`,  // OLD: recipe.id
          order: "step_index.asc",
        });

        if (controller.signal.aborted) return;

        // Transform ingredients
        const ingredientItems: IngredientItem[] =
          riRows?.map((item) => {
            const alias = item.ingredient_aliases;
            const ing = alias?.ingredients;

            return {
              ingredient_index: item.ingredient_index,
              ingredient_text: item.ingredient_text ?? "",
              key: ing?.key ?? null,
              display_name: ing?.display_name ?? item.ingredient_text ?? null,
              is_core_default: Boolean(ing?.is_core_default),
            };
          }) ?? [];

        const json: RecipeResponse = {
          recipe,
          ingredients: ingredientItems,
          steps: stepRows ?? [],
        };

        setData(json);
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
      // Sort by index since we don't have role anymore
      return a.ingredient_index - b.ingredient_index;
    });
  }, [data]);

  // ✅ Summary dựa theo ownedKeysSet (đang có/thiếu)
  const ingredientStats = useMemo(() => {
    const list = sortedIngredients ?? [];

    const have = list.filter((i) => i.key && ownedKeysSet.has(i.key)).length;
    const miss = list.filter((i) => i.key && !ownedKeysSet.has(i.key)).length;

    // OLD: had core/optional role
    // NEW: no role, use is_core_default to identify "required" ingredients
    const requiredList = list.filter((i) => !i.is_core_default);
    const requiredHave = requiredList.filter((i) => i.key && ownedKeysSet.has(i.key)).length;
    const requiredMiss = requiredList.filter((i) => i.key && !ownedKeysSet.has(i.key)).length;

    return { have, miss, requiredHave, requiredMiss };
  }, [sortedIngredients, ownedKeysSet]);

  // Check if this is a "snack" dish (all ingredients are is_core_default = true)
  const isSnack = useMemo(() => {
    if (!data || data.ingredients.length === 0) return false;
    return data.ingredients.every((i) => i.is_core_default);
  }, [data]);

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
      return `- ${item.display_name ?? item.ingredient_text ?? "Nguyên liệu"}`;
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

  // OLD: getRecipeImageSrc(data.recipe.slug, data.recipe.category)
  // NEW: no category
  const defaultHero = getRecipeImageSrc(data.recipe.slug, null);
  const finalHeroSrc =
    heroSrc ?? data.recipe.hero_image?.trim() ?? defaultHero.bySlug;
  const isRemoteHero = /^https?:\/\//i.test(finalHeroSrc);

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
              {isRemoteHero ? (
                // Dùng <img> để chấp nhận mọi domain (Next/Image cần allowlist domains).
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={finalHeroSrc}
                  alt={data.recipe.name}
                  className="h-full w-full object-cover"
                  loading="eager"
                  onError={() => setHeroSrc(defaultHero.bySlug)}
                />
              ) : (
                <Image
                  src={finalHeroSrc}
                  alt={data.recipe.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                  onError={() => setHeroSrc(defaultHero.fallback)}
                />
              )}
            </div>
          </div>
        ) : null}


        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{data.recipe.name}</h1>
            {isSnack && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                🍿 Món ăn vặt
              </span>
            )}
          </div>
          {/* OLD: displayed cook_time_minutes, difficulty */}
          {/* NEW: no longer available in schema */}
          {data.recipe.description ? (
            <p className="text-sm text-slate-700">{data.recipe.description}</p>
          ) : null}
        </header>

        <section className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setIsIngredientsCollapsed(!isIngredientsCollapsed)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-lg font-semibold text-slate-900">Nguyên liệu</h2>
            <svg
              className={`h-5 w-5 text-slate-500 transition-transform ${isIngredientsCollapsed ? '' : 'rotate-180'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {!isIngredientsCollapsed && (
            <>
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
                  (Cần mua:{" "}
                  <span className="font-semibold text-amber-700">
                    {ingredientStats.requiredMiss}
                  </span>
                  )
                </span>
              </div>

              <ul className="flex flex-col gap-3">
                {(sortedIngredients ?? []).map((item, index) => {
                  const hasIt = item.key ? ownedKeysSet.has(item.key) : false;

                  return (
                    <li
                      key={item.key ?? `${item.ingredient_text}-${index}`}
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
                          htmlFor={`ingredient-checkbox-${item.key ?? item.ingredient_text}`}
                        >
                          {item.display_name ?? item.ingredient_text ?? "Nguyên liệu"}
                        </label>

                        <input
                          id={`ingredient-checkbox-${item.key ?? item.ingredient_text}`}
                          type="checkbox"
                          disabled={!item.key}
                          checked={item.key ? checked.has(item.key) : false}
                          onChange={() => toggleChecked(item.key)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
                          title={item.display_name ?? item.ingredient_text ?? "Nguyên liệu"}
                        />

                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {item.ingredient_text ?? item.display_name ?? "Nguyên liệu"}
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


                          </div>

                          {/* Show raw ingredient text if display_name differs */}
                          {item.display_name && item.ingredient_text &&
                            item.display_name !== item.ingredient_text && (
                              <span className="text-xs text-slate-500">
                                ({item.ingredient_text})
                              </span>
                            )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Các bước</h2>
          <ol className="flex flex-col gap-3">
            {(data.steps ?? []).map((step) => (
              <li
                key={step.step_index}
                className="rounded-md border border-slate-200 p-3"
              >
                <div className="mb-1 text-sm font-semibold text-slate-900">
                  Bước {step.step_index + 1}
                </div>
                <p className="text-sm text-slate-700">{step.step_text}</p>
                {/* OLD: had tip field */}
                {/* NEW: has step_image instead */}
                {step.step_image && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={step.step_image}
                      alt={`Bước ${step.step_index + 1}`}
                      className="rounded-md max-h-48 object-cover"
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
