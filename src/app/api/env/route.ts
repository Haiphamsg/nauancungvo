// src/app/api/env/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,

    NODE_OPTIONS: process.env.NODE_OPTIONS ?? null,

    SUPABASE_URL: process.env.SUPABASE_URL
      ? "[SET]"
      : null,

    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? "[SET]"
      : null,

    memory_usage: process.memoryUsage(),
  });
}
