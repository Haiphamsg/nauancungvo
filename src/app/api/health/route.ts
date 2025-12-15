import { NextResponse } from "next/server";

import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const { count, error } = await supabase
      .from("recipes")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      recipeCount: count ?? 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Supabase error";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
