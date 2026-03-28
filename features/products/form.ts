import type {
  ProductAttributeInput,
  ProductCreateInput,
  ProductDetailDto,
  ProductMediaDto,
  ProductVariantAttributeValueInput,
  ProductVariantInput,
} from "./types";
import { slugifyProductReference } from "./slug";

export type ProductAttributeEditorState = {
  formKey: string;
  id: number | null;
  name: string;
  dataType: ProductAttributeInput["dataType"];
  unit: string;
  sortOrder: string;
};

export type ProductVariantAttributeValueEditorState = {
  attributeFormKey: string;
  attributeId: number | null;
  value: string;
};

export type ProductVariantEditorState = {
  formKey: string;
  id: number | null;
  sku: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  lifecycleStatus: ProductVariantInput["lifecycleStatus"];
  visibility: ProductVariantInput["visibility"];
  commercialMode: ProductVariantInput["commercialMode"];
  priceVisibility: ProductVariantInput["priceVisibility"];
  isPromoted: boolean;
  basePriceAmount: string;
  currentPriceAmount: string;
  isPriceLinked: boolean;
  media: ProductMediaDto[];
  attributeValues: ProductVariantAttributeValueEditorState[];
};

export type ProductEditorFormState = {
  brandId: string;
  productSubcategoryIds: string[];
  mainImage: ProductMediaDto | null;
  name: string;
  slug: string;
  subtitle: string;
  excerpt: string;
  description: string;
  descriptionSeo: string;
  lifecycleStatus: ProductCreateInput["lifecycleStatus"];
  visibility: ProductCreateInput["visibility"];
  isPromoted: boolean;
  tagNames: string[];
  attributes: ProductAttributeEditorState[];
  variants: ProductVariantEditorState[];
};

function createFormKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyProductAttributeEditorState(
  overrides: Partial<ProductAttributeEditorState> = {},
): ProductAttributeEditorState {
  return {
    formKey: overrides.formKey ?? createFormKey(),
    id: overrides.id ?? null,
    name: overrides.name ?? "",
    dataType: overrides.dataType ?? "TEXT",
    unit: overrides.unit ?? "",
    sortOrder: overrides.sortOrder ?? "0",
  };
}

export function createEmptyProductVariantEditorState(
  overrides: Partial<ProductVariantEditorState> = {},
): ProductVariantEditorState {
  return {
    formKey: overrides.formKey ?? createFormKey(),
    id: overrides.id ?? null,
    sku: overrides.sku ?? "",
    slug: overrides.slug ?? "",
    title: overrides.title ?? "",
    subtitle: overrides.subtitle ?? "",
    description: overrides.description ?? "",
    lifecycleStatus: overrides.lifecycleStatus ?? "DRAFT",
    visibility: overrides.visibility ?? "HIDDEN",
    commercialMode: overrides.commercialMode ?? "REFERENCE_ONLY",
    priceVisibility: overrides.priceVisibility ?? "HIDDEN",
    isPromoted: overrides.isPromoted ?? false,
    basePriceAmount: overrides.basePriceAmount ?? "",
    currentPriceAmount: overrides.currentPriceAmount ?? "",
    isPriceLinked: overrides.isPriceLinked ?? false,
    media: overrides.media ?? [],
    attributeValues: overrides.attributeValues ?? [],
  };
}

export function duplicateProductVariantEditorState(
  source: ProductVariantEditorState,
): ProductVariantEditorState {
  const duplicatedTitle = source.title.trim()
    ? `${source.title.trim()} copie`
    : "";

  return createEmptyProductVariantEditorState({
    sku: "",
    slug: duplicatedTitle ? slugifyProductReference(duplicatedTitle) : "",
    title: duplicatedTitle,
    subtitle: source.subtitle,
    description: source.description,
    lifecycleStatus: source.lifecycleStatus,
    visibility: source.visibility,
    commercialMode: source.commercialMode,
    priceVisibility: source.priceVisibility,
    isPromoted: source.isPromoted,
    basePriceAmount: source.basePriceAmount,
    currentPriceAmount: source.currentPriceAmount,
    isPriceLinked: source.isPriceLinked,
    media: [...source.media],
    attributeValues: source.attributeValues.map((attributeValue) => ({
      ...attributeValue,
    })),
  });
}

export function moveProductVariantEditorStates(
  variants: ProductVariantEditorState[],
  formKey: string,
  direction: "up" | "down",
): ProductVariantEditorState[] {
  const currentIndex = variants.findIndex((variant) => variant.formKey === formKey);

  if (currentIndex < 0) {
    return variants;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= variants.length) {
    return variants;
  }

  const nextVariants = [...variants];
  const [movedVariant] = nextVariants.splice(currentIndex, 1);
  nextVariants.splice(targetIndex, 0, movedVariant);
  return nextVariants;
}

function buildVariantAttributeValues(
  attributes: ProductAttributeEditorState[],
  values: Array<{
    attributeId?: number | null;
    attributeFormKey?: string | null;
    value: string | null;
  }> = [],
): ProductVariantAttributeValueEditorState[] {
  return attributes.map((attribute) => {
    const matchingValue =
      values.find(
        (item) =>
          item.attributeId != null &&
          attribute.id != null &&
          item.attributeId === attribute.id,
      ) ??
      values.find(
        (item) =>
          item.attributeFormKey != null &&
          item.attributeFormKey === attribute.formKey,
      );

    return {
      attributeFormKey: attribute.formKey,
      attributeId: attribute.id,
      value: matchingValue?.value ?? "",
    };
  });
}

export function syncVariantAttributeValueEditorStates(
  attributes: ProductAttributeEditorState[],
  existingValues: ProductVariantAttributeValueEditorState[],
): ProductVariantAttributeValueEditorState[] {
  return buildVariantAttributeValues(
    attributes,
    existingValues.map((item) => ({
      attributeId: item.attributeId,
      attributeFormKey: item.attributeFormKey,
      value: item.value,
    })),
  );
}

export function createEmptyProductEditorFormState(): ProductEditorFormState {
  return {
    brandId: "",
    productSubcategoryIds: [],
    mainImage: null,
    name: "",
    slug: "",
    subtitle: "",
    excerpt: "",
    description: "",
    descriptionSeo: "",
    lifecycleStatus: "DRAFT",
    visibility: "HIDDEN",
    isPromoted: false,
    tagNames: [],
    attributes: [],
    variants: [],
  };
}

export function productDetailToFormState(
  product: ProductDetailDto | null,
): ProductEditorFormState {
  if (!product) {
    return createEmptyProductEditorFormState();
  }

  const attributes = product.attributes.map((attribute, index) =>
    createEmptyProductAttributeEditorState({
      id: attribute.id,
      name: attribute.name,
      dataType: attribute.dataType,
      unit: attribute.unit ?? "",
      sortOrder: String(attribute.sortOrder ?? index),
    }),
  );

  return {
    brandId: product.brand != null ? String(product.brand.id) : "",
    productSubcategoryIds: product.productSubcategories.map((subcategory) =>
      String(subcategory.id),
    ),
    mainImage: product.mainImage,
    name: product.name,
    slug: product.slug,
    subtitle: product.subtitle ?? "",
    excerpt: product.excerpt ?? "",
    description: product.description ?? "",
    descriptionSeo: product.descriptionSeo ?? "",
    lifecycleStatus: product.lifecycleStatus,
    visibility: product.visibility,
    isPromoted: product.isPromoted,
    tagNames: product.tags.map((tag) => tag.name),
    attributes,
    variants: product.variants.map((variant) =>
      createEmptyProductVariantEditorState({
        id: variant.id,
        sku: variant.sku,
        slug: variant.slug,
        title: variant.title,
        subtitle: variant.subtitle ?? "",
        description: variant.description ?? "",
        lifecycleStatus: variant.lifecycleStatus,
        visibility: variant.visibility,
        commercialMode: variant.commercialMode,
        priceVisibility: variant.priceVisibility,
        isPromoted: variant.isPromoted,
        basePriceAmount: variant.basePriceAmount ?? "",
        currentPriceAmount: variant.currentPriceAmount ?? "",
        isPriceLinked:
          variant.basePriceAmount != null &&
          variant.currentPriceAmount != null &&
          variant.basePriceAmount === variant.currentPriceAmount,
        media: variant.media,
        attributeValues: buildVariantAttributeValues(
          attributes,
          variant.attributeValues.map((value) => ({
            attributeId: value.attributeId,
            value: value.value,
          })),
        ),
      }),
    ),
  };
}

export function productEditorFormToPayload(
  state: ProductEditorFormState,
): ProductCreateInput {
  return {
    brandId:
      Number.isInteger(Number(state.brandId)) && Number(state.brandId) > 0
        ? Number(state.brandId)
        : null,
    productSubcategoryIds: state.productSubcategoryIds
      .map((subcategoryId) => Number(subcategoryId))
      .filter(
        (subcategoryId) =>
          Number.isInteger(subcategoryId) && subcategoryId > 0,
      ),
    mainImageMediaId: state.mainImage?.id ?? null,
    name: state.name.trim(),
    slug: state.slug.trim(),
    subtitle: state.subtitle.trim() || null,
    excerpt: state.excerpt.trim() || null,
    description: state.description.trim() || null,
    descriptionSeo: state.descriptionSeo.trim() || null,
    lifecycleStatus: state.lifecycleStatus,
    visibility: state.visibility,
    isPromoted: state.isPromoted,
    tagNames: state.tagNames.map((tagName) => tagName.trim()).filter(Boolean),
    attributes: state.attributes.map((attribute, index) => ({
      tempKey: attribute.formKey,
      id: attribute.id,
      name: attribute.name.trim(),
      dataType: attribute.dataType,
      unit: attribute.unit.trim() || null,
      sortOrder:
        Number.isFinite(Number(attribute.sortOrder)) &&
        Number.isInteger(Number(attribute.sortOrder))
          ? Number(attribute.sortOrder)
          : index,
    })),
    variants: state.variants.map((variant, index) => ({
      id: variant.id,
      sku: variant.sku.trim(),
      slug: variant.slug.trim(),
      title: variant.title.trim(),
      subtitle: variant.subtitle.trim() || null,
      description: variant.description.trim() || null,
      lifecycleStatus: variant.lifecycleStatus,
      visibility: variant.visibility,
      commercialMode: variant.commercialMode,
      priceVisibility: variant.priceVisibility,
      isPromoted: variant.isPromoted,
      basePriceAmount: variant.basePriceAmount.trim() || null,
      currentPriceAmount: variant.currentPriceAmount.trim() || null,
      sortOrder: index,
      mediaIds: Array.from(
        new Set(
          variant.media
            .map((media) => media.id)
            .filter((mediaId) => Number.isInteger(mediaId) && mediaId > 0),
        ),
      ),
      attributeValues: variant.attributeValues.map(
        (attributeValue): ProductVariantAttributeValueInput => ({
          attributeId: attributeValue.attributeId,
          attributeTempKey:
            attributeValue.attributeId == null
              ? attributeValue.attributeFormKey
              : null,
          value: attributeValue.value.trim() || null,
        }),
      ),
    })),
  };
}
