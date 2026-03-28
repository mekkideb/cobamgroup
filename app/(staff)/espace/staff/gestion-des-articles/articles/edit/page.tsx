"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import ArticleAuthorsPanel from "@/components/staff/articles/article-authors-panel";
import ArticleRichTextEditor from "@/components/staff/articles/article-rich-text-editor";
import AutosaveIndicator from "@/components/staff/articles/AutosaveIndicator";
import SeoChecks from "@/components/staff/articles/SeoChecks";
import MediaImageField from "@/components/staff/media/importers/media-image-field";
import Panel from "@/components/staff/ui/Panel";
import PanelField from "@/components/staff/ui/PanelField";
import PanelInput from "@/components/staff/ui/PanelInput";
import {
  StaffBadge,
  StaffEditorActionsPanel,
  StaffEditorInfoPanel,
  StaffEditorLayout,
  StaffNotice,
  StaffPageHeader,
  StaffSearchSelect,
  StaffStateCard,
  StaffTagInput,
  UnsavedChangesGuard,
} from "@/components/staff/ui";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { Textarea } from "@/components/ui/textarea";
import { useArticleCategoryOptions } from "@/features/article-categories/hooks/use-article-category-options";
import { useArticleEditor } from "@/features/articles/hooks/use-article-editor";

function LoadingState() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
}

function ArticleEditPageContent() {
  const params = useSearchParams();
  const rawId = params.get("id");
  const articleId = useMemo(() => {
    if (!rawId) {
      return null;
    }

    const parsed = Number(rawId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [rawId]);

  const editor = useArticleEditor(articleId);
  const {
    items: articleCategories,
    isLoading: isLoadingArticleCategories,
    error: articleCategoryOptionsError,
  } = useArticleCategoryOptions(true);

  if (editor.isLoadingInitial) {
    return <LoadingState />;
  }

  if (editor.error && editor.mode === "edit" && !editor.article) {
    return (
      <StaffStateCard
        title="Erreur"
        description={editor.error}
        actionHref="/espace/staff/gestion-des-articles/articles"
        actionLabel="Retour aux articles"
      />
    );
  }

  const isPublished = editor.state.status === "published";
  const articleAbilities = editor.article?.abilities ?? null;
  const canEditArticle =
    editor.mode === "create" ? true : Boolean(articleAbilities?.canEdit);
  const canManageAuthors =
    editor.mode === "edit" && Boolean(articleAbilities?.canManageAuthors);
  const canDeleteArticle =
    editor.mode === "edit" && Boolean(articleAbilities?.canDelete);
  const canPublishArticle =
    editor.mode === "create" ? true : Boolean(articleAbilities?.canPublish);

  const handleDeleteArticle = () => {
    if (!canDeleteArticle || editor.isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      "Supprimer définitivement cet article ? Cette action est irréversible.",
    );

    if (confirmed) {
      void editor.deleteArticle();
    }
  };

  return (
    <div className="space-y-6">
      <UnsavedChangesGuard
        isDirty={editor.isDirty}
        onSaveAndContinue={async () => Boolean(await editor.save())}
      />

      <StaffPageHeader
        eyebrow="Articles"
        title={editor.mode === "create" ? "Nouvel article" : "Modifier l'article"}
        actions={
          <AutosaveIndicator
            isDirty={editor.isDirty}
            isSubmitting={editor.isSaving}
            lastSavedAt={editor.lastSavedAt}
          />
        }
      />

      {editor.error ? (
        <StaffNotice variant="error" title="Opération impossible">
          {editor.error}
        </StaffNotice>
      ) : null}

      {editor.notice ? (
        <StaffNotice variant="success" title="Opération terminée">
          {editor.notice}
        </StaffNotice>
      ) : null}

      {editor.mode === "edit" && !canEditArticle && canManageAuthors ? (
        <StaffNotice variant="warning" title="Édition limitée">
          Vous pouvez gérer les auteurs de cet article, mais le contenu et la
          publication restent en lecture seule pour votre compte.
        </StaffNotice>
      ) : null}

      <StaffEditorLayout
        sidebar={
          <>
            <StaffEditorActionsPanel
              mode={editor.mode === "create" ? "create" : "edit"}
              onSave={() => void editor.save()}
              isSaving={editor.isSaving}
              saveDisabled={!canEditArticle && !canManageAuthors}
              onDelete={canDeleteArticle ? handleDeleteArticle : undefined}
              isDeleting={editor.isDeleting}
              description="Retrouvez ici la sauvegarde, la publication et la gestion des co-auteurs."
              topContent={
                <div className="flex flex-wrap items-center gap-2">
                  <StaffBadge
                    size="sm"
                    color={isPublished ? "green" : "default"}
                    icon={isPublished ? "badge-check" : "file-text"}
                  >
                    {isPublished ? "Publié" : "Brouillon"}
                  </StaffBadge>
                  {canEditArticle ? (
                    <StaffBadge size="sm" color="info" icon="none">
                      Édition du contenu
                    </StaffBadge>
                  ) : null}
                </div>
              }
            >
              <div className="grid gap-3">
                {!isPublished && canPublishArticle ? (
                  <AnimatedUIButton
                    type="button"
                    variant="secondary"
                    icon="globe"
                    iconPosition="left"
                    loading={editor.isPublishing}
                    loadingText="Publication..."
                    onClick={() => void editor.publish()}
                    className="w-full"
                  >
                    Publier
                  </AnimatedUIButton>
                ) : null}

                {isPublished && canPublishArticle ? (
                  <AnimatedUIButton
                    type="button"
                    variant="outline"
                    icon="eye-off"
                    iconPosition="left"
                    loading={editor.isUnpublishing}
                    loadingText="Dépublication..."
                    onClick={() => void editor.unpublish()}
                    className="w-full"
                  >
                    Repasser en brouillon
                  </AnimatedUIButton>
                ) : null}
              </div>

            </StaffEditorActionsPanel>

            <StaffEditorInfoPanel description="Repères rapides sur cet article et son état actuel.">
              <div className="flex flex-wrap gap-2">
                <StaffBadge size="sm" color="secondary" icon="folder">
                  {editor.state.categoryAssignments.length} catégorie
                  {editor.state.categoryAssignments.length > 1 ? "s" : ""}
                </StaffBadge>
                <StaffBadge size="sm" color="default" icon="tag">
                  {editor.state.tagNames.length} tag
                  {editor.state.tagNames.length > 1 ? "s" : ""}
                </StaffBadge>
                {editor.article ? (
                  <StaffBadge size="sm" color="info" icon="users">
                    {editor.article.authors.length} auteur
                    {editor.article.authors.length > 1 ? "s" : ""}
                  </StaffBadge>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Slug
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {editor.state.slug || "slug-de-l-article"}
                </p>
              </div>

              {editor.article ? (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Créé le
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {new Date(editor.article.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Dernière mise à jour
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {new Date(editor.article.updatedAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </>
              ) : null}
            </StaffEditorInfoPanel>
          </>
        }
      >
        <Panel
          pretitle="Article"
          title="Identité éditoriale"
          description="Regroupez ici le titre, l'affichage, les catégories et le visuel."
        >
          <div className="grid gap-6">
            <PanelField id="article-title" label="Titre interne">
              <PanelInput
                id="article-title"
                value={editor.state.title}
                onChange={(event) => editor.setField("title", event.target.value)}
                placeholder="Titre de l'article"
                disabled={!canEditArticle}
                fullWidth
              />
            </PanelField>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
              <PanelField id="article-display-title" label="Titre affiché">
                <PanelInput
                  id="article-display-title"
                  value={editor.state.displayTitle}
                  onChange={(event) =>
                    editor.setField("displayTitle", event.target.value)
                  }
                  placeholder="Titre visible"
                  disabled={!canEditArticle}
                  fullWidth
                />
              </PanelField>

              <PanelField id="article-slug" label="Slug">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <PanelInput
                    id="article-slug"
                    value={editor.state.slug}
                    onChange={(event) => editor.setField("slug", event.target.value)}
                    placeholder="slug-de-l-article"
                    disabled={!canEditArticle}
                    fullWidth
                  />
                  <AnimatedUIButton
                    type="button"
                    variant="outline"
                    icon="restart"
                    iconPosition="left"
                    onClick={editor.generateSlugFromTitle}
                    disabled={!canEditArticle}
                  >
                    Générer
                  </AnimatedUIButton>
                </div>
              </PanelField>
            </div>

            <PanelField
              id="article-categories"
              label="Catégories d'articles"
              hint="Ajoutez une ou plusieurs catégories. Les scores restent libres pendant l'édition puis sont normalisés à 100% à l'enregistrement."
            >
              <div className="space-y-4">
                {editor.state.categoryAssignments.length > 0 ? (
                  editor.state.categoryAssignments.map((assignment, index) => {
                    const selectedIds = editor.state.categoryAssignments
                      .map((item, itemIndex) =>
                        itemIndex === index ? null : item.categoryId,
                      )
                      .filter(Boolean);

                    const options = articleCategories.map((category) => ({
                      value: String(category.id),
                      label: category.name,
                      disabled: selectedIds.includes(String(category.id)),
                    }));

                    if (
                      assignment.categoryId &&
                      !options.some(
                        (option) => option.value === assignment.categoryId,
                      )
                    ) {
                      options.unshift({
                        value: assignment.categoryId,
                        label: `Catégorie indisponible (#${assignment.categoryId})`,
                        disabled: false,
                      });
                    }

                    const selectedCategory = articleCategories.find(
                      (category) => String(category.id) === assignment.categoryId,
                    );

                    return (
                      <div
                        key={assignment.rowId}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-50/75 p-4"
                      >
                        {selectedCategory ? (
                          <span
                            className="h-4 w-4 rounded-full border border-slate-200"
                            style={{ backgroundColor: selectedCategory.color }}
                            aria-hidden="true"
                          />
                        ) : null}

                        <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_120px] lg:items-center">
                          <StaffSearchSelect
                            value={assignment.categoryId}
                            onValueChange={(value) =>
                              editor.setCategoryAssignmentCategory(index, value)
                            }
                            emptyLabel="Choisir une catégorie"
                            options={options}
                            disabled={!canEditArticle || isLoadingArticleCategories}
                            fullWidth
                            searchPlaceholder="Rechercher une catégorie..."
                            noResultsLabel="Aucune catégorie trouvée"
                          />

                          <div className="flex items-center gap-2">
                            <PanelInput
                              type="number"
                              min={1}
                              max={100}
                              step={1}
                              value={assignment.score}
                              onChange={(event) => {
                                const parsed = Number(event.target.value);
                                editor.setCategoryAssignmentScore(
                                  index,
                                  Number.isFinite(parsed) ? parsed : assignment.score,
                                );
                              }}
                              disabled={!canEditArticle}
                            />
                            <span className="text-sm font-semibold text-slate-500">
                              %
                            </span>
                          </div>
                        </div>

                        <AnimatedUIButton
                          type="button"
                          size="sm"
                          variant="ghost"
                          icon="close"
                          onClick={() => editor.removeCategoryAssignment(index)}
                          disabled={!canEditArticle}
                          className="opacity-50"
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">
                    Aucune catégorie liée pour le moment.
                  </div>
                )}

                <AnimatedUIButton
                  type="button"
                  variant="outline"
                  icon="plus"
                  iconPosition="left"
                  onClick={editor.addCategoryAssignment}
                  disabled={!canEditArticle || isLoadingArticleCategories}
                  size="md"
                  className="w-full py-5"
                >
                  Ajouter une catégorie
                </AnimatedUIButton>

                {articleCategoryOptionsError ? (
                  <p className="text-sm leading-6 text-amber-700">
                    {articleCategoryOptionsError}
                  </p>
                ) : null}
              </div>
            </PanelField>

            <div className="self-start">
              <MediaImageField
                label="Image principale"
                description="Cette image sert de couverture d'article et de repère éditorial."
                dialogTitle="Choisir l'image principale"
                dialogDescription="Sélectionnez une image 16:9 depuis la médiathèque ou importez-en une nouvelle."
                mediaId={
                  editor.state.coverMediaId ? Number(editor.state.coverMediaId) : null
                }
                onChange={(value) =>
                  editor.setField("coverMediaId", value ? String(value) : "")
                }
                aspectRatio="16:9"
                disabled={!canEditArticle}
              />
            </div>
          </div>
        </Panel>

        <Panel
          pretitle="Collaboration"
          title="Auteurs"
          description="Gérez ici l'auteur principal et les co-auteurs de cet article."
        >
          {editor.mode === "edit" && editor.article ? (
            <ArticleAuthorsPanel
              articleId={editor.article.id}
              authors={editor.article.authors}
              selectedAuthorIds={editor.state.authorIds}
              canManageAuthors={canManageAuthors}
              onChange={(authorIds) => editor.setField("authorIds", authorIds)}
              mode="compact"
            />
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">
              Sauvegardez d&apos;abord l&apos;article pour gérer ensuite les
              co-auteurs.
            </div>
          )}
        </Panel>

        <Panel pretitle="Contenu" title="Rédaction de l'article" allowOverflow>
          <div className="grid gap-6">
            <PanelField id="article-excerpt" label="Extrait">
              <Textarea
                id="article-excerpt"
                value={editor.state.excerpt}
                onChange={(event) => editor.setField("excerpt", event.target.value)}
                rows={4}
                placeholder="Résumé court de l'article..."
                disabled={!canEditArticle}
                className="min-h-32 !rounded-none !rounded-t-2xl border-slate-300 px-4 py-3 text-base"
              />
            </PanelField>

            <ArticleRichTextEditor
              editorId="article-content"
              value={editor.state.content}
              onChange={(value) => editor.setField("content", value)}
              placeholder="Commencez à écrire votre article..."
              editable={canEditArticle}
            />

            <PanelField id="article-tags" label="Tags">
              <StaffTagInput
                value={editor.state.tagNames}
                onChange={(nextTags) => editor.setField("tagNames", nextTags)}
                placeholder="Ex. robinetterie premium"
                disabled={!canEditArticle}
                className="!rounded-none !rounded-b-2xl p-6"
              />
            </PanelField>
          </div>
        </Panel>

        <Panel
          pretitle="SEO et classement"
          title="Référencement et tags"
          description="Gardez le référencement et les mots-clés dans un seul bloc compact."
        >
          <div className="grid gap-5">
            <PanelField id="article-focus-keyword" label="Mot-clé principal">
              <PanelInput
                id="article-focus-keyword"
                value={editor.state.focusKeyword}
                onChange={(event) =>
                  editor.setField("focusKeyword", event.target.value)
                }
                placeholder="mot-cle-principal"
                disabled={!canEditArticle}
                fullWidth
              />
            </PanelField>

            <PanelField id="article-description-seo" label="Description SEO">
              <Textarea
                id="article-description-seo"
                value={editor.state.descriptionSeo}
                onChange={(event) =>
                  editor.setField("descriptionSeo", event.target.value)
                }
                rows={4}
                placeholder="Description pour les moteurs de recherche..."
                disabled={!canEditArticle}
                className="min-h-[120px] rounded-2xl border-slate-300 px-4 py-3 text-base"
              />
            </PanelField>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
              <SeoChecks
                title={editor.state.title}
                slug={editor.state.slug}
                description={editor.state.descriptionSeo}
                content={editor.state.content}
                focusKeyword={editor.state.focusKeyword}
              />
            </div>
          </div>
        </Panel>
      </StaffEditorLayout>
    </div>
  );
}

export default function ArticleEditPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ArticleEditPageContent />
    </Suspense>
  );
}
