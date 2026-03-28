import { notFound } from "next/navigation";
import PublicSubcategoriesGrid from "@/components/public/products/public-subcategories-grid";
import PageHeader from "@/components/ui/custom/PageHeader";
import {
  findPublicRootProductCategoryBySlug,
  listPublicProductSubcategoryCardsByCategorySlug,
} from "@/features/product-categories/public";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const [categoryData, subcategories] = await Promise.all([
    findPublicRootProductCategoryBySlug(category),
    listPublicProductSubcategoryCardsByCategorySlug(category),
  ]);

  if (!categoryData) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-cobam-light-bg text-cobam-dark-blue">
      <PageHeader
        description={
          categoryData.descriptionSEO ||
          "Découvrez cette catégorie de produits COBAM GROUP."
        }
        title={categoryData.name}
        subtitle="Catégorie"
      />

      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <p className="text-sm font-semibold tracking-[0.24em] text-cobam-water-blue uppercase">
                Navigation produits
              </p>
              <h2
                className="text-3xl font-bold text-cobam-dark-blue"
                style={{ fontFamily: "var(--font-playfair), serif" }}
              >
                Toutes les sous-catégories
              </h2>
            </div>


          </div>

          <PublicSubcategoriesGrid subcategories={subcategories} />
        </div>
      </section>
    </main>
  );
}
