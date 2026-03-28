import type { StaffSession } from "@/features/auth/types";
import { findImageMediaById } from "@/features/media/repository";
import {
  canAccessProductCategories,
  canCreateProductCategories,
  canManageProductCategories,
} from "./access";
import {
  countProductCategories,
  countProductFamiliesForCategory,
  countProductFamiliesForSubcategories,
  createProductCategory,
  createProductCategoryAuditLog,
  deleteProductCategory,
  findProductCategoriesBySlugs,
  findProductCategoryById,
  findProductCategoryBySlug,
  findProductSubcategoriesByCategoryAndSlugs,
  listProductCategories,
  updateProductCategory,
} from "./repository";
import {
  mapProductCategoryToDetailDto,
  mapProductCategoryToListItemDto,
  toProductCategoryAuditSnapshot,
} from "./mappers";
import type {
  ProductCategoryCreateInput,
  ProductCategoryListQuery,
  ProductCategoryListResult,
  ProductCategoryUpdateInput,
} from "./types";

export class ProductCategoryServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function assertUniqueProductCategorySlug(
  slug: string,
  options?: { excludeCategoryId?: number },
) {
  const sameSlug = await findProductCategoryBySlug(slug);

  if (sameSlug && Number(sameSlug.id) !== (options?.excludeCategoryId ?? -1)) {
    throw new ProductCategoryServiceError(
      "Une catégorie produit avec ce slug existe déjà.",
      400,
    );
  }
}

async function assertUniqueProductSubcategorySlugs(
  categoryId: number | null,
  input: Pick<ProductCategoryCreateInput, "subcategories">,
) {
  const seenSlugs = new Set<string>();

  for (const subcategory of input.subcategories) {
    const normalizedSlug = subcategory.slug.trim();

    if (seenSlugs.has(normalizedSlug)) {
      throw new ProductCategoryServiceError(
        "Deux sous-catégories ne peuvent pas partager le même slug dans une même catégorie.",
        400,
      );
    }

    seenSlugs.add(normalizedSlug);
  }

  if (categoryId == null || input.subcategories.length === 0) {
    return;
  }

  const existing = await findProductSubcategoriesByCategoryAndSlugs({
    categoryId,
    slugs: input.subcategories.map((subcategory) => subcategory.slug),
  });

  const allowedIds = new Set(
    input.subcategories
      .map((subcategory) => subcategory.id)
      .filter((subcategoryId): subcategoryId is number => subcategoryId != null)
      .map(String),
  );

  for (const subcategory of existing) {
    if (!allowedIds.has(subcategory.id.toString())) {
      throw new ProductCategoryServiceError(
        `Le slug de sous-catégorie "${subcategory.slug}" est déjà utilisé dans cette catégorie.`,
        400,
      );
    }
  }
}

async function assertValidProductCategoryImage(imageMediaId: number | null) {
  if (imageMediaId == null) {
    return;
  }

  const media = await findImageMediaById(imageMediaId);
  if (!media) {
    throw new ProductCategoryServiceError(
      "L'image de catégorie sélectionnée est introuvable ou invalide.",
      400,
    );
  }
}

async function assertValidProductSubcategoryImages(
  input: Pick<ProductCategoryCreateInput, "subcategories">,
) {
  for (const subcategory of input.subcategories) {
    if (subcategory.imageMediaId == null) {
      continue;
    }

    const media = await findImageMediaById(subcategory.imageMediaId);
    if (!media) {
      throw new ProductCategoryServiceError(
        `L'image de la sous-catégorie "${subcategory.name}" est introuvable ou invalide.`,
        400,
      );
    }
  }
}

async function assertSafeRemovedSubcategories(
  categoryId: number,
  input: Pick<ProductCategoryUpdateInput, "subcategories">,
) {
  const before = await findProductCategoryById(categoryId);

  if (!before) {
    throw new ProductCategoryServiceError(
      "Catégorie produit introuvable.",
      404,
    );
  }

  const keptIds = new Set(
    input.subcategories
      .map((subcategory) => subcategory.id)
      .filter((subcategoryId): subcategoryId is number => subcategoryId != null),
  );

  const removedIds = before.subcategories
    .map((subcategory) => Number(subcategory.id))
    .filter((subcategoryId) => !keptIds.has(subcategoryId));

  if (removedIds.length === 0) {
    return;
  }

  const usage = await countProductFamiliesForSubcategories(removedIds);
  const linked = usage.find(
    (subcategory) => subcategory._count.productFamilies > 0,
  );

  if (linked) {
    throw new ProductCategoryServiceError(
      `Impossible de retirer la sous-catégorie "${linked.name}" car elle est encore liée à des familles produit.`,
      400,
    );
  }
}

export async function listProductCategoriesService(
  session: StaffSession,
  query: ProductCategoryListQuery,
): Promise<ProductCategoryListResult> {
  if (!canAccessProductCategories(session)) {
    throw new ProductCategoryServiceError("Accès refusé.", 403);
  }

  const [items, total] = await Promise.all([
    listProductCategories(query),
    countProductCategories(query),
  ]);

  return {
    items: items.map(mapProductCategoryToListItemDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getProductCategoryByIdService(
  session: StaffSession,
  categoryId: number,
) {
  if (!canAccessProductCategories(session)) {
    throw new ProductCategoryServiceError("Accès refusé.", 403);
  }

  const category = await findProductCategoryById(categoryId);
  if (!category) {
    throw new ProductCategoryServiceError(
      "Catégorie produit introuvable.",
      404,
    );
  }

  return mapProductCategoryToDetailDto(category);
}

export async function createProductCategoryService(
  session: StaffSession,
  input: ProductCategoryCreateInput,
) {
  if (!canCreateProductCategories(session)) {
    throw new ProductCategoryServiceError("Accès refusé.", 403);
  }

  await assertUniqueProductCategorySlug(input.slug);
  await assertUniqueProductSubcategorySlugs(null, input);
  await assertValidProductCategoryImage(input.imageMediaId);
  await assertValidProductSubcategoryImages(input);

  const category = await createProductCategory(input);

  await createProductCategoryAuditLog({
    actorUserId: session.id,
    actionType: "CREATE",
    entityId: String(category.id),
    targetLabel: category.name,
    summary: "Création d'une nouvelle catégorie produit",
    afterSnapshotJson: toProductCategoryAuditSnapshot(category),
  });

  return mapProductCategoryToDetailDto(category);
}

export async function updateProductCategoryService(
  session: StaffSession,
  categoryId: number,
  input: ProductCategoryUpdateInput,
) {
  if (!canManageProductCategories(session)) {
    throw new ProductCategoryServiceError("Accès refusé.", 403);
  }

  const before = await findProductCategoryById(categoryId);
  if (!before) {
    throw new ProductCategoryServiceError(
      "Catégorie produit introuvable.",
      404,
    );
  }

  await assertUniqueProductCategorySlug(input.slug, {
    excludeCategoryId: categoryId,
  });
  await assertUniqueProductSubcategorySlugs(categoryId, input);
  await assertValidProductCategoryImage(input.imageMediaId);
  await assertValidProductSubcategoryImages(input);
  await assertSafeRemovedSubcategories(categoryId, input);

  const category = await updateProductCategory(categoryId, input);

  await createProductCategoryAuditLog({
    actorUserId: session.id,
    actionType: "UPDATE",
    entityId: String(category.id),
    targetLabel: category.name,
    summary: "Mise à jour d'une catégorie produit",
    beforeSnapshotJson: toProductCategoryAuditSnapshot(before),
    afterSnapshotJson: toProductCategoryAuditSnapshot(category),
  });

  return mapProductCategoryToDetailDto(category);
}

export async function deleteProductCategoryService(
  session: StaffSession,
  categoryId: number,
) {
  if (!canManageProductCategories(session)) {
    throw new ProductCategoryServiceError("Accès refusé.", 403);
  }

  const before = await findProductCategoryById(categoryId);
  if (!before) {
    throw new ProductCategoryServiceError(
      "Catégorie produit introuvable.",
      404,
    );
  }

  const productFamilyCount = await countProductFamiliesForCategory(categoryId);
  if (productFamilyCount > 0) {
    throw new ProductCategoryServiceError(
      "Impossible de supprimer une catégorie encore liée à des familles produit via ses sous-catégories.",
      400,
    );
  }

  await deleteProductCategory(categoryId);

  await createProductCategoryAuditLog({
    actorUserId: session.id,
    actionType: "DELETE",
    entityId: String(before.id),
    targetLabel: before.name,
    summary: "Suppression d'une catégorie produit",
    beforeSnapshotJson: toProductCategoryAuditSnapshot(before),
  });
}
