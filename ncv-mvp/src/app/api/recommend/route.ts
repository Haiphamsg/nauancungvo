import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServer } from "@/lib/supabase/server";
import type { RecipeTag } from "@/lib/types";

type RecommendBody = {
  selected_keys?: unknown;
  prefer_tag?: RecipeTag | null;
  limit_n?: unknown;
  missing_core_allow?: unknown;
};

const clampLimit = (value: number | undefined): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 30;
  }
  return Math.min(50, Math.max(1, Math.floor(value)));
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RecommendBody;

  if (!Array.isArray(body.selected_keys)) {
    return NextResponse.json(
      { ok: false, error: "selected_keys must be an array of strings" },
      { status: 400 },
    );
  }

  const selectedKeys = body.selected_keys.filter(
    (item): item is string => typeof item === "string",
  );

  if (selectedKeys.length !== body.selected_keys.length) {
    return NextResponse.json(
      { ok: false, error: "selected_keys must be an array of strings" },
      { status: 400 },
    );
  }

  if (selectedKeys.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const preferTag =
    body.prefer_tag === "weekday" || body.prefer_tag === "weekend"
      ? body.prefer_tag
      : null;
  const limit = clampLimit(
    typeof body.limit_n === "number" ? body.limit_n : undefined,
  );
  const missingCore =
    typeof body.missing_core_allow === "number" &&
    !Number.isNaN(body.missing_core_allow)
      ? Math.floor(body.missing_core_allow)
      : 2;

  const supabase = createSupabaseServer();

  try {
    const { data, error } = await supabase.rpc("recommend_recipes", {
      selected_keys: selectedKeys,
      missing_core_allow: missingCore,
      prefer_tag: preferTag,
      limit_n: limit,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Supabase error";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
