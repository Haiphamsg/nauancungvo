import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  if (!url) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE_URL" }, { status: 500 });
  }
  if (!anon) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE_ANON_KEY" }, { status: 500 });
  }

  try {
    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Query nhẹ nhất có thể (đổi table nếu bạn chưa có recipes)
    const { data, error } = await supabase
      .from("recipes")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          stage: "supabase_query",
          message: error.message,
          details: error.details ?? null,
          hint: error.hint ?? null,
          code: error.code ?? null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      supabase_url: url,
      sample: data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        stage: "exception",
        name: e?.name ?? null,
        message: e?.message ?? String(e),
        stack: e?.stack ? String(e.stack).split("\n").slice(0, 8).join("\n") : null,
      },
      { status: 500 }
    );
  }
}
