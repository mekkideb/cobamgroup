"use client";

import type { FormEvent } from "react";
import PanelTable from "@/components/staff/ui/PanelTable";
import {
  StaffBadge,
  StaffFilterBar,
  StaffPageHeader,
  StaffSelect,
} from "@/components/staff/ui";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { useStaffSessionContext } from "@/features/auth/client/staff-session-provider";
import { canCreateProducts } from "@/features/products/access";
import { useProductsList } from "@/features/products/hooks/use-products-list";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const columns = [
  "Famille",
  "Marque",
  "Catégories",
  "Taxonomies",
  "Cycle de vie",
  "Visibilité",
  "Variantes",
  "Actions",
];

function getDescriptionPreview(description: string | null) {
  if (!description) {
    return "-";
  }

  return description.length > 100
    ? `${description.slice(0, 97)}...`
    : description;
}

function getLifecycleBadge(status: "DRAFT" | "ACTIVE" | "ARCHIVED") {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Active",
        color: "green" as const,
        icon: "check-circle" as const,
      };
    case "ARCHIVED":
      return {
        label: "Archivée",
        color: "amber" as const,
        icon: "pause" as const,
      };
    case "DRAFT":
    default:
      return {
        label: "Brouillon",
        color: "default" as const,
        icon: "modify" as const,
      };
  }
}

function getVisibilityBadge(visibility: "HIDDEN" | "PUBLIC") {
  return visibility === "PUBLIC"
    ? {
        label: "Publique",
        color: "blue" as const,
        icon: "eye" as const,
      }
    : {
        label: "Masquée",
        color: "default" as const,
        icon: "eye-off" as const,
      };
}

export default function ProductsListPage() {
  const { user: authUser } = useStaffSessionContext();
  const canCreateProduct = authUser ? canCreateProducts(authUser) : false;

  const {
    items,
    total,
    page,
    pageSize,
    search,
    brandId,
    productSubcategoryId,
    options,
    isLoading,
    error,
    totalPages,
    canPrev,
    canNext,
    setSearch,
    setBrandId,
    setProductSubcategoryId,
    submitFilters,
    updatePageSize,
    goPrev,
    goNext,
  } = useProductsList(20);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitFilters();
  };

  return (
    <div className="space-y-6">
      <StaffPageHeader
        eyebrow="Produits"
        title="Gestion des familles produit"
      >
        {canCreateProduct ? (
          <AnimatedUIButton
            href="/espace/staff/gestion-des-produits/produits/edit"
            variant="secondary"
            icon="plus"
            iconPosition="left"
          >
            Créer une famille
          </AnimatedUIButton>
        ) : null}
      </StaffPageHeader>

      <form onSubmit={handleSubmit}>
        <StaffFilterBar
          searchValue={search}
          searchPlaceholder="Rechercher par nom, slug, marque ou catégorie..."
          onSearchChange={(value: string) => setSearch(value)}
        >
          <StaffSelect
            value={brandId}
            onValueChange={setBrandId}
            emptyLabel="Toutes les marques"
            options={options.brands.map((option) => ({
              value: String(option.id),
              label: option.name,
            }))}
          />

          <StaffSelect
            value={productSubcategoryId}
            onValueChange={setProductSubcategoryId}
            emptyLabel="Toutes les sous-catégories"
            options={options.productSubcategories.map((option) => ({
              value: String(option.id),
              label: `${option.categoryName} / ${option.name}`,
            }))}
          />
        </StaffFilterBar>
      </form>

      <PanelTable
        columns={columns}
        isLoading={isLoading}
        error={error}
        isEmpty={items.length === 0}
        emptyMessage="Aucun produit ne correspond à ces critères."
        pagination={{
          goPrev,
          goNext,
          updatePageSize: (value) => updatePageSize(value as 10 | 20 | 50),
          canPrev,
          canNext,
          pageSize,
          total,
          totalPages,
          page,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          itemLabel: "produit",
        }}
      >
        {items.map((product) => {
          const lifecycleBadge = getLifecycleBadge(product.lifecycleStatus);
          const visibilityBadge = getVisibilityBadge(product.visibility);

          return (
            <tr key={product.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 align-top">
                <div className="font-semibold text-cobam-dark-blue">
                  {product.name}
                </div>
                <div className="text-[11px] text-slate-400">{product.slug}</div>
                {product.subtitle ? (
                  <div className="mt-1 text-xs text-slate-500">
                    {product.subtitle}
                  </div>
                ) : null}
                <div className="mt-1 text-xs text-slate-500">
                  {getDescriptionPreview(product.excerpt ?? product.description)}
                </div>
              </td>

              <td className="px-4 py-3 align-top text-slate-600">
                {product.brand ? (
                  <>
                    <div className="font-medium text-cobam-dark-blue">
                      {product.brand.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {product.brand.slug}
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-slate-400">Aucune marque</span>
                )}
              </td>

              <td className="px-4 py-3 align-top text-slate-600">
                <div className="font-medium text-cobam-dark-blue">
                  {product.productSubcategories.length === 0 ? (
                    <span>-</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {product.productSubcategories.map((subcategory) => (
                        <StaffBadge
                          key={`${product.id}-${subcategory.id}`}
                          size="sm"
                          color="secondary"
                          icon="folder"
                        >
                          {subcategory.categoryName} / {subcategory.name}
                        </StaffBadge>
                      ))}
                    </div>
                  )}
                </div>
              </td>

              <td className="px-4 py-3 align-top text-xs text-slate-600">
                <div>{product.tagCount} tag(s)</div>
              </td>

              <td className="px-4 py-3 align-top">
                <StaffBadge
                  size="md"
                  color={lifecycleBadge.color}
                  icon={lifecycleBadge.icon}
                >
                  {lifecycleBadge.label}
                </StaffBadge>
              </td>

              <td className="px-4 py-3 align-top">
                <StaffBadge
                  size="md"
                  color={visibilityBadge.color}
                  icon={visibilityBadge.icon}
                >
                  {visibilityBadge.label}
                </StaffBadge>
              </td>

              <td className="px-4 py-3 align-top text-sm text-slate-600">
                {product.variantCount}
              </td>

              <td className="px-4 py-3 align-top text-right">
                <AnimatedUIButton
                  href={`/espace/staff/gestion-des-produits/produits/edit?id=${product.id}`}
                  variant="ghost"
                  icon="modify"
                  iconPosition="left"
                >
                  Modifier
                </AnimatedUIButton>
              </td>
            </tr>
          );
        })}
      </PanelTable>
    </div>
  );
}
