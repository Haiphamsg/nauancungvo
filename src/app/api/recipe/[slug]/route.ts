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
    // OLD: id (uuid), category, cook_time_minutes, difficulty, image_url, short_note
    // NEW: recipe_id (bigint), hero_image, description - bỏ các fields không còn dùng
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .select(
        `
          recipe_id,
          name,
          slug,
          tag,
          hero_image,
          description,
          is_active
        `,
        // OLD columns removed: id, category, cook_time_minutes, difficulty, image_url, short_note
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

    // 2) Ingredients
    // OLD: recipe_id (uuid), ingredient_id FK trực tiếp, role, amount, unit, note
    // NEW: recipe_id (bigint), join qua ingredient_aliases -> ingredients
    //      Bỏ: role, amount, unit, note
    //      Thêm: ingredient_index, ingredient_text
    const { data: ingredients, error: ingredientsError } = await supabase
      .from("recipe_ingredients")
      .select(
        `
          ingredient_index,
          ingredient_text,
          ingredient_aliases!ingredient_alias_id(
            ingredient_id,
            alias,
            ingredients!fk_ingredient(
              key,
              display_name,
              is_core_default
            )
          )
        `,
        // OLD columns removed: role, amount, unit, note, ingredients:ingredients(...)
      )
      .eq("recipe_id", recipe.recipe_id)  // OLD: recipe.id
      .order("ingredient_index", { ascending: true });

    if (ingredientsError) {
      console.error("Supabase error fetching ingredients", ingredientsError);
      return NextResponse.json(
        { ok: false, error: ingredientsError.message },
        { status: 500 },
      );
    }

    // Transform ingredients response
    // OLD: direct join to ingredients table
    // NEW: join via ingredient_aliases -> ingredients (có thể null nếu chưa match)
    const ingredientItems =
      (ingredients as any[] | null)?.map((item) => {
        // Navigate: recipe_ingredients -> ingredient_aliases -> ingredients
        const alias = item.ingredient_aliases;
        const ing = alias?.ingredients;

        return {
          ingredient_index: item.ingredient_index,
          ingredient_text: item.ingredient_text ?? "",
          // Từ ingredients table (có thể null nếu ingredient_alias_id = null hoặc chưa match)
          key: ing?.key ?? null,
          display_name: ing?.display_name ?? item.ingredient_text ?? null,  // fallback to raw text
          is_core_default: Boolean(ing?.is_core_default),
          // OLD fields removed: role, amount, unit, note
        };
      }) ?? [];

    // 3) Steps
    // OLD: step_no, content, tip
    // NEW: step_index, step_text, step_image (bỏ tip)
    const { data: steps, error: stepsError } = await supabase
      .from("recipe_steps")
      .select("step_index, step_text, step_image")  // OLD: step_no, content, tip
      .eq("recipe_id", recipe.recipe_id)  // OLD: recipe.id
      .order("step_index", { ascending: true });  // OLD: step_no

    if (stepsError) {
      console.error("Supabase error fetching steps", stepsError);
      return NextResponse.json(
        { ok: false, error: stepsError.message },
        { status: 500 },
      );
    }

    // Transform steps for response
    const stepItems = (steps ?? []).map((s: any) => ({
      step_index: s.step_index,     // OLD: step_no
      step_text: s.step_text ?? "", // OLD: content
      step_image: s.step_image ?? null,  // NEW field
      // OLD field removed: tip
    }));

    return NextResponse.json({
      ok: true,
      recipe: {
        // Map to consistent response format
        recipe_id: recipe.recipe_id,  // OLD: id
        name: recipe.name,
        slug: recipe.slug,
        tag: recipe.tag,
        hero_image: recipe.hero_image,  // OLD: image_url
        description: recipe.description, // OLD: short_note
        is_active: recipe.is_active,
        // OLD fields removed: category, cook_time_minutes, difficulty
      },
      ingredients: ingredientItems,
      steps: stepItems,
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
