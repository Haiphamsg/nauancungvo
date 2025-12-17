"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sbSelect } from "@/lib/supabaseRest";
import { GroupTabs } from "@/components/GroupTabs";
import { IngredientChip } from "@/components/IngredientChip";
import { StickyFooter } from "@/components/StickyFooter";

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

export default function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [ingredientMap, setIngredientMap] = useState<
    Record<string, IngredientItem>
  >({});
  const [activeGroup, setActiveGroup] =
    useState<IngredientItem["group"]>("protein");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoSelected = useRef(false);
  const initialKeysApplied = useRef(false);

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
    // intentionally depends on searchParams so it runs when URL changes
  }, [searchParams]);

  useEffect(() => {
    let ignore = false;

    const fetchIngredients = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = debounced?.trim();

        const list = await sbSelect<IngredientItem[]>("ingredients", {
          select: "key,display_name,group",
          ...(query
            ? { or: `(display_name.ilike.*${query}*,key.ilike.*${query}*)` }
            : {}),
          order: "group,display_name",
        });

        if (ignore) return;

        setIngredients(list);

        setIngredientMap((prev) => {
          const next = { ...prev };
          list.forEach((ing) => {
            next[ing.key] = ing;
          });
          return next;
        });

        if (!autoSelected.current && !query && !initialKeysApplied.current) {
          const defaults = list
            .filter((ing) => ing.is_core_default)
            .map((ing) => ing.key);

          if (defaults.length) setSelected(new Set(defaults));
          autoSelected.current = true;
        }
      } catch (err) {
        if (ignore) return;
        const message =
          err instanceof Error ? err.message : "Không tải được danh sách nguyên liệu";
        setError(message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchIngredients();

    return () => {
      ignore = true;
    };
  }, [debounced]);


  const visibleIngredients = useMemo(() => {
    if (debounced) return ingredients;
    return ingredients.filter((item) => item.group === activeGroup);
  }, [ingredients, debounced, activeGroup]);

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
            <div className="col-span-full flex items-center gap-2 text-sm text-slate-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              Đang tải...
            </div>
          ) : error ? (
            <div className="col-span-full text-sm text-red-600">{error}</div>
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
