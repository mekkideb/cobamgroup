import type { PublicProductSubcategoryCardData } from "@/features/product-categories/public-types";
import PublicSubcategoryCard from "./public-subcategory-card";

type PublicSubcategoriesGridProps = {
  subcategories: PublicProductSubcategoryCardData[];
};

export default function PublicSubcategoriesGrid({
  subcategories,
}: PublicSubcategoriesGridProps) {
  if (subcategories.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-14 text-center text-slate-500">
        Aucune sous-catégorie publique n&apos;est disponible pour le moment.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {subcategories.map((subcategory) => (
        <PublicSubcategoryCard key={subcategory.id} subcategory={subcategory} />
      ))}
    </div>
  );
}
