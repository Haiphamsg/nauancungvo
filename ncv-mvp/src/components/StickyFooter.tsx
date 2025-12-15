type Props = {
  count: number;
  onAction: () => void;
  disabled?: boolean;
};

export function StickyFooter({ count, onAction, disabled = false }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="text-sm text-slate-700">
          Đang chọn <span className="font-semibold">{count}</span> nguyên liệu
        </div>
        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Xem món phù hợp
        </button>
      </div>
    </div>
  );
}
