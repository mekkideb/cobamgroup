import {
  PRODUCT_ATTRIBUTE_DATA_TYPE_OPTIONS,
  PRODUCT_COMMERCIAL_MODE_OPTIONS,
  PRODUCT_LIFECYCLE_STATUS_OPTIONS,
  PRODUCT_PAGE_SIZE_OPTIONS,
  PRODUCT_PRICE_VISIBILITY_OPTIONS,
  PRODUCT_VISIBILITY_OPTIONS,
  type ProductAttributeDataType,
  type ProductAttributeInput,
  type ProductCreateInput,
  type ProductCommercialMode,
  type ProductLifecycleStatus,
  type ProductListQuery,
  type ProductPageSize,
  type ProductPriceVisibility,
  type ProductUpdateInput,
  type ProductVariantAttributeValueInput,
  type ProductVariantInput,
  type ProductVisibility,
} from "./types";

export class ProductValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ProductValidationError(
      `Missing or invalid field "${fieldName}"`,
    );
  }

  return value.trim();
}

function parseOptionalString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new ProductValidationError("Invalid optional string field");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalPriceString(value: unknown, fieldName: string) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new ProductValidationError(`Invalid ${fieldName}`);
  }

  const normalizedValue = String(value).replace(",", ".").trim();

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    throw new ProductValidationError(`Invalid ${fieldName}`);
  }

  return normalizedValue;
}

function assertPricePairConsistency(
  basePriceAmount: string | null,
  currentPriceAmount: string | null,
  fieldPrefix: string,
) {
  if (currentPriceAmount != null && basePriceAmount == null) {
    throw new ProductValidationError(
      `Invalid ${fieldPrefix}: current price requires a base price`,
    );
  }
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ProductValidationError(`Invalid ${fieldName}`);
  }

  return parsed;
}

function parseNonNegativeInteger(value: unknown, fieldName: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ProductValidationError(`Invalid ${fieldName}`);
  }

  return parsed;
}

function parsePositiveIntegerArray(
  value: unknown,
  fieldName: string,
): number[] {
  if (!Array.isArray(value)) {
    throw new ProductValidationError(`Invalid ${fieldName}`);
  }

  const parsed = Array.from(
    new Set(
      value.map((item, index) =>
        parsePositiveInteger(item, `${fieldName}[${index}]`),
      ),
    ),
  );

  if (parsed.length === 0) {
    throw new ProductValidationError(`Missing ${fieldName}`);
  }

  return parsed;
}

function parseOptionalPositiveIntegerArray(
  value: unknown,
  fieldName: string,
): number[] {
  if (value == null) {
    return [];
  }

  return parsePositiveIntegerArray(value, fieldName);
}

function parseEnumValue<T extends readonly string[]>(
  value: unknown,
  options: T,
  fieldName: string,
): T[number] {
  if (typeof value !== "string" || !options.includes(value)) {
    throw new ProductValidationError(`Invalid ${fieldName}`);
  }

  return value as T[number];
}

function parseStringArray(value: unknown, fieldName: string): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new ProductValidationError(`Invalid ${fieldName}`);
  }

  return Array.from(
    new Set(
      value.map((item) => {
        if (typeof item !== "string") {
          throw new ProductValidationError(`Invalid ${fieldName}`);
        }

        const normalized = item.replace(/\s+/g, " ").trim();

        if (!normalized) {
          throw new ProductValidationError(`Invalid ${fieldName}`);
        }

        return normalized;
      }),
    ),
  );
}

function parseOptionalQueryInteger(value: string | null, fieldName: string) {
  if (!value?.trim()) return undefined;
  return parsePositiveInteger(value, fieldName);
}

function parseOptionalId(value: unknown, fieldName: string) {
  if (value == null || value === "") {
    return null;
  }

  return parsePositiveInteger(value, fieldName);
}

function parseProductAttributeInput(
  raw: unknown,
  index: number,
): ProductAttributeInput {
  if (!isRecord(raw)) {
    throw new ProductValidationError(`Invalid attributes[${index}]`);
  }

  return {
    tempKey: parseRequiredString(raw.tempKey, `attributes[${index}].tempKey`),
    id: parseOptionalId(raw.id, `attributes[${index}].id`),
    name: parseRequiredString(raw.name, `attributes[${index}].name`),
    dataType: parseEnumValue(
      raw.dataType,
      PRODUCT_ATTRIBUTE_DATA_TYPE_OPTIONS,
      `attributes[${index}].dataType`,
    ) as ProductAttributeDataType,
    unit: parseOptionalString(raw.unit),
    sortOrder: parseNonNegativeInteger(
      raw.sortOrder ?? index,
      `attributes[${index}].sortOrder`,
    ),
  };
}

function parseAttributes(value: unknown): ProductAttributeInput[] {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ProductValidationError("Invalid attributes");
  }

  return value.map((item, index) => parseProductAttributeInput(item, index));
}

function parseProductVariantAttributeValueInput(
  raw: unknown,
  variantIndex: number,
  valueIndex: number,
): ProductVariantAttributeValueInput {
  if (!isRecord(raw)) {
    throw new ProductValidationError(
      `Invalid variants[${variantIndex}].attributeValues[${valueIndex}]`,
    );
  }

  const value = parseOptionalString(raw.value);
  const attributeId = parseOptionalId(
    raw.attributeId,
    `variants[${variantIndex}].attributeValues[${valueIndex}].attributeId`,
  );
  const attributeTempKey = parseOptionalString(raw.attributeTempKey);

  if (attributeId == null && !attributeTempKey) {
    throw new ProductValidationError(
      `Missing attribute reference for variants[${variantIndex}].attributeValues[${valueIndex}]`,
    );
  }

  return {
    attributeId,
    attributeTempKey,
    value,
  };
}

function parseVariantAttributeValues(
  value: unknown,
  variantIndex: number,
): ProductVariantAttributeValueInput[] {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ProductValidationError(
      `Invalid variants[${variantIndex}].attributeValues`,
    );
  }

  return value.map((item, valueIndex) =>
    parseProductVariantAttributeValueInput(item, variantIndex, valueIndex),
  );
}

function parseProductVariantInput(
  raw: unknown,
  index: number,
): ProductVariantInput {
  if (!isRecord(raw)) {
    throw new ProductValidationError(`Invalid variants[${index}]`);
  }

  return {
    id: parseOptionalId(raw.id, `variants[${index}].id`),
    sku: parseRequiredString(raw.sku, `variants[${index}].sku`),
    slug: parseRequiredString(raw.slug, `variants[${index}].slug`),
    title: parseRequiredString(raw.title, `variants[${index}].title`),
    subtitle: parseOptionalString(raw.subtitle),
    description: parseOptionalString(raw.description),
    lifecycleStatus: parseEnumValue(
      raw.lifecycleStatus,
      PRODUCT_LIFECYCLE_STATUS_OPTIONS,
      `variants[${index}].lifecycleStatus`,
    ) as ProductLifecycleStatus,
    visibility: parseEnumValue(
      raw.visibility,
      PRODUCT_VISIBILITY_OPTIONS,
      `variants[${index}].visibility`,
    ) as ProductVisibility,
    commercialMode: parseEnumValue(
      raw.commercialMode,
      PRODUCT_COMMERCIAL_MODE_OPTIONS,
      `variants[${index}].commercialMode`,
    ) as ProductCommercialMode,
    priceVisibility: parseEnumValue(
      raw.priceVisibility,
      PRODUCT_PRICE_VISIBILITY_OPTIONS,
      `variants[${index}].priceVisibility`,
    ) as ProductPriceVisibility,
    isPromoted: Boolean(raw.isPromoted),
    basePriceAmount: parseOptionalPriceString(
      raw.basePriceAmount,
      `variants[${index}].basePriceAmount`,
    ),
    currentPriceAmount: parseOptionalPriceString(
      raw.currentPriceAmount,
      `variants[${index}].currentPriceAmount`,
    ),
    sortOrder: parseNonNegativeInteger(
      raw.sortOrder ?? index,
      `variants[${index}].sortOrder`,
    ),
    mediaIds: parseOptionalPositiveIntegerArray(
      raw.mediaIds,
      `variants[${index}].mediaIds`,
    ),
    attributeValues: parseVariantAttributeValues(raw.attributeValues, index),
  };
}

function parseVariants(value: unknown): ProductVariantInput[] {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ProductValidationError("Invalid variants");
  }

  return value.map((item, index) => {
    const variant = parseProductVariantInput(item, index);
    assertPricePairConsistency(
      variant.basePriceAmount,
      variant.currentPriceAmount,
      `variants[${index}]`,
    );
    return variant;
  });
}

export function parseProductIdParam(idParam: string): number {
  return parsePositiveInteger(idParam, "id");
}

export function parseProductListQuery(
  searchParams: URLSearchParams,
): ProductListQuery {
  const pageRaw = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const pageSizeRaw = Number(searchParams.get("pageSize") ?? "20");
  const pageSize = (
    PRODUCT_PAGE_SIZE_OPTIONS.includes(pageSizeRaw as ProductPageSize)
      ? pageSizeRaw
      : 20
  ) as ProductPageSize;

  const qRaw = searchParams.get("q");
  const q = qRaw?.trim() ? qRaw.trim() : undefined;

  return {
    page,
    pageSize,
    q,
    brandId: parseOptionalQueryInteger(searchParams.get("brandId"), "brandId"),
    productSubcategoryId: parseOptionalQueryInteger(
      searchParams.get("productSubcategoryId"),
      "productSubcategoryId",
    ),
  };
}

function parseProductInputBase(raw: unknown): ProductCreateInput {
  if (!isRecord(raw)) {
    throw new ProductValidationError("Invalid request body");
  }

  return {
    brandId: parseOptionalId(raw.brandId, "brandId"),
    productSubcategoryIds: parsePositiveIntegerArray(
      raw.productSubcategoryIds,
      "productSubcategoryIds",
    ),
    mainImageMediaId: parseOptionalId(raw.mainImageMediaId, "mainImageMediaId"),
    name: parseRequiredString(raw.name, "name"),
    slug: parseRequiredString(raw.slug, "slug"),
    subtitle: parseOptionalString(raw.subtitle),
    excerpt: parseOptionalString(raw.excerpt),
    description: parseOptionalString(raw.description),
    descriptionSeo: parseOptionalString(raw.descriptionSeo),
    lifecycleStatus: parseEnumValue(
      raw.lifecycleStatus,
      PRODUCT_LIFECYCLE_STATUS_OPTIONS,
      "lifecycleStatus",
    ) as ProductLifecycleStatus,
    visibility: parseEnumValue(
      raw.visibility,
      PRODUCT_VISIBILITY_OPTIONS,
      "visibility",
    ) as ProductVisibility,
    isPromoted: Boolean(raw.isPromoted),
    tagNames: parseStringArray(raw.tagNames, "tagNames"),
    attributes: parseAttributes(raw.attributes),
    variants: parseVariants(raw.variants),
  };
}

export function parseProductCreateInput(raw: unknown): ProductCreateInput {
  return parseProductInputBase(raw);
}

export function parseProductUpdateInput(raw: unknown): ProductUpdateInput {
  return parseProductInputBase(raw);
}
