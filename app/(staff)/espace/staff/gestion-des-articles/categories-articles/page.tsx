"use client";

import type { FormEvent } from "react";
import PanelTable from "@/components/staff/ui/PanelTable";
import {
  StaffBadge,
  StaffFilterBar,
  StaffPageHeader,
} from "@/components/staff/ui";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { useStaffSessionContext } from "@/features/auth/client/staff-session-provider";
import { canCreateArticleCategories } from "@/features/article-categories/access";
import { useArticleCategoriesList } from "@/features/article-categories/hooks/use-article-categories-list";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const columns = [
  "Catégorie",
  "Couleur",
  "Articles liés",
  "Créée par",
  "Mise à jour",
  "Actions",
];

export default function ArticleCategoriesListPage() {
  const { user: authUser } = useStaffSessionContext();
  const canCreateCategory = authUser
    ? canCreateArticleCategories(authUser)
    : false;

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
  } = useArticleCategoriesList(20);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submitSearch();
  };

  return (
    <div className="space-y-6">
      <StaffPageHeader eyebrow="Articles" title="Catégories d'articles">
        {canCreateCategory ? (
          <AnimatedUIButton
            href="/espace/staff/gestion-des-articles/categories-articles/edit"
            variant="secondary"
            icon="plus"
            iconPosition="left"
          >
            Créer une catégorie
          </AnimatedUIButton>
        ) : null}
      </StaffPageHeader>

      <form onSubmit={handleSubmit}>
        <StaffFilterBar
          onSearchChange={(value: string) => setSearch(value)}
          searchValue={search}
        />
      </form>

      <PanelTable
        columns={columns}
        isLoading={isLoading}
        error={error}
        isEmpty={items.length === 0}
        emptyMessage="Aucune catégorie d'articles ne correspond à ces critères."
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
          itemLabel: "catégorie",
        }}
      >
        {items.map((category) => (
          <tr key={category.id} className="hover:bg-slate-50/60">
            <td className="px-4 py-3 align-top">
              <div className="flex items-start gap-3">
                <div
                  className="mt-1 h-10 w-10 rounded-2xl border border-slate-200"
                  style={{ backgroundColor: category.color }}
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <div className="font-semibold text-cobam-dark-blue">
                    {category.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {category.slug}
                  </div>
                </div>
              </div>
            </td>

            <td className="px-4 py-3 align-top">
              <StaffBadge size="md" color="default">
                {category.color}
              </StaffBadge>
            </td>

            <td className="px-4 py-3 align-top">
              <StaffBadge
                size="md"
                color={category.articleCount > 0 ? "blue" : "default"}
                icon={category.articleCount > 0 ? "file-text" : undefined}
              >
                {category.articleCount}
              </StaffBadge>
            </td>

            <td className="px-4 py-3 align-top text-sm text-slate-600">
              {category.createdByLabel ?? "Système"}
            </td>

            <td className="px-4 py-3 align-top text-xs text-slate-600">
              {new Date(category.updatedAt).toLocaleDateString("fr-FR")}
            </td>

            <td className="px-4 py-3 align-top text-right">
              <AnimatedUIButton
                href={`/espace/staff/gestion-des-articles/categories-articles/edit?id=${category.id}`}
                variant="ghost"
                icon="modify"
                iconPosition="left"
              >
                Modifier
              </AnimatedUIButton>
            </td>
          </tr>
        ))}
      </PanelTable>
    </div>
  );
}
