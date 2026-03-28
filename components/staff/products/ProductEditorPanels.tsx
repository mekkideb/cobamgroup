"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Sparkles, X } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import StaffBadge from "@/components/staff/ui/StaffBadge";
import {
  StaffEditorActionsPanel,
  StaffEditorInfoPanel,
  StaffEditorLayout,
} from "@/components/staff/ui";
import Panel from "@/components/staff/ui/Panel";
import PanelField from "@/components/staff/ui/PanelField";
import PanelInput from "@/components/staff/ui/PanelInput";
import StaffSearchSelect from "@/components/staff/ui/search-select";
import StaffSelect from "@/components/staff/ui/PanelSelect";
import StaffTagInput from "@/components/staff/ui/tag-input";
import BooleanButton from "../ui/BooleanButton";
import ProductMainImageField from "./ProductMainImageField";
import ProductVariantCard from "./ProductVariantCard";
import {
  PRODUCT_ATTRIBUTE_DATA_TYPE_OPTIONS,
  type ProductFormOptionsDto,
} from "@/features/products/types";
import type {
  ProductAttributeEditorState,
  ProductEditorFormState,
  ProductVariantEditorState,
} from "@/features/products/form";
import { getProductAttributeDataTypeLabel } from "@/features/products/attribute-values";
import { slugifyProductName } from "@/features/products/slug";

type EditableField = keyof ProductEditorFormState;
type EditableAttributeField = keyof ProductAttributeEditorState;
type EditableVariantField = keyof ProductVariantEditorState;

function RequirementRow({
  label,
  complete,
  optional = false,
}: {
  label: string;
  complete: boolean;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <StaffBadge
        size="sm"
        color={complete ? "success" : optional ? "default" : "warning"}
      >
        {complete ? "OK" : optional ? "Optionnel" : "À compléter"}
      </StaffBadge>
    </div>
  );
}

export default function ProductEditorPanels({
  mode,
  form,
  options,
  isSaving,
  isDeleting = false,
  onFieldChange,
  onAttributeAdd,
  onAttributeRemove,
  onAttributeChange,
  onVariantAdd,
  onVariantRemove,
  onVariantDuplicate,
  onVariantMove,
  onVariantChange,
  onVariantAttributeValueChange,
  onSave,
  onDelete,
  summary: rawSummary = {},
  sidebarFooter,
  disableSave = false,
}: {
  mode: "create" | "edit";
  form: ProductEditorFormState;
  options: ProductFormOptionsDto;
  isSaving: boolean;
  isDeleting?: boolean;
  onFieldChange: (
    field: EditableField,
    value: ProductEditorFormState[EditableField],
  ) => void;
  onAttributeAdd: () => void;
  onAttributeRemove: (formKey: string) => void;
  onAttributeChange: <Field extends EditableAttributeField>(
    formKey: string,
    field: Field,
    value: ProductAttributeEditorState[Field],
  ) => void;
  onVariantAdd: () => void;
  onVariantRemove: (formKey: string) => void;
  onVariantDuplicate: (formKey: string) => void;
  onVariantMove: (formKey: string, direction: "up" | "down") => void;
  onVariantChange: <Field extends EditableVariantField>(
    formKey: string,
    field: Field,
    value: ProductVariantEditorState[Field],
  ) => void;
  onVariantAttributeValueChange: (
    formKey: string,
    attributeFormKey: string,
    value: string,
  ) => void;
  onSave: () => void;
  onDelete?: () => void;
  summary?: {
    variantCount?: number;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  sidebarFooter?: ReactNode;
  disableSave?: boolean;
}) {
  const [openVariantKeys, setOpenVariantKeys] = useState<string[]>(() =>
    form.variants.slice(0, 1).map((variant) => variant.formKey),
  );
  const hasObservedVariantKeysRef = useRef(false);
  const previousVariantKeysRef = useRef<string[]>([]);

  const selectedProductSubcategories = useMemo(
    () =>
      options.productSubcategories.filter((item) =>
        form.productSubcategoryIds.includes(String(item.id)),
      ),
    [form.productSubcategoryIds, options.productSubcategories],
  );

  const remainingProductSubcategories = useMemo(
    () =>
      options.productSubcategories.filter(
        (item) => !form.productSubcategoryIds.includes(String(item.id)),
      ),
    [form.productSubcategoryIds, options.productSubcategories],
  );

  const selectedBrand = useMemo(
    () =>
      options.brands.find((brand) => String(brand.id) === form.brandId) ?? null,
    [form.brandId, options.brands],
  );

  const variantKeys = useMemo(
    () => form.variants.map((variant) => variant.formKey),
    [form.variants],
  );

  const normalizedOpenVariantKeys = useMemo(
    () => openVariantKeys.filter((key) => variantKeys.includes(key)),
    [openVariantKeys, variantKeys],
  );

  useEffect(() => {
    if (!hasObservedVariantKeysRef.current) {
      previousVariantKeysRef.current = variantKeys;
      hasObservedVariantKeysRef.current = true;
      return;
    }

    const previousVariantKeys = previousVariantKeysRef.current;
    const addedVariantKeys = variantKeys.filter(
      (variantKey) => !previousVariantKeys.includes(variantKey),
    );

    if (addedVariantKeys.length > 0) {
      setOpenVariantKeys((currentKeys) =>
        Array.from(new Set([...addedVariantKeys, ...currentKeys])),
      );
    }

    previousVariantKeysRef.current = variantKeys;
  }, [variantKeys]);

  const missingDependencies: string[] = [];
  if (options.productSubcategories.length === 0) {
    missingDependencies.push("au moins une sous-catégorie produit");
  }

  const requiredItems = [
    { label: "Nom de la famille", complete: form.name.trim().length > 0 },
    { label: "Slug", complete: form.slug.trim().length > 0 },
    {
      label: "Sous-catégorie liée",
      complete: form.productSubcategoryIds.length > 0,
    },
  ];

  const optionalItems = [
    { label: "Marque", complete: Boolean(form.brandId) },
    { label: "Image principale", complete: form.mainImage != null },
  ];

  const canSave =
    !disableSave &&
    missingDependencies.length === 0 &&
    requiredItems.every((item) => item.complete);

  const summary = {
    variantCount: rawSummary.variantCount,
    createdAt: rawSummary.createdAt ?? "",
    updatedAt: rawSummary.updatedAt ?? "",
  };
  const hasSummary =
    rawSummary.variantCount != null ||
    rawSummary.createdAt != null ||
    rawSummary.updatedAt != null;

  return (
    <StaffEditorLayout
      sidebar={
        <>
          <Panel
            pretitle="Média"
            title="Image principale"
            description="Optionnelle : elle illustre toute la famille produit."
          >
            <ProductMainImageField
              value={form.mainImage}
              onChange={(media) => onFieldChange("mainImage", media)}
            />
          </Panel>

          <StaffEditorActionsPanel
            mode={mode}
            onSave={onSave}
            isSaving={isSaving}
            saveDisabled={!canSave}
            onDelete={onDelete}
            isDeleting={isDeleting}
            description="Pour enregistrer, il suffit d’un nom, d’un slug et d’au moins une sous-catégorie. Le reste peut être complété plus tard."
            topContent={
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StaffBadge size="sm" color="default" icon="folder">
                    {form.productSubcategoryIds.length} sous-catégorie
                    {form.productSubcategoryIds.length > 1 ? "s" : ""}
                  </StaffBadge>
                  <StaffBadge size="sm" color="secondary" icon="package">
                    {form.variants.length} variante
                    {form.variants.length > 1 ? "s" : ""}
                  </StaffBadge>
                  <StaffBadge size="sm" color="info">
                    {form.attributes.length} attribut
                    {form.attributes.length > 1 ? "s" : ""}
                  </StaffBadge>
                  {form.isPromoted ? (
                    <StaffBadge size="sm" color="warning">En promotion</StaffBadge>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {requiredItems.map((item) => (
                    <RequirementRow key={item.label} label={item.label} complete={item.complete} />
                  ))}
                  {optionalItems.map((item) => (
                    <RequirementRow key={item.label} label={item.label} complete={item.complete} optional />
                  ))}
                </div>
              </div>
            }
          />

          <StaffEditorInfoPanel
            title="Aperçu rapide"
            description="Une vue compacte pour valider rapidement la structure de la famille."
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Nom affiché</p>
              <p className="mt-1 text-lg font-semibold text-cobam-dark-blue">{form.name.trim() || "Nom de la famille"}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Slug</p>
              <p className="mt-1 text-sm text-slate-600">{form.slug.trim() || "slug-famille"}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Marque</p>
              <p className="mt-1 text-sm text-slate-600">{selectedBrand?.name ?? "Aucune marque"}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedProductSubcategories.length > 0 ? (
                selectedProductSubcategories.slice(0, 4).map((subcategory) => (
                  <StaffBadge key={subcategory.id} size="sm" color="secondary" icon="folder">
                    {subcategory.categoryName} / {subcategory.name}
                  </StaffBadge>
                ))
              ) : (
                <StaffBadge size="sm" color="default">Aucune sous-catégorie</StaffBadge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <StaffBadge size="sm" color="default">
                {form.tagNames.length} tag{form.tagNames.length > 1 ? "s" : ""}
              </StaffBadge>
              <StaffBadge size="sm" color="secondary">
                {form.attributes.length} attribut
                {form.attributes.length > 1 ? "s" : ""}
              </StaffBadge>
              <StaffBadge size="sm" color="info" icon="image">
                {form.mainImage ? "Image ajoutée" : "Sans image"}
              </StaffBadge>
            </div>

            {hasSummary ? (
              <div className="flex flex-wrap gap-2">
                <StaffBadge size="sm" color="default" icon="package">
                  {summary.variantCount ?? form.variants.length} variante
                  {(summary.variantCount ?? form.variants.length) > 1 ? "s" : ""}
                </StaffBadge>
                {summary.createdAt ? (
                  <StaffBadge size="sm" color="default" icon="calendar">
                    Créé le {new Date(summary.createdAt).toLocaleDateString("fr-FR")}
                  </StaffBadge>
                ) : null}
                {summary.updatedAt ? (
                  <StaffBadge size="sm" color="info" icon="clock">
                    Mis à jour le {new Date(summary.updatedAt).toLocaleDateString("fr-FR")}
                  </StaffBadge>
                ) : null}
              </div>
            ) : null}
          </StaffEditorInfoPanel>

          {sidebarFooter}
        </>
      }
    >
      <Panel
        pretitle="Catalogue"
        title="Essentiels"
        description="Commencez par l’identité de la famille et son placement dans le catalogue."
      >
        <div className="space-y-6">
          {missingDependencies.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Ajoutez d’abord {missingDependencies.join(" et ")} pour pouvoir enregistrer cette famille produit.
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="space-y-4">
                <PanelField id="name" className="grid-cols" label="Nom" hint={`Slug : ${form.slug || "à générer"}`}>
                  <PanelInput
                    id="name"
                    fullWidth
                    value={form.name}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      onFieldChange("name", nextName);
                      if (form.slug === "" || form.slug === slugifyProductName(form.name)) {
                        onFieldChange("slug", slugifyProductName(nextName));
                      }
                    }}
                    placeholder="Ex. Collection Atlas"
                  />
                </PanelField>

              <div className="grid gap-4 lg:grid-cols-2">
                <PanelField id="subtitle" label="Sous-titre">
                  <PanelInput
                    id="subtitle"
                    fullWidth
                    value={form.subtitle}
                    onChange={(event) => onFieldChange("subtitle", event.target.value)}
                    placeholder="Ex. Robinetterie haut de gamme"
                  />
                </PanelField>

                <PanelField id="brandId" label="Marque">
                  <StaffSearchSelect
                    id="brandId"
                    fullWidth
                    value={form.brandId}
                    onValueChange={(value) => onFieldChange("brandId", value)}
                    emptyLabel="Aucune marque"
                    placeholder="Sélectionner une marque"
                    searchPlaceholder="Rechercher une marque..."
                    noResultsLabel="Aucune marque trouvée"
                    options={options.brands.map((option) => ({ value: String(option.id), label: option.name }))}
                    triggerClassName="h-12 rounded-2xl border-slate-300 px-4 text-base"
                  />
                </PanelField>
              </div>

              <PanelField id="excerpt" label="Accroche" hint="Une courte synthèse utile pour les cartes et les listings.">
                <Textarea
                  id="excerpt"
                  value={form.excerpt}
                  onChange={(event) => onFieldChange("excerpt", event.target.value)}
                  placeholder="Description de la famille produit..."
                  className="min-h-24 rounded-md border-slate-300 px-4 py-3 text-base"
                />
              </PanelField>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="space-y-4">

                <PanelField id="productSubcategoryIds" label="Sous-catégories" hint="Une famille peut appartenir à plusieurs sous-catégories.">
                  <div className="space-y-3">
                    <StaffSearchSelect
                      value=""
                      onValueChange={(value) => {
                        if (!value) {
                          return;
                        }

                        onFieldChange("productSubcategoryIds", [...form.productSubcategoryIds, value]);
                      }}
                      emptyLabel="Ajouter une sous-catégorie"
                      placeholder="Ajouter une sous-catégorie"
                      searchPlaceholder="Rechercher une sous-catégorie..."
                      noResultsLabel="Aucune autre sous-catégorie disponible"
                      options={remainingProductSubcategories.map((option) => ({ value: String(option.id), label: `${option.categoryName} / ${option.name}` }))}
                      fullWidth
                      disabled={options.productSubcategories.length === 0 || remainingProductSubcategories.length === 0}
                      triggerClassName="h-12 rounded-2xl border-slate-300 px-4 text-base"
                    />

                    {selectedProductSubcategories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedProductSubcategories.map((subcategory) => (
                          <button
                            key={subcategory.id}
                            type="button"
                            onClick={() => onFieldChange("productSubcategoryIds", form.productSubcategoryIds.filter((subcategoryId) => subcategoryId !== String(subcategory.id)))}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-cobam-dark-blue transition-colors hover:border-slate-300 hover:bg-slate-100"
                          >
                            <span>{subcategory.categoryName} / {subcategory.name}</span>
                            <X className="h-3.5 w-3.5 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                        Sélectionnez au moins une sous-catégorie pour enregistrer cette famille.
                      </div>
                    )}
                  </div>
                </PanelField>

                <div className="grid gap-4 lg:grid-cols-2">
                  <PanelField id="lifecycleStatus" label="Cycle de vie">
                    <StaffSelect
                      id="lifecycleStatus"
                      fullWidth
                      value={form.lifecycleStatus}
                      onValueChange={(value) => onFieldChange("lifecycleStatus", value as ProductEditorFormState["lifecycleStatus"])}
                      options={[{ value: "DRAFT", label: "Brouillon" }, { value: "ACTIVE", label: "Active" }, { value: "ARCHIVED", label: "Archivée" }]}
                      triggerClassName="h-12 rounded-2xl border-slate-300 px-4 text-base"
                    />
                  </PanelField>

                  <PanelField id="visibility" label="Visibilité">
                    <StaffSelect
                      id="visibility"
                      fullWidth
                      value={form.visibility}
                      onValueChange={(value) => onFieldChange("visibility", value as ProductEditorFormState["visibility"])}
                      options={[{ value: "HIDDEN", label: "Masquée" }, { value: "PUBLIC", label: "Publique" }]}
                      triggerClassName="h-12 rounded-2xl border-slate-300 px-4 text-base"
                    />
                  </PanelField>
                </div>

                <PanelField id="family-promoted" label="Promotion de la famille" hint="Activez cette option si la famille doit pouvoir apparaître dans la page Promotions.">
                  <BooleanButton id="family-promoted" checked={form.isPromoted} onClick={(checked: boolean) => onFieldChange("isPromoted", checked)} />
                </PanelField>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel pretitle="Contenu" title="Descriptions et repères" description="Gardez sous la main tout ce qui sert à vendre, référencer et retrouver la famille plus tard.">
        <div className="grid gap-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <PanelField id="description" label="Description">
              <Textarea
                id="description"
                value={form.description}
                onChange={(event) => onFieldChange("description", event.target.value)}
                placeholder="Description éditoriale, commerciale ou technique de la famille produit..."
                className="min-h-36 rounded-md border-slate-300 px-4 py-3 text-base"
              />
            </PanelField>

            <PanelField id="description-seo" label="Description SEO" hint="Une formulation courte et claire pour les moteurs de recherche.">
              <Textarea
                id="description-seo"
                value={form.descriptionSeo}
                onChange={(event) => onFieldChange("descriptionSeo", event.target.value)}
                placeholder="Résumé court optimisé pour les moteurs de recherche..."
                className="min-h-36 rounded-md border-slate-300 px-4 py-3 text-base"
              />
            </PanelField>
          </div>

          <PanelField id="product-tags" label="Tags" hint="Les tags facilitent la recherche et la maintenance du catalogue.">
            <StaffTagInput id="product-tags" value={form.tagNames} onChange={(nextTags) => onFieldChange("tagNames", nextTags)} placeholder="Ex. douche, mitigeur, laiton brossé" />
          </PanelField>
        </div>
      </Panel>
      <Panel pretitle="Variantes" title="Attributs partagés" description="Définissez ici ce que chaque variante devra pouvoir renseigner.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StaffBadge size="sm" color="secondary" icon="package">
                {form.attributes.length} attribut
                {form.attributes.length > 1 ? "s" : ""}
              </StaffBadge>
            </div>
            <AnimatedUIButton type="button" variant="outline" icon="plus" iconPosition="left" onClick={onAttributeAdd}>
              Attribut
            </AnimatedUIButton>
          </div>

          {form.attributes.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              Aucun attribut pour le moment.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {form.attributes.map((attribute, index) => (
                <div key={attribute.formKey} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-cobam-dark-blue">Attribut {index + 1}</p>
                      <p className="text-sm text-slate-500">Visible sur toutes les variantes de la famille.</p>
                    </div>
                    <AnimatedUIButton type="button" variant="light" color="error" icon="delete" iconPosition="left" onClick={() => onAttributeRemove(attribute.formKey)}>
                      Retirer
                    </AnimatedUIButton>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.8fr)]">
                    <PanelField id={`attribute-name-${attribute.formKey}`} label="Nom">
                      <PanelInput
                        fullWidth
                        id={`attribute-name-${attribute.formKey}`}
                        value={attribute.name}
                        onChange={(event) => onAttributeChange(attribute.formKey, "name", event.target.value)}
                        placeholder="Ex. Finition"
                      />
                    </PanelField>

                    <PanelField id={`attribute-type-${attribute.formKey}`} label="Type">
                      <StaffSelect
                        fullWidth
                        id={`attribute-type-${attribute.formKey}`}
                        value={attribute.dataType}
                        onValueChange={(value) => onAttributeChange(attribute.formKey, "dataType", value as ProductAttributeEditorState["dataType"])}
                        options={PRODUCT_ATTRIBUTE_DATA_TYPE_OPTIONS.map((option) => ({ value: option, label: getProductAttributeDataTypeLabel(option) }))}
                      />
                    </PanelField>

                    <PanelField id={`attribute-unit-${attribute.formKey}`} label="Unité" hint={attribute.dataType === "NUMBER" ? "Optionnelle" : "Utilisée surtout pour les valeurs numériques"}>
                      <PanelInput
                        fullWidth
                        id={`attribute-unit-${attribute.formKey}`}
                        value={attribute.unit}
                        onChange={(event) => onAttributeChange(attribute.formKey, "unit", event.target.value)}
                        placeholder="Ex. mm"
                      />
                    </PanelField>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      <Panel
        pretitle="Variantes"
        title="Références de la famille"
        description="Travaillez vos variantes dans des cartes compactes, dupliquez-les vite et réorganisez-les directement dans la liste."
        allowOverflow
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StaffBadge size="sm" color="secondary" icon="package">
                {form.variants.length} variante
                {form.variants.length > 1 ? "s" : ""}
              </StaffBadge>
              <StaffBadge size="sm" color="default">Saisie compacte</StaffBadge>
              <StaffBadge size="sm" color="info">Ordre éditable</StaffBadge>
            </div>

            <AnimatedUIButton type="button" variant="outline" icon="plus" iconPosition="left" onClick={onVariantAdd}>
              Variante
            </AnimatedUIButton>
          </div>

          {form.variants.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              Aucune variante pour le moment. Ajoutez-en une première pour commencer à structurer la famille.
            </div>
          ) : (
            <Accordion type="multiple" value={normalizedOpenVariantKeys} onValueChange={(value) => setOpenVariantKeys(value as string[])} className="gap-4">
              {form.variants.map((variant, index) => (
                <ProductVariantCard
                  isOpen={openVariantKeys.includes(variant.formKey)}
                  key={variant.formKey}
                  variant={variant}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === form.variants.length - 1}
                  attributes={form.attributes}
                  onVariantRemove={onVariantRemove}
                  onVariantDuplicate={onVariantDuplicate}
                  onVariantMove={onVariantMove}
                  onVariantChange={onVariantChange}
                  onVariantAttributeValueChange={onVariantAttributeValueChange}
                />
              ))}
            </Accordion>
          )}
        </div>
      </Panel>
    </StaffEditorLayout>
  );
}
