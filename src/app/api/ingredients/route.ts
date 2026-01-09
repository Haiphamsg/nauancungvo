import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { IngredientGroup, IngredientListItem } from "@/lib/types";

const allowedGroups: Set<IngredientGroup> = new Set([
  "protein",
  "vegetable",
  "carb",
  "spice_core",
  "spice_optional",
  "other",
]);

// OLD: group_final, is_core_final (from v_ingredients_final view)
// NEW: group, is_core_default (from ingredients table directly)
type IngredientRow = {
  id: string; // uuid
  key: string;
  display_name: string;
  group: IngredientGroup;        // OLD: group_final
  is_core_default: boolean;      // OLD: is_core_final
  search_text: string | null;
};

const normalizeText = (input: string) =>
  input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const qRaw = searchParams.get("q")?.trim() ?? "";
  const groupParam = searchParams.get("group")?.trim();

  const group = allowedGroups.has(groupParam as IngredientGroup)
    ? (groupParam as IngredientGroup)
    : undefined;

  const supabase = createSupabaseServer();

  try {
    // 1) No search -> list
    // OLD: v_ingredients_final (view)
    // NEW: ingredients (table directly)
    if (!qRaw) {
      let query = supabase
        .from("ingredients")  // OLD: v_ingredients_final
        .select("id, key, display_name, group, is_core_default")  // OLD: group_final, is_core_final
        .order("group")
        .order("display_name");

      if (group) query = query.eq("group", group);  // OLD: group_final

      const { data, error } = await query;
      if (error) throw error;

      const items: IngredientListItem[] = (data as IngredientRow[]).map((x) => ({
        key: x.key,
        display_name: x.display_name,
        group: x.group,              // OLD: x.group_final
        is_core_default: x.is_core_default,  // OLD: x.is_core_final
      }));

      return NextResponse.json({ items });
    }

    // Normalize q for ilike (accent-insensitive) and fallback
    const normalized = normalizeText(qRaw);
    const pattern = `%${qRaw}%`;
    const normPattern = `%${normalized}%`;

    // 2) Query A: search directly on ingredients (normalized + fallback)
    // OLD: v_ingredients_final
    // NEW: ingredients table
    let qIngredients = supabase
      .from("ingredients")  // OLD: v_ingredients_final
      .select("id, key, display_name, group, is_core_default, search_text")  // OLD: group_final, is_core_final
      .or(
        [
          `search_text.ilike.${normPattern}`,
          `display_name.ilike.${pattern}`,
        ].join(","),
      );

    if (group) qIngredients = qIngredients.eq("group", group);  // OLD: group_final

    const { data: aData, error: aErr } = await qIngredients;
    if (aErr) throw aErr;

    // 3) Query B: search alias table -> get ingredient_ids
    const { data: aliasData, error: aliasErr } = await supabase
      .from("ingredient_aliases")
      .select("ingredient_id, alias, alias_norm")
      .or(
        [`alias_norm.ilike.${normPattern}`, `alias.ilike.${pattern}`].join(","),
      );

    if (aliasErr) throw aliasErr;

    const aliasIds = Array.from(
      new Set((aliasData ?? []).map((x: any) => x.ingredient_id as string)),
    );

    let bData: IngredientRow[] = [];
    if (aliasIds.length > 0) {
      let qByAlias = supabase
        .from("ingredients")  // OLD: v_ingredients_final
        .select("id, key, display_name, group, is_core_default")  // OLD: group_final, is_core_final
        .in("id", aliasIds);

      if (group) qByAlias = qByAlias.eq("group", group);  // OLD: group_final

      const { data, error } = await qByAlias;
      if (error) throw error;
      bData = (data ?? []) as IngredientRow[];
    }

    // 4) Merge + dedupe by id
    const dedup = new Map<string, IngredientListItem>();
    for (const x of [...((aData ?? []) as IngredientRow[]), ...bData]) {
      dedup.set(x.id, {
        key: x.key,
        display_name: x.display_name,
        group: x.group,              // OLD: x.group_final
        is_core_default: x.is_core_default,  // OLD: x.is_core_final
      });
    }

    // 5) Sort
    const items = Array.from(dedup.values()).sort((a, b) => {
      if (a.group === b.group) return a.display_name.localeCompare(b.display_name);
      return a.group.localeCompare(b.group);
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("INGREDIENTS_FETCH_ERROR", e);
    console.error("CAUSE", e?.cause);
    console.error("STACK", e?.stack);

    return Response.json(
      {
        ok: false,
        name: e?.name ?? null,
        message: e?.message ?? String(e),
        // cố gắng trích cause an toàn
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
