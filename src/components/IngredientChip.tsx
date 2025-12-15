type Props = {
  label: string;
  selected?: boolean;
  onToggle?: () => void;
};

export function IngredientChip({ label, selected = false, onToggle }: Props) {
  const base =
    "rounded-full border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-400";
  const stateClass = selected
    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
    : "border-slate-300 bg-white text-slate-800 hover:border-emerald-400";

  return (
    <button type="button" onClick={onToggle} className={`${base} ${stateClass}`}>
      {label}
    </button>
  );
}
