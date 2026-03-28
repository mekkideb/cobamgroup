import type {
  ProductCategoryDetailDto,
  ProductCategoryListItemDto,
  ProductSubcategoryListItemDto,
} from "./types";

type ProductSubcategoryWithCounts = {
  id: bigint;
  categoryId: bigint;
  name: string;
  subtitle: string | null;
  slug: string;
  description: string | null;
  descriptionSeo: string | null;
  imageMediaId: bigint | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    productFamilies: number;
  };
};

type ProductCategoryWithRelations = {
  id: bigint;
  name: string;
  subtitle: string | null;
  slug: string;
  description: string | null;
  descriptionSeo: string | null;
  imageMediaId: bigint | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  subcategories: ProductSubcategoryWithCounts[];
  _count: {
    subcategories: number;
  };
};

function toNumber(value: bigint | null | undefined): number | null {
  return value == null ? null : Number(value);
}

function mapProductSubcategoryToListItemDto(
  category: Pick<ProductCategoryWithRelations, "id" | "name" | "slug">,
  subcategory: ProductSubcategoryWithCounts,
): ProductSubcategoryListItemDto {
  return {
    id: Number(subcategory.id),
    categoryId: Number(category.id),
    categoryName: category.name,
    categorySlug: category.slug,
    name: subcategory.name,
    subtitle: subcategory.subtitle,
    slug: subcategory.slug,
    description: subcategory.description,
    descriptionSeo: subcategory.descriptionSeo,
    imageMediaId: toNumber(subcategory.imageMediaId),
    sortOrder: subcategory.sortOrder,
    isActive: subcategory.isActive,
    productFamilyCount: subcategory._count.productFamilies,
    createdAt: subcategory.createdAt.toISOString(),
    updatedAt: subcategory.updatedAt.toISOString(),
  };
}

export function mapProductCategoryToListItemDto(
  category: ProductCategoryWithRelations,
): ProductCategoryListItemDto {
  const subcategories = category.subcategories.map((subcategory) =>
    mapProductSubcategoryToListItemDto(category, subcategory),
  );

  return {
    id: Number(category.id),
    name: category.name,
    subtitle: category.subtitle,
    slug: category.slug,
    description: category.description,
    descriptionSeo: category.descriptionSeo,
    imageMediaId: toNumber(category.imageMediaId),
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    subcategoryCount: category._count.subcategories,
    productFamilyCount: subcategories.reduce(
      (total, subcategory) => total + subcategory.productFamilyCount,
      0,
    ),
    subcategories,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export function mapProductCategoryToDetailDto(
  category: ProductCategoryWithRelations,
): ProductCategoryDetailDto {
  return mapProductCategoryToListItemDto(category);
}

export function toProductCategoryAuditSnapshot(value: unknown): unknown {
  if (value == null) return value;

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(toProductCategoryAuditSnapshot);
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = toProductCategoryAuditSnapshot(item);
    }
    return result;
  }

  return value;
}
