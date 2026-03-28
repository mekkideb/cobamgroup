"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import Panel from "@/components/staff/ui/Panel";
import { StaffBadge, StaffNotice } from "@/components/staff/ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { listArticleAuthorOptionsClient } from "@/features/articles/client";
import type {
  ArticleAssignableAuthorDto,
  ArticleAuthorDto,
} from "@/features/articles/types";

type ArticleAuthorsPanelProps = {
  articleId: number;
  authors: ArticleAuthorDto[];
  selectedAuthorIds: string[];
  canManageAuthors: boolean;
  onChange: (authorIds: string[]) => void;
  mode?: "panel" | "compact";
};

function getAuthorLabel(author: {
  name: string | null;
  email: string;
}) {
  return author.name?.trim() || author.email;
}

export default function ArticleAuthorsPanel({
  articleId,
  authors,
  selectedAuthorIds,
  canManageAuthors,
  onChange,
  mode = "panel",
}: ArticleAuthorsPanelProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ArticleAssignableAuthorDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSet = useMemo(
    () => new Set(selectedAuthorIds),
    [selectedAuthorIds],
  );
  const originalAuthor = authors.find((author) => author.isOriginalAuthor) ?? null;
  const coAuthors = authors.filter((author) => !author.isOriginalAuthor);

  useEffect(() => {
    if (!open || !canManageAuthors) {
      return;
    }

    let isMounted = true;

    const loadOptions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await listArticleAuthorOptionsClient({
          articleId,
          q: search,
        });

        if (isMounted) {
          setOptions(result.items);
        }
      } catch (nextError: unknown) {
        if (isMounted) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Impossible de charger les auteurs disponibles.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, [articleId, canManageAuthors, open, search]);

  const handleToggleSelected = (userId: string, checked: boolean) => {
    if (!canManageAuthors) {
      return;
    }

    if (checked) {
      onChange([...selectedSet, userId]);
      return;
    }

    onChange(selectedAuthorIds.filter((value) => value !== userId));
  };

  const summaryLabel =
    coAuthors.length > 0
      ? `${coAuthors.length} co-auteur${coAuthors.length > 1 ? "s" : ""}`
      : "Aucun co-auteur";

  const authorContent = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-cobam-dark-blue">Co-auteurs</p>
          <p className="text-sm text-slate-500">
            Ajoutez des collaborateurs a l&apos;article sans disperser la gestion.
          </p>
        </div>

        <AnimatedUIButton
          type="button"
          variant="outline"
          size="sm"
          icon="plus"
          iconPosition="left"
          onClick={() => setOpen(true)}
          disabled={!canManageAuthors}
        >
          Gerer les auteurs
        </AnimatedUIButton>
      </div>

      {originalAuthor ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-cobam-dark-blue">
              Auteur d&apos;origine
            </p>
            <StaffBadge size="sm" color="blue">
              Principal
            </StaffBadge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-700">
              {getAuthorLabel(originalAuthor)}
            </p>
            <StaffBadge size="sm" color="default">
              {originalAuthor.roleLabel}
            </StaffBadge>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-cobam-dark-blue">
              Collaborateurs
            </p>
            <p className="text-sm text-slate-500">{summaryLabel}</p>
          </div>

          {coAuthors.length > 0 ? (
            <StaffBadge size="sm" color="default" icon="users">
              {coAuthors.length}
            </StaffBadge>
          ) : null}
        </div>

        {coAuthors.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {coAuthors.map((author) => (
              <StaffBadge
                key={author.id}
                size="sm"
                color={author.status === "BANNED" ? "amber" : "default"}
              >
                {getAuthorLabel(author)}
              </StaffBadge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Aucun co-auteur n&apos;est associe a cet article pour le moment.
          </p>
        )}
      </div>

      {!canManageAuthors ? (
        <StaffNotice variant="warning" title="Modification indisponible">
          Vous pouvez voir les auteurs, mais vous n&apos;avez pas la permission
          d&apos;en ajouter ou d&apos;en retirer sur cet article.
        </StaffNotice>
      ) : null}
    </div>
  );

  return (
    <>
      {mode === "compact" ? (
        <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
          {authorContent}
        </div>
      ) : (
        <Panel
          pretitle="Collaboration"
          title="Auteurs"
          description="Ajoutez des co-auteurs pour leur permettre d'ecrire l'article avec l'auteur d'origine."
        >
          {authorContent}
        </Panel>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(90vh,760px)] overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-200 px-6 pb-4 pt-6">
            <DialogTitle>Gerer les auteurs de l&apos;article</DialogTitle>
            <DialogDescription>
              Selectionnez les collaborateurs qui peuvent ecrire avec l&apos;auteur
              d&apos;origine.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-6 pb-6">
            <label className="mt-1 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un auteur par nom ou email"
                className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
              />
            </label>

            {coAuthors.length > 0 ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-cobam-dark-blue">
                  <Users className="h-4 w-4 text-cobam-water-blue" />
                  Auteurs actuellement ajoutes
                </div>
                <div className="flex flex-wrap gap-2">
                  {coAuthors.map((author) => (
                    <AnimatedUIButton
                      key={author.id}
                      type="button"
                      variant="light"
                      size="sm"
                      onClick={() => handleToggleSelected(author.id, false)}
                      disabled={!canManageAuthors}
                    >
                      Retirer {getAuthorLabel(author)}
                    </AnimatedUIButton>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="min-h-[18rem] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-16 animate-pulse rounded-2xl bg-slate-100"
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="p-4">
                  <StaffNotice variant="error" title="Chargement impossible">
                    {error}
                  </StaffNotice>
                </div>
              ) : options.length === 0 ? (
                <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500">
                  <UserPlus className="h-5 w-5 text-slate-400" />
                  <p>Aucun auteur disponible ne correspond à votre recherche.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {options.map((option) => {
                    const checked = selectedSet.has(option.id);

                    return (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-start gap-3 px-4 py-4 transition hover:bg-slate-50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextValue) =>
                            handleToggleSelected(option.id, nextValue === true)
                          }
                          className="mt-1"
                        />

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-cobam-dark-blue">
                              {getAuthorLabel(option)}
                            </p>
                            <StaffBadge size="sm" color="default">
                              {option.roleLabel}
                            </StaffBadge>
                            {option.status !== "ACTIVE" ? (
                              <StaffBadge size="sm" color="amber">
                                {option.status}
                              </StaffBadge>
                            ) : null}
                          </div>

                          <p className="truncate text-sm text-slate-500">
                            {option.email}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
