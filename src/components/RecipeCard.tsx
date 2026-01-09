"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getRecipeImageSrc, type RecipeCategory } from "@/lib/images";

// OLD: category, cook_time_minutes
// NEW: removed - không có trong schema mới
type Props = {
  name: string;
  slug: string;
  imageUrl?: string | null;
  core_missing?: number | null;
  missing_core_names?: string[] | null;
  onClick?: () => void;
  // REMOVED: category, cook_time_minutes
};

export function RecipeCard({
  name,
  slug,
  imageUrl,
  core_missing,
  missing_core_names,
  onClick,
}: Props) {
  // OLD: getRecipeImageSrc(slug, category)
  // NEW: no category
  const { bySlug, fallback } = useMemo(
    () => getRecipeImageSrc(slug, null),
    [slug],
  );

  const preferredSrc = useMemo(() => {
    const trimmed = imageUrl?.trim();
    return trimmed ? trimmed : bySlug;
  }, [imageUrl, bySlug]);

  const [imgSrc, setImgSrc] = useState(preferredSrc);

  // Reset ảnh khi slug/category/imageUrl đổi (để fallback không “dính” qua recipe khác)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setImgSrc(preferredSrc), [preferredSrc]);

  const isRemoteHero = /^https?:\/\//i.test(imgSrc);

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
      <div className="relative overflow-hidden bg-slate-100">
        <div className="relative aspect-[16/9] w-full">
          {isRemoteHero ? (
            // Dùng <img> để chấp nhận mọi domain (Next/Image cần allowlist domains).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt={name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
              onError={() => setImgSrc(bySlug)}
            />
          ) : (
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
          )}
          <div className="absolute left-3 top-3">{badge}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
          {name}
        </h3>

        <div className="flex items-center justify-between text-sm text-slate-600">
          {/* OLD: displayed cook_time_minutes */}
          {/* NEW: no longer available in schema */}

          {typeof core_missing === "number" && core_missing > 0 ? (
            <span className="text-xs text-slate-500">
              {missing_core_names?.length
                ? `Thiếu: ${missing_core_names.slice(0, 2).join(", ")}${missing_core_names.length > 2 ? "…" : ""
                }`
                : null}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
