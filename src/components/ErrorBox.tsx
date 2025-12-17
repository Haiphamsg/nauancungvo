"use client";

import type { UiError } from "@/lib/errors";

export function ErrorBox({ err }: { err: UiError }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4">
      <div className="text-sm font-semibold text-red-800">
        {err.title}
        {typeof err.status === "number" ? ` (${err.status})` : ""}
      </div>
      <div className="mt-1 text-sm text-red-700">{err.message}</div>
    </div>
  );
}
