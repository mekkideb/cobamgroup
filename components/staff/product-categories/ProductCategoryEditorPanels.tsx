"use client";

import { Trash2 } from "lucide-react";
import MediaImageField from "@/components/staff/media/importers/media-image-field";
import ImagePreview from "@/components/staff/media/importers/ImagePreview";
import Panel from "@/components/staff/ui/Panel";
import PanelField from "@/components/staff/ui/PanelField";
import PanelInput from "@/components/staff/ui/PanelInput";
import {
  StaffBadge,
  StaffEditorActionsPanel,
  StaffEditorInfoPanel,
  StaffEditorLayout,
} from "@/components/staff/ui";
import StaffSelect from "@/components/staff/ui/PanelSelect";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { Textarea } from "@/components/ui/textarea";
import type {
  ProductCategoryEditorFormState,
  ProductSubcategoryEditorState,
} from "@/features/product-categories/form";

type EditableField = keyof ProductCategoryEditorFormState;
type EditableSubcategoryField = keyof ProductSubcategoryEditorState;

function buildExcerpt(value: string, maxLength = 140) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}...`;
}

export default function ProductCategoryEditorPanels({
  mode,
  form,
  isSaving,
  isDeleting = false,
  onFieldChange,
  onSubcategoryAdd,
  onSubcategoryRemove,
  onSubcategoryChange,
  onSave,
  onDelete,
  summary,
  disableSave = false,
}: {
  mode: "create" | "edit";
  form: ProductCategoryEditorFormState;
  isSaving: boolean;
  isDeleting?: boolean;
  onFieldChange: (
    field: EditableField,
    value: ProductCategoryEditorFormState[EditableField],
  ) => void;
  onSubcategoryAdd: () => void;
  onSubcategoryRemove: (formKey: string) => void;
  onSubcategoryChange: <Field extends EditableSubcategoryField>(
    formKey: string,
    field: Field,
    value: ProductSubcategoryEditorState[Field],
  ) => void;
  onSave: () => void;
  onDelete?: () => void;
  summary?: {
    subcategoryCount?: number;
    productFamilyCount?: number;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  disableSave?: boolean;
}) {
  const previewDescription =
    buildExcerpt(form.description) ?? buildExcerpt(form.descriptionSeo);
  const hasImage = form.imageMediaId != null;

  return (
    <StaffEditorLayout
      sidebar={
        <>
          <StaffEditorActionsPanel
            mode={mode}
            onSave={onSave}
            isSaving={isSaving}
            saveDisabled={disableSave}
            onDelete={onDelete}
            isDeleting={isDeleting}
            description="Retrouvez ici les actions principales de cette catégorie."
          />

          <StaffEditorInfoPanel description="Contrôlez la structure finale avant validation.">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Nom affiché
              </p>
              <p className="mt-1 text-lg font-semibold text-cobam-dark-blue">
                {form.name.trim() || "Nom de la catégorie"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Slug
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {form.slug.trim() || "slug-categorie"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StaffBadge size="sm" color={form.isActive ? "green" : "default"}>
                {form.isActive ? "Active" : "Inactive"}
              </StaffBadge>

              <StaffBadge size="sm" color="secondary" icon="folder">
                {summary?.subcategoryCount ?? form.subcategories.length} sous-catégorie
                {(summary?.subcategoryCount ?? form.subcategories.length) > 1
                  ? "s"
                  : ""}
              </StaffBadge>

              <StaffBadge size="sm" color="green" icon="package">
                {summary?.productFamilyCount ?? 0} famille
                {(summary?.productFamilyCount ?? 0) > 1 ? "s" : ""}
              </StaffBadge>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Média
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {hasImage ? "Image configurée" : "Aucune image"}
              </p>
              {hasImage ? (
                <div className="mt-3">
                  <ImagePreview
                    mediaId={form.imageMediaId}
                    alt="Image de catégorie"
                    className="h-24 w-24 rounded-2xl"
                  />
                </div>
              ) : null}
            </div>

            {previewDescription ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Aperçu éditorial
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {previewDescription}
                </p>
              </div>
            ) : null}

            {summary?.updatedAt ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Dernière mise à jour
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {new Date(summary.updatedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
            ) : null}

            {!summary?.updatedAt && summary?.createdAt ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Créée le
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {new Date(summary.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
            ) : null}
          </StaffEditorInfoPanel>
        </>
      }
    >
      <Panel
        pretitle="Édition"
        title="Catégorie racine"
        description="Une catégorie produit est toujours au niveau racine et regroupe explicitement ses sous-catégories."
      >
        <div className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <PanelField id="category-name" label="Nom">
              <PanelInput
                id="category-name"
                fullWidth
                value={form.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                placeholder="Ex. Robinetterie"
              />
            </PanelField>

            <PanelField id="category-subtitle" label="Sous-titre">
              <PanelInput
                id="category-subtitle"
                fullWidth
                value={form.subtitle}
                onChange={(event) => onFieldChange("subtitle", event.target.value)}
                placeholder="Ex. Cuisine, salle de bain et accessoires"
              />
            </PanelField>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <PanelField id="category-slug" label="Slug">
              <PanelInput
                id="category-slug"
                fullWidth
                value={form.slug}
                onChange={(event) => onFieldChange("slug", event.target.value)}
                placeholder="robinetterie"
              />
            </PanelField>

            <PanelField id="category-sort-order" label="Ordre d'affichage">
              <PanelInput
                id="category-sort-order"
                type="number"
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(event) => onFieldChange("sortOrder", event.target.value)}
                placeholder="0"
              />
            </PanelField>

            <PanelField id="category-status" label="État">
              <StaffSelect
                id="category-status"
                fullWidth
                value={String(form.isActive)}
                onValueChange={(value) => onFieldChange("isActive", value === "true")}
                options={[
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" },
                ]}
              />
            </PanelField>
          </div>

          <MediaImageField
            label="Image principale"
            description="Cette image représente la catégorie racine dans le catalogue et les menus publics."
            dialogTitle="Choisir l'image de catégorie"
            dialogDescription="Parcourez la médiathèque pour choisir l'image principale de cette catégorie."
            mediaId={form.imageMediaId}
            onChange={(value) => onFieldChange("imageMediaId", value)}
          />

          <PanelField
            id="category-description"
            label="Description"
            hint="Texte éditorial principal de la catégorie."
          >
            <Textarea
              id="category-description"
              value={form.description}
              onChange={(event) => onFieldChange("description", event.target.value)}
              placeholder="Description de la catégorie..."
              className="min-h-32 rounded-md border-slate-300 px-4 py-3 text-base"
            />
          </PanelField>

          <PanelField
            id="category-description-seo"
            label="Description SEO"
            hint="Résumé court optimisé pour les moteurs de recherche."
          >
            <Textarea
              id="category-description-seo"
              value={form.descriptionSeo}
              onChange={(event) => onFieldChange("descriptionSeo", event.target.value)}
              placeholder="Résumé SEO de la catégorie..."
              className="min-h-24 rounded-md border-slate-300 px-4 py-3 text-base"
            />
          </PanelField>
        </div>
      </Panel>

      <Panel
        pretitle="Structure"
        title="Sous-catégories"
        description="Les produits se rattachent toujours aux sous-catégories, jamais directement à la catégorie racine."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <StaffBadge size="sm" color="secondary" icon="folder">
                {form.subcategories.length} sous-catégorie
                {form.subcategories.length > 1 ? "s" : ""}
              </StaffBadge>
            </div>

            <AnimatedUIButton
              type="button"
              variant="outline"
              icon="plus"
              iconPosition="left"
              onClick={onSubcategoryAdd}
            >
              Ajouter une sous-catégorie
            </AnimatedUIButton>
          </div>

          {form.subcategories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-center text-sm text-slate-500">
              Aucune sous-catégorie pour le moment.
            </div>
          ) : (
            <div className="space-y-4">
              {form.subcategories.map((subcategory, index) => (
                <div
                  key={subcategory.formKey}
                  className="rounded-[22px] border border-slate-200 bg-slate-50/60 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-cobam-dark-blue">
                        Sous-catégorie {index + 1}
                      </p>
                      <p className="text-xs text-slate-500">
                        Rattachement direct des familles produit.
                      </p>
                    </div>

                    <AnimatedUIButton
                      type="button"
                      variant="light"
                      color="error"
                      onClick={() => onSubcategoryRemove(subcategory.formKey)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Retirer
                      </span>
                    </AnimatedUIButton>
                  </div>

                  <div className="mt-5 grid gap-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <PanelField
                        id={`subcategory-name-${subcategory.formKey}`}
                        label="Nom"
                      >
                        <PanelInput
                          id={`subcategory-name-${subcategory.formKey}`}
                          fullWidth
                          value={subcategory.name}
                          onChange={(event) =>
                            onSubcategoryChange(
                              subcategory.formKey,
                              "name",
                              event.target.value,
                            )
                          }
                          placeholder="Ex. Mitigeurs de cuisine"
                        />
                      </PanelField>

                      <PanelField
                        id={`subcategory-subtitle-${subcategory.formKey}`}
                        label="Sous-titre"
                      >
                        <PanelInput
                          id={`subcategory-subtitle-${subcategory.formKey}`}
                          fullWidth
                          value={subcategory.subtitle}
                          onChange={(event) =>
                            onSubcategoryChange(
                              subcategory.formKey,
                              "subtitle",
                              event.target.value,
                            )
                          }
                          placeholder="Ex. Douchettes et colonnes"
                        />
                      </PanelField>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                      <PanelField
                        id={`subcategory-slug-${subcategory.formKey}`}
                        label="Slug"
                      >
                        <PanelInput
                          id={`subcategory-slug-${subcategory.formKey}`}
                          fullWidth
                          value={subcategory.slug}
                          onChange={(event) =>
                            onSubcategoryChange(
                              subcategory.formKey,
                              "slug",
                              event.target.value,
                            )
                          }
                          placeholder="mitigeurs-cuisine"
                        />
                      </PanelField>

                      <PanelField
                        id={`subcategory-sort-order-${subcategory.formKey}`}
                        label="Ordre d'affichage"
                      >
                        <PanelInput
                          id={`subcategory-sort-order-${subcategory.formKey}`}
                          type="number"
                          inputMode="numeric"
                          value={subcategory.sortOrder}
                          onChange={(event) =>
                            onSubcategoryChange(
                              subcategory.formKey,
                              "sortOrder",
                              event.target.value,
                            )
                          }
                          placeholder={String(index)}
                        />
                      </PanelField>

                      <PanelField
                        id={`subcategory-status-${subcategory.formKey}`}
                        label="État"
                      >
                        <StaffSelect
                          id={`subcategory-status-${subcategory.formKey}`}
                          fullWidth
                          value={String(subcategory.isActive)}
                          onValueChange={(value) =>
                            onSubcategoryChange(
                              subcategory.formKey,
                              "isActive",
                              value === "true",
                            )
                          }
                          options={[
                            { value: "true", label: "Active" },
                            { value: "false", label: "Inactive" },
                          ]}
                        />
                      </PanelField>
                    </div>

                    <MediaImageField
                      label="Image de sous-catégorie"
                      description="Image utilisée pour cette sous-catégorie en particulier."
                      dialogTitle="Choisir l'image de sous-catégorie"
                      dialogDescription="Choisissez une image dédiée à cette sous-catégorie."
                      mediaId={subcategory.imageMediaId}
                      onChange={(value) =>
                        onSubcategoryChange(
                          subcategory.formKey,
                          "imageMediaId",
                          value,
                        )
                      }
                    />

                    <div className="grid gap-6 lg:grid-cols-2">
                      <PanelField
                        id={`subcategory-description-${subcategory.formKey}`}
                        label="Description"
                      >
                        <Textarea
                          id={`subcategory-description-${subcategory.formKey}`}
                          value={subcategory.description}
                          onChange={(event) =>
                            onSubcategoryChange(
                              subcategory.formKey,
                              "description",
                              event.target.value,
                            )
                          }
                          placeholder="Description de la sous-catégorie..."
                          className="min-h-28 rounded-md border-slate-300 px-4 py-3 text-base"
                        />
                      </PanelField>

                      <PanelField
                        id={`subcategory-description-seo-${subcategory.formKey}`}
                        label="Description SEO"
                      >
                        <Textarea
                          id={`subcategory-description-seo-${subcategory.formKey}`}
                          value={subcategory.descriptionSeo}
                          onChange={(event) =>
                            onSubcategoryChange(
                              subcategory.formKey,
                              "descriptionSeo",
                              event.target.value,
                            )
                          }
                          placeholder="Résumé SEO de la sous-catégorie..."
                          className="min-h-28 rounded-md border-slate-300 px-4 py-3 text-base"
                        />
                      </PanelField>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>
    </StaffEditorLayout>
  );
}
