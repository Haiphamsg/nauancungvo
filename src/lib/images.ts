export type RecipeCategory =
  | "xao"
  | "canh"
  | "kho"
  | "chien"
  | "hap"
  | "nuong"
  | "nuoc"
  | "khac"
  | string;

const categoryFallback: Record<string, string> = {
  xao: "/images/categories/xao.jpg",
  canh: "/images/categories/canh.jpg",
  kho: "/images/categories/kho.jpg",
  chien: "/images/categories/chien.jpg",
  hap: "/images/categories/hap.jpg",
  nuong: "/images/categories/nuong.jpg",
  nuoc: "/images/categories/nuoc.jpg",
  khac: "/images/categories/khac.jpg",
};

export function getRecipeImageSrc(slug: string, category?: RecipeCategory | null) {
  // Ưu tiên ảnh theo slug (nếu có file thì hiển thị)
  // Lưu ý: Next/Image không check tồn tại file, nên ta dùng onError fallback ở component.
  const bySlug = `/images/recipes/${slug}.jpg`;

  const fallback =
    (category ? categoryFallback[String(category)] : null) ||
    "/images/categories/default.jpg";

  return { bySlug, fallback };
}
