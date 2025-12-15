type Props = {
  name: string;
  slug: string;
  cook_time_minutes?: number | null;
  core_missing?: number | null;
  missing_core_names?: string[] | null;
  onClick?: () => void;
};

export function RecipeCard({
  name,
  slug,
  cook_time_minutes,
  core_missing,
  missing_core_names,
  onClick,
}: Props) {
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
      className="flex w-full flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{name}</h3>
          <p className="text-sm text-slate-500">Slug: {slug}</p>
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
    </button>
  );
}
