import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServer } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params;
  const supabase = createSupabaseServer();

  try {
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .select(
        `
          id,
          name,
          slug,
          tag,
          category,
          cook_time_minutes,
          difficulty,
          image_url,
          short_note
        `,
      )
      .eq("slug", slug)
      .maybeSingle();

    if (recipeError) {
      console.error("Supabase error fetching recipe", recipeError);
      throw recipeError;
    }

    if (!recipe) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    const { data: ingredients, error: ingredientsError } = await supabase
      .from("recipe_ingredients")
      .select(
        `
          role,
          amount,
          unit,
          note,
          ingredients!inner(
            key,
            display_name,
            is_core_default
          )
        `,
      )
      .eq("recipe_id", recipe.id)
      .order("role", { ascending: true })
      .order("display_name", { foreignTable: "ingredients", ascending: true });

    if (ingredientsError) {
      console.error("Supabase error fetching ingredients", ingredientsError);
      throw ingredientsError;
    }

    const ingredientItems =
      ingredients?.map((item) => {
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

    const { data: steps, error: stepsError } = await supabase
      .from("recipe_steps")
      .select("step_no, content, tip")
      .eq("recipe_id", recipe.id)
      .order("step_no", { ascending: true });

    if (stepsError) {
      console.error("Supabase error fetching steps", stepsError);
      throw stepsError;
    }

    return NextResponse.json({
      recipe,
      ingredients: ingredientItems,
      steps: steps ?? [],
    });
  } catch (e: any) {
    return Response.json(
      {
        ok: false,
        name: e?.name ?? null,
        message: e?.message ?? String(e),
        cause: e?.cause
          ? {
              name: e.cause.name,
              code: e.cause.code,
              message: e.cause.message,
            }
          : null,
      },
      { status: 500 }
    );
  }
}
