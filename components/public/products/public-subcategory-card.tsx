import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PublicProductSubcategoryCardData } from "@/features/product-categories/public-types";

type PublicSubcategoryCardProps = {
  subcategory: PublicProductSubcategoryCardData;
};

export default function PublicSubcategoryCard({
  subcategory,
}: PublicSubcategoryCardProps) {
  return (
    <Link
      href={subcategory.href}
      className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {subcategory.imageThumbnailUrl ? (
          <Image
            src={subcategory.imageThumbnailUrl}
            alt={subcategory.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-cobam-light-bg via-white to-cobam-light-bg px-8 text-center text-sm font-semibold text-cobam-dark-blue">
            {subcategory.name}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold tracking-[0.28em] text-cobam-water-blue uppercase">
            Sous-catégorie
          </p>
          <span className="rounded-full bg-cobam-light-bg px-3 py-1 text-xs font-semibold text-cobam-dark-blue">
            {subcategory.productCount} produit{subcategory.productCount > 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-3">
          <h2
            className="text-2xl font-bold leading-tight text-cobam-dark-blue"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            {subcategory.name}
          </h2>

          {subcategory.subtitle ? (
            <p className="text-sm font-medium text-slate-600">{subcategory.subtitle}</p>
          ) : null}

          <p className="line-clamp-4 text-sm leading-7 text-slate-600">
            {subcategory.description || "Découvrez cette sous-catégorie de produits COBAM GROUP."}
          </p>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-2 text-sm font-semibold text-cobam-water-blue transition-transform duration-300 group-hover:translate-x-1">
          Explorer
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
