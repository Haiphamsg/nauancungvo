"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getRecipeImageSrc, type RecipeCategory } from "@/lib/images";

type Props = {
  name: string;
  slug: string;
  category?: RecipeCategory | null;
  cook_time_minutes?: number | null;
  core_missing?: number | null;
  missing_core_names?: string[] | null;
  onClick?: () => void;
};

export function RecipeCard({
  name,
  slug,
  category,
  cook_time_minutes,
  core_missing,
  missing_core_names,
  onClick,
}: Props) {
  const { bySlug, fallback } = useMemo(
    () => getRecipeImageSrc(slug, category),
    [slug, category],
  );

  const [imgSrc, setImgSrc] = useState(bySlug);

  // ✅ Khi slug/category đổi, reset ảnh về bySlug
  useEffect(() => setImgSrc(bySlug), [bySlug]);

  const badge = (() => {
    if (core_missing === 0) {
      return (
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
          Nấu ngay
        </span>
      );
    }
    if (typeof core_missing === "number" && core_missing > 0) {
      return (
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
          Thiếu {core_missing}
        </span>
      );
    }
    return null;
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
    >
      <div className="relative aspect-[16/9] w-full bg-slate-100">
        <Image
          src={imgSrc}
          alt={name}
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 100vw, 50vw"
          onError={() => {
            if (imgSrc !== fallback) setImgSrc(fallback);
          }}
        />
        <div className="absolute left-3 top-3">{badge}</div>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
          {name}
        </h3>

        <div className="flex items-center justify-between text-sm text-slate-600">
          {cook_time_minutes ? (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden>⏱</span>
              {cook_time_minutes} phút
            </span>
          ) : (
            <span />
          )}

          {typeof core_missing === "number" && core_missing > 0 ? (
            <span className="text-xs text-slate-500">
              {missing_core_names?.length
                ? `Thiếu: ${missing_core_names.slice(0, 2).join(", ")}${
                    missing_core_names.length > 2 ? "…" : ""
                  }`
                : null}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
