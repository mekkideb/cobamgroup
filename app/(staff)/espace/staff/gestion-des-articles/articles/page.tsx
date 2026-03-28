"use client";

import type { FormEvent } from "react";
import { StaffBadge, StaffFilterBar, StaffPageHeader, StaffSelect } from "@/components/staff/ui";
import PanelTable from "@/components/staff/ui/PanelTable";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { useArticlesList } from "@/features/articles/hooks/use-articles-list";
import type { ArticleListItemDto, ArticleStatus } from "@/features/articles/types";
import { usePathname } from "next/navigation";

function getArticleStatusBadge(status: ArticleStatus) {
  switch (status) {
    case "PUBLISHED":
      return {
        label: "Publié",
        color: "green" as const,
        icon: "badge-check" as const,
      };
    case "ARCHIVED":
      return {
        label: "Archivé",
        color: "amber" as const,
        icon: "folder" as const,
      };
    case "DRAFT":
    default:
      return {
        label: "Brouillon",
        color: "default" as const,
        icon: "file-text" as const,
      };
  }
}

const PAGE_SIZE_OPTIONS = [8, 12, 16, 20];
const columns = [
  "Titre",
  "Auteur",
  "Catégories",
  "Statut",
  "Publié le",
  "Mis à jour",
  "Actions",
];

export default function ArticlesListPage() {
  const {
    items,
    total,
    page,
    pageSize,
    search,
    status,
    isLoading,
    error,
    totalPages,
    canPrev,
    canNext,
    setSearch,
    setStatus,
    submitSearch,
    updatePageSize,
    goPrev,
    goNext,
  } = useArticlesList(12);

  const pathname = usePathname();

  const handleSearchSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submitSearch();
  };

  return (
    <div className="space-y-6">
      <StaffPageHeader eyebrow="Articles" title="Gestion des articles">
        <AnimatedUIButton
          href={`${pathname}/edit`}
          variant="secondary"
          icon="plus"
          iconPosition="left"
        >
          Créer un article
        </AnimatedUIButton>
      </StaffPageHeader>

      <form onSubmit={handleSearchSubmit}>
        <StaffFilterBar
          searchValue={search}
          onSearchChange={(value: string) => setSearch(value)}
        >
          <StaffSelect
            value={status}
            onValueChange={setStatus}
            emptyLabel="Tous les statuts"
            options={[
              { value: "PUBLISHED", label: "Publiés" },
              { value: "DRAFT", label: "Brouillons" },
              { value: "ARCHIVED", label: "Archivés" },
            ]}
          />
        </StaffFilterBar>
      </form>

      <PanelTable
        columns={columns}
        isLoading={isLoading}
        error={error}
        isEmpty={items.length === 0}
        emptyMessage="Aucun article ne correspond à ces critères."
        pagination={{
          goPrev,
          goNext,
          updatePageSize,
          canPrev,
          canNext,
          pageSize,
          total,
          totalPages,
          page,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          itemLabel: "article",
        }}
      >
        {items.map((article: ArticleListItemDto) => {
          const statusBadge = getArticleStatusBadge(article.status);

          return (
            <tr key={article.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 align-top font-semibold text-cobam-dark-blue">
                {article.title}
              </td>

              <td className="px-4 py-3 align-top text-slate-600">
                {article.author.name || article.author.email}
              </td>

              <td className="px-4 py-3 align-top text-slate-600">
                {article.categories.length > 0
                  ? article.categories
                      .map((category) => `${category.name} (${category.score}%)`)
                      .join(", ")
                  : "-"}
              </td>

              <td className="px-4 py-3 align-top">
                <StaffBadge
                  size="md"
                  color={statusBadge.color}
                  icon={statusBadge.icon}
                >
                  {statusBadge.label}
                </StaffBadge>
              </td>

              <td className="px-4 py-3 align-top text-xs text-slate-600">
                {article.publishedAt
                  ? new Date(article.publishedAt).toLocaleDateString("fr-FR")
                  : "-"}
              </td>

              <td className="px-4 py-3 align-top text-xs text-slate-600">
                {new Date(article.updatedAt).toLocaleDateString("fr-FR")}
              </td>

              <td className="px-4 py-3 align-top text-right">
                <AnimatedUIButton
                  href={`${pathname}/edit?id=${article.id}`}
                  icon="modify"
                  variant="ghost"
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
