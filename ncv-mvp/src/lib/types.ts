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

export type RecipeSummary = {
  id: number;
  name: string;
  slug: string;
  tag: RecipeTag | null;
  category: string | null;
  cook_time_minutes: number | null;
  difficulty: string | null;
  image_url: string | null;
  short_note: string | null;
};

export type RecipeIngredientItem = {
  role: string | null;
  amount: number | null;
  unit: string | null;
  note: string | null;
  display_name: string;
  key: string;
  is_core_default: boolean;
};

export type RecipeStepItem = {
  step_no: number;
  content: string;
  tip: string | null;
};
