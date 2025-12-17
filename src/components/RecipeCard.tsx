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
    [slug, category]
  );

  const [imgSrc, setImgSrc] = useState(bySlug);
  useEffect(() => setImgSrc(bySlug), [bySlug]);

  const badge = (() => {
    if (core_missing === 0) {
      return (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
          Nấu ngay
        </span>
      );
    }
    if (typeof core_missing === "number" && core_missing > 0) {
      return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
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
      className={[
        "group flex w-full flex-col overflow-hidden rounded-xl border bg-white text-left transition",
        core_missing === 0
          ? "border-emerald-200 hover:shadow-md"
          : "border-slate-200 hover:shadow-md",
      ].join(" ")}
    >
      {/* Image */}
      <div className="relative h-32 w-full bg-slate-100">
        <Image
          src={imgSrc}
          alt={name}
          fill
          className="object-cover transition group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, 50vw"
          onError={() => {
            if (imgSrc !== fallback) setImgSrc(fallback);
          }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-snug text-slate-900 line-clamp-2">
            {name}
          </h3>
          {badge}
        </div>

        {cook_time_minutes ? (
          <div className="text-sm text-slate-600">⏱ {cook_time_minutes} phút</div>
        ) : null}

        {core_missing && core_missing > 0 && missing_core_names?.length ? (
          <div className="text-sm text-slate-600 line-clamp-1">
            Thiếu: {missing_core_names.join(", ")}
          </div>
        ) : null}
      </div>
    </button>
  );
}
