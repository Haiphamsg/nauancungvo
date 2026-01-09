"use client";
import { toUiError } from "@/lib/errors";
import { ErrorBox } from "@/components/ErrorBox";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChipsSkeleton } from "@/components/Skeletons";
import { GroupTabs } from "@/components/GroupTabs";
import { IngredientChip } from "@/components/IngredientChip";
import { StickyFooter } from "@/components/StickyFooter";

import { useIngredients, type Ingredient as CachedIngredient } from "@/lib/useIngredients";

type IngredientItem = {
  key: string;
  display_name: string;
  group:
  | "protein"
  | "vegetable"
  | "carb"
  | "spice_core"
  | "spice_optional"
  | "other";
  is_core_default: boolean;
};

const groupLabels: Record<IngredientItem["group"], string> = {
  protein: "Thịt/Cá",
  vegetable: "Rau/Củ",
  carb: "Tinh bột",
  spice_core: "Gia vị (cốt lõi)",
  spice_optional: "Gia vị (phụ)",
  other: "Khác",
};

function normalizeIngredient(raw: CachedIngredient): IngredientItem {
  // OLD: cần fallback từ group_final, is_core_final (view)
  // NEW: dùng trực tiếp group, is_core_default (table)
  // FIX: DB có mixed case (vegetable vs Vegetable), cần lowercase
  const rawGroup = (raw.group ?? "other").toLowerCase() as IngredientItem["group"];
  const validGroups: IngredientItem["group"][] = ["protein", "vegetable", "carb", "spice_core", "spice_optional", "other"];
  const group = validGroups.includes(rawGroup) ? rawGroup : "other";

  return {
    key: raw.key,
    display_name: raw.display_name,
    group,
    is_core_default: raw.is_core_default ?? false,
  };
}

export default function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ useIngredients: cache 24h + refresh nền
  const {
    items: cachedItems,
    loading: ingredientsLoading,
    error: ingredientsError,
  } = useIngredients();

  // Local state giữ đúng behavior hiện tại
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [ingredientMap, setIngredientMap] = useState<Record<string, IngredientItem>>(
    {},
  );
  const [activeGroup, setActiveGroup] =
    useState<IngredientItem["group"]>("protein");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  const autoSelected = useRef(false);
  const initialKeysApplied = useRef(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Read keys from URL ONCE (and early)
  useEffect(() => {
    const incomingKeysParam = searchParams.get("keys");
    if (!initialKeysApplied.current && incomingKeysParam) {
      const keysFromUrl = incomingKeysParam
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      if (keysFromUrl.length) {
        setSelected(new Set(keysFromUrl));
      }
      initialKeysApplied.current = true;
    }
  }, [searchParams]);

  // ✅ Khi hook load xong -> set list + map 1 lần (và mỗi lần hook refresh)
  useEffect(() => {
    // Nếu hook chưa có data thì thôi
    if (!cachedItems) return;

    const list: IngredientItem[] = (cachedItems as any[]).map(normalizeIngredient);

    setIngredients(list);

    setIngredientMap(() => {
      const next: Record<string, IngredientItem> = {};
      list.forEach((ing) => {
        next[ing.key] = ing;
      });
      return next;
    });

    // Auto-select defaults (chỉ 1 lần, chỉ khi không có query + không có keys từ URL)
    const query = debounced?.trim();
    if (!autoSelected.current && !query && !initialKeysApplied.current) {
      const defaults = list
        .filter((ing) => ing.is_core_default)
        .map((ing) => ing.key);

      if (defaults.length) setSelected(new Set(defaults));
      autoSelected.current = true;
    }
  }, [cachedItems, debounced]);

  // Search/filter client-side (không gọi DB theo search nữa -> nhẹ và ổn hosting)
  const filteredIngredients = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) => {
      const dn = (i.display_name ?? "").toLowerCase();
      const k = (i.key ?? "").toLowerCase();
      return dn.includes(q) || k.includes(q);
    });
  }, [ingredients, debounced]);

  const visibleIngredients = useMemo(() => {
    if (debounced) return filteredIngredients;
    return filteredIngredients.filter((item) => item.group === activeGroup);
  }, [filteredIngredients, debounced, activeGroup]);

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleNavigate = () => {
    const keys = Array.from(selected);
    const params = new URLSearchParams();
    if (keys.length) params.set("keys", keys.join(","));
    params.set("tag", "weekday");
    router.push(`/recommendations?${params.toString()}`);
  };

  const loading = ingredientsLoading;
  const error = ingredientsError;

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-emerald-700">Nấu ăn gia đình</p>
          <h1 className="text-2xl font-bold text-slate-900">
            Chọn nguyên liệu bạn đang có
          </h1>
          <p className="text-sm text-slate-600">
            Mặc định đã chọn các gia vị cốt lõi. Bạn có thể tìm kiếm hoặc chọn thêm.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-700">Tìm kiếm</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ví dụ: gà, tỏi, ớt..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <section className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-slate-800">Đã chọn</p>
          <div className="flex flex-wrap gap-2">
            {selected.size === 0 ? (
              <span className="text-sm text-slate-500">Chưa chọn nguyên liệu nào.</span>
            ) : (
              Array.from(selected).map((key) => {
                const item = ingredientMap[key];
                return (
                  <IngredientChip
                    key={key}
                    label={item?.display_name ?? key}
                    selected
                    onToggle={() => toggleSelect(key)}
                  />
                );
              })
            )}
          </div>
        </section>

        {!debounced ? (
          <GroupTabs
            tabs={Object.entries(groupLabels).map(([value, label]) => ({
              value,
              label,
            }))}
            active={activeGroup}
            onChange={(value) => setActiveGroup(value as IngredientItem["group"])}
          />
        ) : null}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {debounced ? (
            <div className="col-span-full text-sm font-semibold text-slate-800">
              Kết quả tìm kiếm
            </div>
          ) : null}

          {loading ? (
            <ChipsSkeleton count={12} />
          ) : error ? (
            <div className="col-span-full">
              <ErrorBox err={toUiError(new Error(error))} />
            </div>
          ) : visibleIngredients.length === 0 ? (
            <div className="col-span-full rounded-md border border-dashed border-slate-200 p-4 text-center text-sm text-slate-600">
              Không có nguyên liệu phù hợp. Thử tìm từ khóa khác.
            </div>
          ) : (
            visibleIngredients.map((item) => (
              <IngredientChip
                key={item.key}
                label={item.display_name}
                selected={selected.has(item.key)}
                onToggle={() => toggleSelect(item.key)}
              />
            ))
          )}
        </section>

        <div className="pb-24" />
      </main>

      <StickyFooter
        count={selected.size}
        onAction={handleNavigate}
        disabled={selected.size === 0}
      />
    </div>
  );
}
