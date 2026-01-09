export type IngredientGroup =
  | "protein"
  | "vegetable"
  | "carb"
  | "spice_core"
  | "spice_optional"
  | "other";

export type IngredientListItem = {
  key: string;
  display_name: string;
  group: IngredientGroup;
  is_core_default: boolean;
};

export type RecipeTag = "weekday" | "weekend";

// OLD: id (uuid), category, cook_time_minutes, difficulty, image_url, short_note
// NEW: recipe_id (bigint), hero_image, description - schema mới không có category/cook_time/difficulty
export type RecipeSummary = {
  recipe_id: number;  // bigint trong DB, number trong JS
  name: string;
  slug: string;
  tag: RecipeTag | null;
  hero_image: string | null;  // OLD: image_url
  description: string | null; // OLD: short_note
  is_active: boolean;
};

// OLD: role, amount, unit, note, ingredient_id (FK trực tiếp)
// NEW: ingredient_text, ingredient_index, join qua ingredient_aliases
export type RecipeIngredientItem = {
  ingredient_index: number;
  ingredient_text: string;        // raw text từ crawl
  display_name: string | null;    // từ ingredients table (qua alias join)
  key: string | null;             // từ ingredients table
  is_core_default: boolean;
};

// OLD: step_no, content, tip
// NEW: step_index, step_text, step_image (không có tip)
export type RecipeStepItem = {
  step_index: number;   // OLD: step_no
  step_text: string;    // OLD: content
  step_image: string | null;  // NEW field
};
