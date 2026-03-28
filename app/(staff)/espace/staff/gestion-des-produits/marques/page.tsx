"use client";

import SearchInput from "@/components/staff/ui/SearchInput";
import PanelTable from "@/components/staff/ui/PanelTable";
import { StaffBadge, StaffFilterBar, StaffPageHeader } from "@/components/staff/ui";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { useStaffSessionContext } from "@/features/auth/client/staff-session-provider";
import { canCreateBrands } from "@/features/brands/access";
import { useBrandsList } from "@/features/brands/hooks/use-brands-list";
import type { BrandListItemDto, BrandShowcasePlacement } from "@/features/brands/types";
import { usePathname } from "next/navigation";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const columns = ["Marque", "Diffusion", "Produits", "Mise à jour", "Actions"];

function getDescriptionPreview(brand: BrandListItemDto) {
  if (!brand.description) {
    return "-";
  }

  return brand.description.length > 90
    ? `${brand.description.slice(0, 87)}...`
    : brand.description;
}

function getShowcaseBadge(placement: BrandShowcasePlacement) {
  switch (placement) {
    case "PARTNER":
      return {
        label: "Partenaire",
        color: "blue" as const,
        icon: "users" as const,
      };
    case "REFERENCE":
      return {
        label: "Référence",
        color: "indigo" as const,
        icon: "badge-check" as const,
      };
    case "NONE":
    default:
      return {
        label: "Aucune",
        color: "default" as const,
        icon: "close" as const,
      };
  }
}

function getProductUsageBadge(enabled: boolean) {
  return enabled
    ? {
        label: "Oui",
        color: "green" as const,
        icon: "check-circle" as const,
      }
    : {
        label: "Non",
        color: "default" as const,
        icon: "close" as const,
      };
}

export default function BrandsListPage() {
  const { user: authUser } = useStaffSessionContext();
  const canCreateBrand = authUser ? canCreateBrands(authUser) : false;
  const pathname = usePathname();

  const {
    items,
    total,
    page,
    pageSize,
    search,
    isLoading,
    error,
    totalPages,
    canPrev,
    canNext,
    setSearch,
    submitSearch,
    updatePageSize,
    goPrev,
    goNext,
  } = useBrandsList(20);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitSearch();
  };

  return (
    <div className="space-y-6">
      <StaffPageHeader eyebrow="Marques" title="Gestion des marques">
        {canCreateBrand ? (
          <AnimatedUIButton
            href={`${pathname}/edit`}
            variant="secondary"
            icon="plus"
            iconPosition="left"
          >
            Créer une marque
          </AnimatedUIButton>
        ) : null}
      </StaffPageHeader>

      <form onSubmit={handleSubmit}>
        <StaffFilterBar>
          <SearchInput
            value={search}
            onChange={(value: string) => setSearch(value)}
            placeholder="Rechercher par nom, slug ou description..."
          />
        </StaffFilterBar>
      </form>

      <PanelTable
        columns={columns}
        isLoading={isLoading}
        error={error}
        isEmpty={items.length === 0}
        emptyMessage="Aucune marque ne correspond à ces critères."
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
          itemLabel: "marque",
        }}
      >
        {items.map((brand) => {
          const showcaseBadge = getShowcaseBadge(brand.showcasePlacement);
          const productUsageBadge = getProductUsageBadge(brand.isProductBrand);

          return (
            <tr key={brand.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 align-top">
                <div className="font-semibold text-cobam-dark-blue">
                  {brand.name}
                </div>
                <div className="text-[11px] text-slate-400">{brand.slug}</div>
                <div className="mt-1 max-w-xs text-sm text-slate-500">
                  {getDescriptionPreview(brand)}
                </div>
              </td>

              <td className="px-4 py-3 align-top">
                <StaffBadge
                  size="md"
                  color={showcaseBadge.color}
                  icon={showcaseBadge.icon}
                >
                  {showcaseBadge.label}
                </StaffBadge>
              </td>

              <td className="px-4 py-3 align-top">
                <StaffBadge
                  size="md"
                  color={productUsageBadge.color}
                  icon={productUsageBadge.icon}
                >
                  {productUsageBadge.label}
                </StaffBadge>
              </td>

              <td className="px-4 py-3 align-top text-xs text-slate-600">
                {new Date(brand.updatedAt).toLocaleDateString("fr-FR")}
              </td>

              <td className="px-4 py-3 align-top text-right">
                <AnimatedUIButton
                  href={`${pathname}/edit?id=${brand.id}`}
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
