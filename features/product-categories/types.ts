export const PRODUCT_CATEGORY_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type ProductCategoryPageSize =
  (typeof PRODUCT_CATEGORY_PAGE_SIZE_OPTIONS)[number];

export type ProductCategoryListQuery = {
  page: number;
  pageSize: ProductCategoryPageSize;
  q?: string;
  tree?: boolean;
};

export type ProductSubcategoryInput = {
  id?: number | null;
  name: string;
  subtitle: string | null;
  slug: string;
  description: string | null;
  descriptionSeo: string | null;
  imageMediaId: number | null;
  sortOrder: number;
  isActive: boolean;
};

export type ProductCategoryCreateInput = {
  name: string;
  subtitle: string | null;
  slug: string;
  description: string | null;
  descriptionSeo: string | null;
  imageMediaId: number | null;
  sortOrder: number;
  isActive: boolean;
  subcategories: ProductSubcategoryInput[];
};

export type ProductCategoryUpdateInput = ProductCategoryCreateInput;

export type ProductSubcategoryListItemDto = {
  id: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  name: string;
  subtitle: string | null;
  slug: string;
  description: string | null;
  descriptionSeo: string | null;
  imageMediaId: number | null;
  sortOrder: number;
  isActive: boolean;
  productFamilyCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductCategoryListItemDto = {
  id: number;
  name: string;
  subtitle: string | null;
  slug: string;
  description: string | null;
  descriptionSeo: string | null;
  imageMediaId: number | null;
  sortOrder: number;
  isActive: boolean;
  subcategoryCount: number;
  productFamilyCount: number;
  subcategories: ProductSubcategoryListItemDto[];
  createdAt: string;
  updatedAt: string;
};

export type ProductCategoryDetailDto = ProductCategoryListItemDto;

export type ProductCategoryListResult = {
  items: ProductCategoryListItemDto[];
  total: number;
  page: number;
  pageSize: number;
};
