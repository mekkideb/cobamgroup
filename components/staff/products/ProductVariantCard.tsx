"use client";

import { ChevronDown, ChevronUp, Copy, Link2, Unlink2 } from "lucide-react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { getProductAttributeDataTypeLabel } from "@/features/products/attribute-values";
import type {
  ProductAttributeEditorState,
  ProductVariantEditorState,
} from "@/features/products/form";
import { slugifyProductReference } from "@/features/products/slug";
import BooleanButton from "../ui/BooleanButton";
import PanelField from "../ui/PanelField";
import PanelInput from "../ui/PanelInput";
import StaffBadge from "../ui/StaffBadge";
import StaffSelect from "../ui/PanelSelect";
import ProductMediaGrid from "./ProductMediaGrid";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type EditableVariantField = keyof ProductVariantEditorState;

function getAttributePlaceholder(attribute: ProductAttributeEditorState) {
  switch (attribute.dataType) {
    case "NUMBER":
      return attribute.unit ? `Valeur en ${attribute.unit}` : "Valeur numérique";
    case "BOOLEAN":
      return "Choisir Oui ou Non";
    case "ENUM":
      return "Ex. mat";
    case "COLOR":
      return "#0a8dc1";
    case "JSON":
      return '{"cle":"valeur"}';
    case "TEXT":
    default:
      return "Saisir une valeur";
  }
}

function getLifecycleBadge(status: ProductVariantEditorState["lifecycleStatus"]) {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", color: "success" as const };
    case "ARCHIVED":
      return { label: "Archivée", color: "warning" as const };
    case "DRAFT":
    default:
      return { label: "Brouillon", color: "default" as const };
  }
}

function getVisibilityBadge(visibility: ProductVariantEditorState["visibility"]) {
  return visibility === "PUBLIC"
    ? { label: "Publique", color: "info" as const }
    : { label: "Masquée", color: "default" as const };
}

function getCommercialModeBadge(
  commercialMode: ProductVariantEditorState["commercialMode"],
) {
  switch (commercialMode) {
    case "SELLABLE":
      return { label: "Vendable", color: "success" as const };
    case "QUOTE_ONLY":
      return { label: "Sur demande", color: "amber" as const };
    case "REFERENCE_ONLY":
    default:
      return { label: "Référence", color: "secondary" as const };
  }
}

function formatVariantPrice(variant: ProductVariantEditorState) {
  const effective = variant.currentPriceAmount || variant.basePriceAmount;
  return effective ? `${effective} TND` : "Sans prix";
}

function VariantAttributeField({
  variant,
  attribute,
  value,
  onChange,
}: {
  variant: ProductVariantEditorState;
  attribute: ProductAttributeEditorState;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `variant-attribute-${variant.formKey}-${attribute.formKey}`;

  if (attribute.dataType === "BOOLEAN") {
    return (
      <PanelField id={id} label={attribute.name}>
        <BooleanButton
          id={id}
          checked={value === "true"}
          onClick={(checked: boolean) => onChange(checked ? "true" : "false")}
        />
      </PanelField>
    );
  }

  if (attribute.dataType === "JSON") {
    return (
      <PanelField id={id} label={attribute.name}>
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={getAttributePlaceholder(attribute)}
          className="min-h-24 rounded-md border-slate-300 px-4 py-3 text-base"
        />
      </PanelField>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <PanelInput
        fullWidth
        id={id}
        type={attribute.dataType === "NUMBER" ? "number" : "text"}
        inputMode={attribute.dataType === "NUMBER" ? "decimal" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={getAttributePlaceholder(attribute)}
      />
      {attribute.unit ? (
        <span className="text-sm font-medium text-slate-400">{attribute.unit}</span>
      ) : null}
    </div>
  );
}

export default function ProductVariantCard({
  variant,
  index,
  isFirst,
  isLast,
  attributes,
  isOpen,
  onVariantRemove,
  onVariantDuplicate,
  onVariantMove,
  onVariantChange,
  onVariantAttributeValueChange,
}: {
  variant: ProductVariantEditorState;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isOpen: boolean;
  attributes: ProductAttributeEditorState[];
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
}) {
  const lifecycleBadge = getLifecycleBadge(variant.lifecycleStatus);
  const visibilityBadge = getVisibilityBadge(variant.visibility);
  const commercialBadge = getCommercialModeBadge(variant.commercialMode);
  const filledAttributeCount = variant.attributeValues.filter((attributeValue) =>
    attributeValue.value.trim(),
  ).length;

  return (
    <AccordionItem
      value={variant.formKey}
      className="rounded-2xl border border-slate-200 bg-white px-4 shadow-sm sm:px-5"
    >
      <div className="flex justify-between items-start gap-3 py-4 sm:pt-5">
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Variante {index + 1}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-cobam-dark-blue">
                  {variant.title.trim() || "Variante sans titre"}
                </h3>
                {variant.sku.trim() ? (
                  <StaffBadge size="sm" color="default">
                    {variant.sku}
                  </StaffBadge>
                ) : null}
              </div>
              <p className="text-sm text-slate-500">
                {variant.subtitle.trim() || formatVariantPrice(variant)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StaffBadge size="sm" color={lifecycleBadge.color}>
                {lifecycleBadge.label}
              </StaffBadge>
              <StaffBadge size="sm" color={visibilityBadge.color}>
                {visibilityBadge.label}
              </StaffBadge>
              <StaffBadge size="sm" color={commercialBadge.color}>
                {commercialBadge.label}
              </StaffBadge>
              <StaffBadge size="sm" color="secondary">
                {variant.media.length} média{variant.media.length > 1 ? "s" : ""}
              </StaffBadge>
              <StaffBadge size="sm" color="default">
                {filledAttributeCount}/{attributes.length} attribut
                {attributes.length > 1 ? "s" : ""}
              </StaffBadge>
              {variant.isPromoted ? (
                <StaffBadge size="sm" color="warning">
                  En promotion
                </StaffBadge>
              ) : null}
            </div>
          </div>
        <div className="inline-flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AnimatedUIButton variant="outline" icon="ellipsis" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuItem className="inline-flex gap-2 w-full" onClick={() => onVariantDuplicate(variant.formKey)}>
                  <Copy className="w-3 h-3" />Dupliquer
                </DropdownMenuItem>
                <DropdownMenuItem className="inline-flex gap-2 w-full" disabled={isFirst} onClick={() => onVariantMove(variant.formKey, "up")}><ChevronUp className="w-3 h-3" /> Monter</DropdownMenuItem>
                <DropdownMenuItem className="inline-flex gap-2 w-full" disabled={isLast} onClick={() => onVariantMove(variant.formKey, "down")}><ChevronDown className="w-3 h-3" /> Descendre</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <AccordionTrigger hideChevron className="min-w-0 flex-1 py-0 hover:no-underline [something that removes the default chevron]">
              <AnimatedUIButton icon={isOpen ? "chevron-up" : "chevron-down" }></AnimatedUIButton>
          </AccordionTrigger>
            <Dialog>
              <DialogTrigger asChild>
                <AnimatedUIButton
                  type="button"
                  variant="outline"
                  icon="close"
                  iconPosition="left"
                  color="error"
                  aria-label="Supprimer la variante"
                  title="Supprimer la variante"
                />
              </DialogTrigger>
              <DialogContent className="w-[min(96vw,560px)]">
                <DialogHeader>
                  <DialogTitle>Retirer cette variante ?</DialogTitle>
                  <DialogDescription>
                    Cette action retirera définitivement{" "}
                    {variant.title.trim() || `la variante ${index + 1}`} de la
                    famille produit en cours d’édition.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <AnimatedUIButton type="button" variant="light" color="default">
                      Annuler
                    </AnimatedUIButton>
                  </DialogClose>
                  <AnimatedUIButton
                    type="button"
                    variant="primary"
                    color="error"
                    icon="delete"
                    iconPosition="left"
                    onClick={() => onVariantRemove(variant.formKey)}
                  >
                    Supprimer
                  </AnimatedUIButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
      </div>

      <AccordionContent className="pt-5 pb-5 overflow-y-auto">
        <div className="grid gap-5">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
            <PanelField
              id={`variant-title-${variant.formKey}`}
              label="Titre"
              hint={`Slug : ${variant.slug || "à compléter"}`}
            >
              <PanelInput
                id={`variant-title-${variant.formKey}`}
                fullWidth
                value={variant.title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  onVariantChange(variant.formKey, "title", nextTitle);
                  if (
                    variant.slug === "" ||
                    variant.slug === slugifyProductReference(variant.title)
                  ) {
                    onVariantChange(
                      variant.formKey,
                      "slug",
                      slugifyProductReference(nextTitle),
                    );
                  }
                }}
                placeholder="Ex. Mitigeur noir mat"
              />
            </PanelField>

            <PanelField id={`variant-sku-${variant.formKey}`} label="SKU">
              <PanelInput
                id={`variant-sku-${variant.formKey}`}
                fullWidth
                value={variant.sku}
                onChange={(event) =>
                  onVariantChange(variant.formKey, "sku", event.target.value)
                }
                placeholder="Ex. COB-MTG-001"
              />
            </PanelField>

            <PanelField id={`variant-slug-${variant.formKey}`} label="Slug">
              <PanelInput
                id={`variant-slug-${variant.formKey}`}
                fullWidth
                value={variant.slug}
                onChange={(event) =>
                  onVariantChange(variant.formKey, "slug", event.target.value)
                }
                placeholder="slug-variante"
              />
            </PanelField>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]">
            <PanelField id={`variant-subtitle-${variant.formKey}`} label="Sous-titre">
              <PanelInput
                id={`variant-subtitle-${variant.formKey}`}
                fullWidth
                value={variant.subtitle}
                onChange={(event) =>
                  onVariantChange(variant.formKey, "subtitle", event.target.value)
                }
                placeholder="Ex. Finition noire mate"
              />
            </PanelField>

            <PanelField
              id={`variant-lifecycle-${variant.formKey}`}
              label="Cycle de vie"
            >
              <StaffSelect
                fullWidth
                id={`variant-lifecycle-${variant.formKey}`}
                value={variant.lifecycleStatus}
                onValueChange={(value) =>
                  onVariantChange(
                    variant.formKey,
                    "lifecycleStatus",
                    value as ProductVariantEditorState["lifecycleStatus"],
                  )
                }
                options={[
                  { value: "DRAFT", label: "Brouillon" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "ARCHIVED", label: "Archivée" },
                ]}
                triggerClassName="h-12 rounded-2xl border-slate-300 px-4 text-base"
              />
            </PanelField>

            <PanelField id={`variant-visibility-${variant.formKey}`} label="Visibilité">
              <StaffSelect
                fullWidth
                id={`variant-visibility-${variant.formKey}`}
                value={variant.visibility}
                onValueChange={(value) =>
                  onVariantChange(
                    variant.formKey,
                    "visibility",
                    value as ProductVariantEditorState["visibility"],
                  )
                }
                options={[
                  { value: "HIDDEN", label: "Masquée" },
                  { value: "PUBLIC", label: "Publique" },
                ]}
                triggerClassName="h-12 rounded-2xl border-slate-300 px-4 text-base"
              />
            </PanelField>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <PanelField
              id={`variant-commercial-${variant.formKey}`}
              label="Mode commercial"
            >
              <StaffSelect
                fullWidth
                id={`variant-commercial-${variant.formKey}`}
                value={variant.commercialMode}
                onValueChange={(value) =>
                  onVariantChange(
                    variant.formKey,
                    "commercialMode",
                    value as ProductVariantEditorState["commercialMode"],
                  )
                }
                options={[
                  { value: "REFERENCE_ONLY", label: "Référence" },
                  { value: "QUOTE_ONLY", label: "Sur demande" },
                  { value: "SELLABLE", label: "Vendable" },
                ]}
                triggerClassName="h-12 rounded-2xl border-slate-300 px-4 text-base"
              />
            </PanelField>

            <PanelField
              id={`variant-price-${variant.formKey}`}
              label="Visibilité du prix"
            >
              <StaffSelect
                fullWidth
                id={`variant-price-${variant.formKey}`}
                value={variant.priceVisibility}
                onValueChange={(value) =>
                  onVariantChange(
                    variant.formKey,
                    "priceVisibility",
                    value as ProductVariantEditorState["priceVisibility"],
                  )
                }
                options={[
                  { value: "HIDDEN", label: "Masquée" },
                  { value: "VISIBLE", label: "Visible" },
                ]}
                triggerClassName="h-12 rounded-2xl border-slate-300 px-4 text-base"
              />
            </PanelField>

            <PanelField
              id={`variant-promoted-${variant.formKey}`}
              label="Promotion"
              className="w-auto"
            >
              <BooleanButton
                id={`variant-promoted-${variant.formKey}`}
                checked={variant.isPromoted}
                onClick={(checked: boolean) =>
                  onVariantChange(variant.formKey, "isPromoted", checked)
                }
              />
            </PanelField>
          </div>

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] lg:items-end">
            <PanelField
              id={`variant-base-price-amount-${variant.formKey}`}
              label="Prix de base"
            >
              <PanelInput
                id={`variant-base-price-amount-${variant.formKey}`}
                fullWidth
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                value={variant.basePriceAmount}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  onVariantChange(variant.formKey, "basePriceAmount", nextValue);
                  if (variant.isPriceLinked) {
                    onVariantChange(
                      variant.formKey,
                      "currentPriceAmount",
                      nextValue,
                    );
                  }
                }}
                placeholder="Prix de base"
              />
            </PanelField>

            <button
              type="button"
              aria-pressed={variant.isPriceLinked}
              title={
                variant.isPriceLinked
                  ? "Délier les deux prix"
                  : "Lier les deux prix"
              }
              onClick={() => {
                const nextLinked = !variant.isPriceLinked;
                onVariantChange(variant.formKey, "isPriceLinked", nextLinked);
                if (nextLinked) {
                  onVariantChange(
                    variant.formKey,
                    "currentPriceAmount",
                    variant.basePriceAmount,
                  );
                }
              }}
              className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors ${
                variant.isPriceLinked
                  ? "border-cobam-water-blue/30 bg-cobam-water-blue/10 text-cobam-water-blue"
                  : "border-slate-200 bg-white/70 text-slate-400 hover:border-slate-300 hover:text-slate-600"
              }`}
            >
              {variant.isPriceLinked ? (
                <Link2 className="h-4 w-4" />
              ) : (
                <Unlink2 className="h-4 w-4" />
              )}
            </button>

            <PanelField
              id={`variant-current-price-amount-${variant.formKey}`}
              label="Prix courant"
            >
              <PanelInput
                id={`variant-current-price-amount-${variant.formKey}`}
                fullWidth
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                value={variant.currentPriceAmount}
                onChange={(event) => {
                  onVariantChange(
                    variant.formKey,
                    "currentPriceAmount",
                    event.target.value,
                  );
                  if (variant.isPriceLinked) {
                    onVariantChange(variant.formKey, "isPriceLinked", false);
                  }
                }}
                placeholder="Prix courant"
              />
            </PanelField>

            <span className="flex h-12 items-center text-sm font-medium text-slate-500">
              TND
            </span>
          </div>

          <PanelField
            id={`variant-description-${variant.formKey}`}
            label="Description"
          >
            <Textarea
              id={`variant-description-${variant.formKey}`}
              value={variant.description}
              onChange={(event) =>
                onVariantChange(variant.formKey, "description", event.target.value)
              }
              placeholder="Description courte de cette référence précise..."
              className="min-h-24 rounded-md border-slate-300 px-4 py-3 text-base"
            />
          </PanelField>

          <ProductMediaGrid
            items={variant.media}
            onChange={(nextMedia) =>
              onVariantChange(variant.formKey, "media", nextMedia)
            }
            title="Galerie de la variante"
            description="Optionnel : ajoutez plusieurs médias si besoin, puis glissez-les pour définir leur ordre d'affichage."
          />

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-cobam-dark-blue">
                Valeurs d’attributs
              </p>
              <StaffBadge size="sm" color="default">
                {attributes.length}
              </StaffBadge>
            </div>
            {attributes.length === 0 ? (
              <p className="text-sm leading-6 text-slate-500">
                Ajoutez d’abord des attributs sur la famille pour les renseigner ici.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {attributes.map((attribute) => (
                  <div
                    key={`${variant.formKey}-${attribute.formKey}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-cobam-dark-blue">
                        {attribute.name || "Attribut sans nom"}
                      </p>
                      <StaffBadge size="sm" color="secondary">
                        {getProductAttributeDataTypeLabel(attribute.dataType)}
                      </StaffBadge>
                    </div>
                    <VariantAttributeField
                      variant={variant}
                      attribute={attribute}
                      value={
                        variant.attributeValues.find(
                          (item) => item.attributeFormKey === attribute.formKey,
                        )?.value ?? ""
                      }
                      onChange={(nextValue) =>
                        onVariantAttributeValueChange(
                          variant.formKey,
                          attribute.formKey,
                          nextValue,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
