import Image from "next/image";
import { useMemo, useState } from "react";
import { getRecipeImageSrc } from "@/lib/images";

type Props = {
  name: string;
  slug: string;
  category?: string | null;
  tag?: "weekday" | "weekend" | string | null;
  cook_time_minutes?: number | null;
  core_missing?: number | null;
  missing_core_names?: string[] | null;
  onClick?: () => void;
};

const tagLabels: Record<string, string> = {
  weekday: "Trong tuần",
  weekend: "Cuối tuần",
};

export function RecipeCard({
  name,
  slug,
  category,
  tag,
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

  const status = useMemo(() => {
    if (core_missing === 0) {
      return { label: "Nấu ngay", className: "bg-emerald-600 text-white" };
    }
    if (typeof core_missing === "number" && core_missing > 0) {
      return {
        label: `Thiếu ${core_missing}`,
        className: "bg-amber-500 text-white",
      };
    }
    return null;
  }, [core_missing]);

  const missingPreview = useMemo(() => {
    if (!missing_core_names?.length || !core_missing || core_missing <= 0) return [];
    const maxChips = 2;
    const chips = missing_core_names.slice(0, maxChips);
    const rest = missing_core_names.length - chips.length;
    return { chips, rest };
  }, [missing_core_names, core_missing]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-[16/9] w-full bg-slate-100">
        <Image
          src={imgSrc}
          alt={name}
          fill
          className="object-cover transition group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 100vw, 50vw"
          onError={() => setImgSrc(fallback)}
          priority={false}
        />

        {/* Tag pill (top-left) */}
        {tag ? (
          <div className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            {tagLabels[String(tag)] ?? String(tag)}
          </div>
        ) : null}

        {/* Status (top-right) */}
        {status ? (
          <div
            className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
          >
            {status.label}
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
            {name}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {cook_time_minutes ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              ⏱ {cook_time_minutes} phút
            </span>
          ) : null}

          {category ? (
            <span className="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
              {category}
            </span>
          ) : null}
        </div>

        {/* Missing chips */}
        {missingPreview && "chips" in missingPreview ? (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-500">Thiếu:</span>
            {missingPreview.chips.map((n) => (
              <span
                key={n}
                className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"
              >
                {n}
              </span>
            ))}
            {missingPreview.rest > 0 ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                +{missingPreview.rest}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Optional: hide slug to reduce text noise */}
        <p className="text-xs text-slate-400">/{slug}</p>
      </div>
    </button>
  );
}
