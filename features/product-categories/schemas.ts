import {
  PRODUCT_CATEGORY_PAGE_SIZE_OPTIONS,
  type ProductCategoryCreateInput,
  type ProductCategoryListQuery,
  type ProductCategoryPageSize,
  type ProductCategoryUpdateInput,
  type ProductSubcategoryInput,
} from "./types";

export class ProductCategoryValidationError extends Error {
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
    throw new ProductCategoryValidationError(
      `Missing or invalid field "${fieldName}"`,
    );
  }

  return value.trim();
}

function parseOptionalString(value: unknown): string | null {
  if (value == null || value === "") return null;

  if (typeof value !== "string") {
    throw new ProductCategoryValidationError("Invalid optional string field");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalInteger(value: unknown, fieldName: string): number {
  if (value == null || value === "") return 0;

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsed)) {
    throw new ProductCategoryValidationError(`Invalid ${fieldName}`);
  }

  return parsed;
}

function parseBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") return true;
  if (value === "false") return false;

  throw new ProductCategoryValidationError(`Invalid ${fieldName}`);
}

function parseOptionalPositiveInteger(
  value: unknown,
  fieldName: string,
): number | null {
  if (value == null || value === "") return null;

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ProductCategoryValidationError(`Invalid ${fieldName}`);
  }

  return parsed;
}

function parseProductSubcategoryInput(
  raw: unknown,
  index: number,
): ProductSubcategoryInput {
  if (!isRecord(raw)) {
    throw new ProductCategoryValidationError(
      `Invalid subcategories[${index}]`,
    );
  }

  return {
    id: parseOptionalPositiveInteger(raw.id, `subcategories[${index}].id`),
    name: parseRequiredString(raw.name, `subcategories[${index}].name`),
    subtitle: parseOptionalString(raw.subtitle),
    slug: parseRequiredString(raw.slug, `subcategories[${index}].slug`),
    description: parseOptionalString(raw.description),
    descriptionSeo: parseOptionalString(raw.descriptionSeo),
    imageMediaId: parseOptionalPositiveInteger(
      raw.imageMediaId,
      `subcategories[${index}].imageMediaId`,
    ),
    sortOrder: parseOptionalInteger(
      raw.sortOrder,
      `subcategories[${index}].sortOrder`,
    ),
    isActive:
      raw.isActive == null
        ? true
        : parseBoolean(raw.isActive, `subcategories[${index}].isActive`),
  };
}

function parseSubcategories(value: unknown): ProductSubcategoryInput[] {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ProductCategoryValidationError("Invalid subcategories");
  }

  return value.map((item, index) => parseProductSubcategoryInput(item, index));
}

export function parseProductCategoryIdParam(idParam: string): number {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ProductCategoryValidationError("Invalid id");
  }

  return id;
}

export function parseProductCategoryListQuery(
  searchParams: URLSearchParams,
): ProductCategoryListQuery {
  const pageRaw = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const pageSizeRaw = Number(searchParams.get("pageSize") ?? "20");
  const pageSize = (
    PRODUCT_CATEGORY_PAGE_SIZE_OPTIONS.includes(
      pageSizeRaw as ProductCategoryPageSize,
    )
      ? pageSizeRaw
      : 20
  ) as ProductCategoryPageSize;

  const qRaw = searchParams.get("q");
  const q = qRaw?.trim() ? qRaw.trim() : undefined;
  const treeRaw = searchParams.get("tree");
  const tree = treeRaw === "1" || treeRaw === "true";

  return { page, pageSize, q, tree };
}

function parseProductCategoryInputBase(
  raw: unknown,
): ProductCategoryCreateInput {
  if (!isRecord(raw)) {
    throw new ProductCategoryValidationError("Invalid request body");
  }

  return {
    name: parseRequiredString(raw.name, "name"),
    subtitle: parseOptionalString(raw.subtitle),
    slug: parseRequiredString(raw.slug, "slug"),
    description: parseOptionalString(raw.description),
    descriptionSeo: parseOptionalString(raw.descriptionSeo),
    imageMediaId: parseOptionalPositiveInteger(raw.imageMediaId, "imageMediaId"),
    sortOrder: parseOptionalInteger(raw.sortOrder, "sortOrder"),
    isActive:
      raw.isActive == null ? true : parseBoolean(raw.isActive, "isActive"),
    subcategories: parseSubcategories(raw.subcategories),
  };
}

export function parseProductCategoryCreateInput(
  raw: unknown,
): ProductCategoryCreateInput {
  return parseProductCategoryInputBase(raw);
}

export function parseProductCategoryUpdateInput(
  raw: unknown,
): ProductCategoryUpdateInput {
  return parseProductCategoryInputBase(raw);
}
