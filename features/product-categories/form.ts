import type {
  ProductCategoryCreateInput,
  ProductCategoryDetailDto,
  ProductSubcategoryInput,
} from "./types";

export type ProductSubcategoryEditorState = {
  formKey: string;
  id: number | null;
  name: string;
  subtitle: string;
  slug: string;
  description: string;
  descriptionSeo: string;
  imageMediaId: number | null;
  sortOrder: string;
  isActive: boolean;
};

export type ProductCategoryEditorFormState = {
  name: string;
  subtitle: string;
  slug: string;
  description: string;
  descriptionSeo: string;
  imageMediaId: number | null;
  sortOrder: string;
  isActive: boolean;
  subcategories: ProductSubcategoryEditorState[];
};

function createFormKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyProductSubcategoryEditorState(
  overrides: Partial<ProductSubcategoryEditorState> = {},
): ProductSubcategoryEditorState {
  return {
    formKey: overrides.formKey ?? createFormKey(),
    id: overrides.id ?? null,
    name: overrides.name ?? "",
    subtitle: overrides.subtitle ?? "",
    slug: overrides.slug ?? "",
    description: overrides.description ?? "",
    descriptionSeo: overrides.descriptionSeo ?? "",
    imageMediaId: overrides.imageMediaId ?? null,
    sortOrder: overrides.sortOrder ?? "0",
    isActive: overrides.isActive ?? true,
  };
}

export function createEmptyProductCategoryEditorFormState(): ProductCategoryEditorFormState {
  return {
    name: "",
    subtitle: "",
    slug: "",
    description: "",
    descriptionSeo: "",
    imageMediaId: null,
    sortOrder: "0",
    isActive: true,
    subcategories: [],
  };
}

export function reindexProductSubcategoryEditorStates(
  subcategories: ProductSubcategoryEditorState[],
): ProductSubcategoryEditorState[] {
  return subcategories.map((subcategory, index) => ({
    ...subcategory,
    sortOrder: String(index),
  }));
}

export function productCategoryDetailToFormState(
  category: ProductCategoryDetailDto | null,
): ProductCategoryEditorFormState {
  if (!category) {
    return createEmptyProductCategoryEditorFormState();
  }

  return {
    name: category.name,
    subtitle: category.subtitle ?? "",
    slug: category.slug,
    description: category.description ?? "",
    descriptionSeo: category.descriptionSeo ?? "",
    imageMediaId: category.imageMediaId ?? null,
    sortOrder: String(category.sortOrder),
    isActive: category.isActive,
    subcategories: reindexProductSubcategoryEditorStates(
      category.subcategories.map((subcategory, index) =>
        createEmptyProductSubcategoryEditorState({
          id: subcategory.id,
          name: subcategory.name,
          subtitle: subcategory.subtitle ?? "",
          slug: subcategory.slug,
          description: subcategory.description ?? "",
          descriptionSeo: subcategory.descriptionSeo ?? "",
          imageMediaId: subcategory.imageMediaId ?? null,
          sortOrder: String(subcategory.sortOrder ?? index),
          isActive: subcategory.isActive,
        }),
      ),
    ),
  };
}

function subcategoryEditorStateToPayload(
  state: ProductSubcategoryEditorState,
  index: number,
): ProductSubcategoryInput {
  const sortOrderRaw = state.sortOrder.trim();
  const parsedSortOrder =
    sortOrderRaw === ""
      ? index
      : Number.isInteger(Number(sortOrderRaw))
        ? Number(sortOrderRaw)
        : index;

  return {
    id: state.id,
    name: state.name.trim(),
    subtitle: state.subtitle.trim() || null,
    slug: state.slug.trim(),
    description: state.description.trim() || null,
    descriptionSeo: state.descriptionSeo.trim() || null,
    imageMediaId: state.imageMediaId,
    sortOrder: parsedSortOrder,
    isActive: state.isActive,
  };
}

export function productCategoryEditorFormToPayload(
  state: ProductCategoryEditorFormState,
): ProductCategoryCreateInput {
  const sortOrderRaw = state.sortOrder.trim();
  const parsedSortOrder =
    sortOrderRaw === ""
      ? 0
      : Number.isInteger(Number(sortOrderRaw))
        ? Number(sortOrderRaw)
        : 0;

  return {
    name: state.name.trim(),
    subtitle: state.subtitle.trim() || null,
    slug: state.slug.trim(),
    description: state.description.trim() || null,
    descriptionSeo: state.descriptionSeo.trim() || null,
    imageMediaId: state.imageMediaId,
    sortOrder: parsedSortOrder,
    isActive: state.isActive,
    subcategories: state.subcategories.map(subcategoryEditorStateToPayload),
  };
}
