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

  // Ưu tiên ảnh theo slug trước, lỗi thì chuyển fallback
  const [imgSrc, setImgSrc] = useState(bySlug);

  // ✅ Khi slug/category đổi -> reset về ảnh theo slug (rồi mới fallback nếu lỗi)
  useEffect(() => {
    setImgSrc(bySlug);
  }, [bySlug]);

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
          Thiếu {core_missing} nguyên liệu
        </span>
      );
    }
    return null;
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
    >
      <div className="relative h-28 w-full bg-slate-100">
        <Image
          src={imgSrc}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 50vw"
          onError={() => {
            // Nếu ảnh slug fail → chuyển sang fallback category/default
            setImgSrc((prev) => (prev === fallback ? prev : fallback));
          }}
        />
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{name}</h3>
            <p className="text-xs text-slate-500">Slug: {slug}</p>
          </div>
          {badge}
        </div>

        {cook_time_minutes ? (
          <p className="text-sm text-slate-600">
            Thời gian nấu: {cook_time_minutes} phút
          </p>
        ) : null}

        {core_missing && core_missing > 0 && missing_core_names?.length ? (
          <p className="text-sm text-slate-600">
            Thiếu: {missing_core_names.join(", ")}
          </p>
        ) : null}
      </div>
    </button>
  );
}
