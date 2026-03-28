import { notFound } from "next/navigation";
import PublicProductGrid from "@/components/public/products/public-product-grid";
import PageHeader from "@/components/ui/custom/PageHeader";
import { findPublicProductSubcategoryBySlugs } from "@/features/product-categories/public";
import {
  listPublicProductsBySubcategory,
  PUBLIC_PRODUCTS_PAGE_SIZE,
} from "@/features/products/public";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}) {
  const { category, subcategory } = await params;
  const [subcategoryData, initialProducts] = await Promise.all([
    findPublicProductSubcategoryBySlugs({
      categorySlug: category,
      subcategorySlug: subcategory,
    }),
    listPublicProductsBySubcategory({
      categorySlug: category,
      subcategorySlug: subcategory,
      page: 1,
      pageSize: PUBLIC_PRODUCTS_PAGE_SIZE,
    }),
  ]);

  if (!subcategoryData) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-cobam-light-bg text-cobam-dark-blue">
      <PageHeader
        description={
          subcategoryData.descriptionSEO ||
          "Découvrez cette sous-catégorie de produits COBAM GROUP."
        }
        title={subcategoryData.name}
        subtitle={subcategoryData.parentName ?? "Produits"}
      />

      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PublicProductGrid
            categorySlug={category}
            subcategorySlug={subcategory}
            initialResult={initialProducts}
          />
        </div>
      </section>
    </main>
  );
}
