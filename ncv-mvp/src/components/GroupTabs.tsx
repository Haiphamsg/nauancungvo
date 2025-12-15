type Tab = {
  value: string;
  label: string;
};

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (value: string) => void;
};

export function GroupTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
