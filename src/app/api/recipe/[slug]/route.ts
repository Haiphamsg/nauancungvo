import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params;

  try {
    const supabase = createSupabaseServer();

    // 1) Recipe
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
      return NextResponse.json(
        { ok: false, error: recipeError.message },
        { status: 500 },
      );
    }

    if (!recipe) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    // 2) Ingredients + join ingredients table
    const { data: ingredients, error: ingredientsError } = await supabase
      .from("recipe_ingredients")
      .select(
        `
          role,
          amount,
          unit,
          note,
          ingredients:ingredients(
            key,
            display_name
          )
        `,
      )
      .eq("recipe_id", recipe.id)
      .order("role", { ascending: true })
      .order("display_name", { foreignTable: "ingredients", ascending: true });

    if (ingredientsError) {
      console.error("Supabase error fetching ingredients", ingredientsError);
      return NextResponse.json(
        { ok: false, error: ingredientsError.message },
        { status: 500 },
      );
    }

    const ingredientItems =
      (ingredients as any[] | null)?.map((item) => {
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

    // 3) Steps
    const { data: steps, error: stepsError } = await supabase
      .from("recipe_steps")
      .select("step_no, content, tip")
      .eq("recipe_id", recipe.id)
      .order("step_no", { ascending: true });

    if (stepsError) {
      console.error("Supabase error fetching steps", stepsError);
      return NextResponse.json(
        { ok: false, error: stepsError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      recipe,
      ingredients: ingredientItems,
      steps: steps ?? [],
    });
  } catch (e: any) {
    console.error("API /api/recipe/[slug] unexpected error", e);

    return NextResponse.json(
      {
        ok: false,
        name: e?.name ?? null,
        message: e?.message ?? String(e),
      },
      { status: 500 },
    );
  }
}
