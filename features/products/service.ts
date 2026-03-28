import type { StaffSession } from "@/features/auth/types";
import {
  findActiveMediaByIds,
  findImageMediaById,
} from "@/features/media/repository";
import { resolveOrCreateTagsByNames } from "@/features/tags/repository";
import { parseRawProductAttributeValue } from "./attribute-values";
import { canAccessProducts, canCreateProducts, canManageProducts } from "./access";
import {
  countProducts,
  createProduct,
  createProductAuditLog,
  deleteProduct,
  findBrandOptionById,
  findProductBySlug,
  findProductById,
  findProductBySignature,
  findProductSubcategoryOptionsByIds,
  findProductVariantsBySkus,
  findProductVariantsBySlugs,
  listProductBrands,
  listProductSubcategoriesOptions,
  listProducts,
  updateProduct,
} from "./repository";
import {
  mapProductBrandOptionDto,
  mapProductSubcategoryOptionDto,
  mapProductToDetailDto,
  mapProductToListItemDto,
  toProductAuditSnapshot,
} from "./mappers";
import type {
  ProductCreateInput,
  ProductFormOptionsDto,
  ProductListQuery,
  ProductListResult,
  ProductUpdateInput,
} from "./types";

export class ProductServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function normalizeVariantIds(input: Pick<ProductCreateInput, "variants">) {
  return input.variants.map((variant) => ({
    ...variant,
    id: variant.id ?? null,
    mediaIds: Array.from(new Set(variant.mediaIds)),
    attributeValues: variant.attributeValues.map((attributeValue) => ({
      ...attributeValue,
      attributeId: attributeValue.attributeId ?? null,
      attributeTempKey: attributeValue.attributeTempKey ?? null,
    })),
  }));
}

function normalizeAttributeIds(input: Pick<ProductCreateInput, "attributes">) {
  return input.attributes.map((attribute) => ({
    ...attribute,
    id: attribute.id ?? null,
  }));
}

function assertValidProductAttributes(
  input: Pick<ProductCreateInput, "attributes" | "variants">,
  options?: { allowedAttributeIds?: readonly number[] },
) {
  const seenAttributeNames = new Set<string>();
  const seenTempKeys = new Set<string>();
  const allowedAttributeIds = new Set(options?.allowedAttributeIds ?? []);
  const attributesById = new Map<number, ProductCreateInput["attributes"][number]>();
  const attributesByTempKey = new Map<
    string,
    ProductCreateInput["attributes"][number]
  >();

  for (const attribute of input.attributes) {
    const normalizedName = attribute.name.trim().toLocaleLowerCase("fr");
    if (seenAttributeNames.has(normalizedName)) {
      throw new ProductServiceError(
        "Deux attributs de famille ne peuvent pas partager le meme nom.",
        400,
      );
    }

    if (seenTempKeys.has(attribute.tempKey)) {
      throw new ProductServiceError(
        "Deux attributs de famille utilisent la meme cle temporaire.",
        400,
      );
    }

    if (attribute.id != null && !allowedAttributeIds.has(attribute.id)) {
      throw new ProductServiceError(
        "Un attribut transmis n'appartient pas a cette famille produit.",
        400,
      );
    }

    seenAttributeNames.add(normalizedName);
    seenTempKeys.add(attribute.tempKey);

    if (attribute.id != null) {
      attributesById.set(attribute.id, attribute);
    }
    attributesByTempKey.set(attribute.tempKey, attribute);
  }

  for (const variant of input.variants) {
    const seenVariantAttributes = new Set<string>();

    for (const attributeValue of variant.attributeValues) {
      const attribute =
        (attributeValue.attributeId != null
          ? attributesById.get(attributeValue.attributeId)
          : undefined) ??
        (attributeValue.attributeTempKey != null
          ? attributesByTempKey.get(attributeValue.attributeTempKey)
          : undefined);

      if (!attribute) {
        throw new ProductServiceError(
          "Une valeur de variante reference un attribut inexistant.",
          400,
        );
      }

      const attributeKey =
        attribute.id != null
          ? `id:${attribute.id}`
          : `temp:${attribute.tempKey}`;

      if (seenVariantAttributes.has(attributeKey)) {
        throw new ProductServiceError(
          "Une variante ne peut pas definir deux fois le meme attribut.",
          400,
        );
      }

      seenVariantAttributes.add(attributeKey);

      try {
        parseRawProductAttributeValue(attribute.dataType, attributeValue.value);
      } catch (error: unknown) {
        throw new ProductServiceError(
          error instanceof Error
            ? error.message
            : "Une valeur d'attribut de variante est invalide.",
          400,
        );
      }
    }
  }
}

function assertValidVariantPrices(input: Pick<ProductCreateInput, "variants">) {
  for (const variant of input.variants) {
    if (
      variant.currentPriceAmount != null &&
      variant.basePriceAmount == null
    ) {
      throw new ProductServiceError(
        "Le prix courant d'une variante nécessite un prix de base.",
        400,
      );
    }
  }
}

async function assertValidProductVariants(
  input: Pick<ProductCreateInput, "variants">,
  options?: { allowedVariantIds?: readonly number[] },
) {
  const seenSlugs = new Set<string>();
  const seenSkus = new Set<string>();

  for (const variant of input.variants) {
    if (seenSlugs.has(variant.slug)) {
      throw new ProductServiceError(
        "Deux variantes ne peuvent pas partager le meme slug.",
        400,
      );
    }

    if (seenSkus.has(variant.sku)) {
      throw new ProductServiceError(
        "Deux variantes ne peuvent pas partager le meme SKU.",
        400,
      );
    }

    seenSlugs.add(variant.slug);
    seenSkus.add(variant.sku);
  }

  const allowedIds = new Set(options?.allowedVariantIds ?? []);

  for (const variant of input.variants) {
    if (variant.id != null && !allowedIds.has(variant.id)) {
      throw new ProductServiceError(
        "Une variante transmise n'appartient pas a cette famille produit.",
        400,
      );
    }
  }

  const [existingBySlug, existingBySku] = await Promise.all([
    findProductVariantsBySlugs(input.variants.map((variant) => variant.slug)),
    findProductVariantsBySkus(input.variants.map((variant) => variant.sku)),
  ]);

  const allowedBigIntIds = new Set(
    input.variants
      .map((variant) => variant.id)
      .filter((variantId): variantId is number => variantId != null)
      .map((variantId) => BigInt(variantId)),
  );

  for (const existingVariant of existingBySlug) {
    if (!allowedBigIntIds.has(existingVariant.id)) {
      throw new ProductServiceError(
        `Le slug de variante "${existingVariant.slug}" est deja utilise.`,
        400,
      );
    }
  }

  for (const existingVariant of existingBySku) {
    if (!allowedBigIntIds.has(existingVariant.id)) {
      throw new ProductServiceError(
        `Le SKU "${existingVariant.sku}" est deja utilise.`,
        400,
      );
    }
  }
}

async function assertUniqueProductInput(
  input: Pick<ProductCreateInput, "slug" | "brandId" | "name">,
  options?: { excludeProductId?: number },
) {
  const [sameSlug, sameSignature] = await Promise.all([
    findProductBySlug(input.slug),
    input.brandId != null
      ? findProductBySignature(input.brandId, input.name)
      : Promise.resolve(null),
  ]);

  if (sameSlug && Number(sameSlug.id) !== (options?.excludeProductId ?? -1)) {
    throw new ProductServiceError("Un produit avec ce slug existe deja.", 400);
  }

  if (
    sameSignature &&
    Number(sameSignature.id) !== (options?.excludeProductId ?? -1)
  ) {
    throw new ProductServiceError(
      "Un produit avec cette marque et ce nom existe deja.",
      400,
    );
  }
}

async function assertValidProductRelations(
  input: ProductCreateInput,
  options?: { currentBrandId?: number | null },
) {
  const [brand, productSubcategories] = await Promise.all([
    input.brandId != null
      ? findBrandOptionById(input.brandId)
      : Promise.resolve(null),
    findProductSubcategoryOptionsByIds(input.productSubcategoryIds),
  ]);

  if (input.brandId != null && !brand) {
    throw new ProductServiceError("Marque introuvable.", 400);
  }

  if (
    input.brandId != null &&
    brand != null &&
    !brand.isProductBrand &&
    input.brandId !== (options?.currentBrandId ?? -1)
  ) {
    throw new ProductServiceError(
      "Cette marque ne peut pas etre utilisee pour les produits.",
      400,
    );
  }

  if (
    productSubcategories.length !== new Set(input.productSubcategoryIds).size
  ) {
    throw new ProductServiceError(
      "Au moins une sous-catégorie produit est introuvable.",
      400,
    );
  }
}

async function assertValidProductMedia(
  input: Pick<ProductCreateInput, "mainImageMediaId" | "variants">,
) {
  if (input.mainImageMediaId != null) {
    const mainImage = await findImageMediaById(input.mainImageMediaId);

    if (!mainImage) {
      throw new ProductServiceError(
        "L'image principale sélectionnée est introuvable ou invalide.",
        400,
      );
    }
  }

  const variantMediaIds = input.variants.flatMap((variant) => variant.mediaIds);
  if (variantMediaIds.length === 0) {
    return;
  }

  const media = await findActiveMediaByIds(variantMediaIds);

  if (media.length !== new Set(variantMediaIds).size) {
    throw new ProductServiceError(
      "Au moins un média de variante est introuvable ou inactif.",
      400,
    );
  }
}

export async function listProductsService(
  session: StaffSession,
  query: ProductListQuery,
): Promise<ProductListResult> {
  if (!canAccessProducts(session)) {
    throw new ProductServiceError("AccÃ¨s refusé.", 403);
  }

  const [items, total] = await Promise.all([
    listProducts(query),
    countProducts(query),
  ]);

  return {
    items: items.map(mapProductToListItemDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getProductFormOptionsService(
  session: StaffSession,
): Promise<ProductFormOptionsDto> {
  if (!canAccessProducts(session)) {
    throw new ProductServiceError("AccÃ¨s refusé.", 403);
  }

  const [brands, productSubcategories] = await Promise.all([
    listProductBrands(),
    listProductSubcategoriesOptions(),
  ]);

  return {
    brands: brands.map(mapProductBrandOptionDto),
    productSubcategories: productSubcategories.map(
      mapProductSubcategoryOptionDto,
    ),
  };
}

export async function getProductByIdService(
  session: StaffSession,
  productId: number,
) {
  if (!canAccessProducts(session)) {
    throw new ProductServiceError("AccÃ¨s refusé.", 403);
  }

  const product = await findProductById(productId);
  if (!product) {
    throw new ProductServiceError("Produit introuvable.", 404);
  }

  return mapProductToDetailDto(product);
}

export async function createProductService(
  session: StaffSession,
  input: ProductCreateInput,
) {
  if (!canCreateProducts(session)) {
    throw new ProductServiceError("AccÃ¨s refusé.", 403);
  }

  await assertUniqueProductInput(input);
  await assertValidProductRelations(input);
  await assertValidProductMedia(input);
  assertValidProductAttributes(input);
  assertValidVariantPrices(input);
  await assertValidProductVariants(input);
  const resolvedTags = await resolveOrCreateTagsByNames(input.tagNames);
  const attributes = normalizeAttributeIds(input);
  const variants = normalizeVariantIds(input);

  const product = await createProduct({
    ...input,
    tagIds: resolvedTags.map((tag) => Number(tag.id)),
    attributes,
    variants,
  });

  await createProductAuditLog({
    actorUserId: session.id,
    actionType: "CREATE",
    entityId: String(product.id),
    targetLabel: product.name,
    summary: "Création d'une nouvelle famille produit",
    afterSnapshotJson: toProductAuditSnapshot(product),
  });

  return mapProductToDetailDto(product);
}

export async function updateProductService(
  session: StaffSession,
  productId: number,
  input: ProductUpdateInput,
) {
  if (!canManageProducts(session)) {
    throw new ProductServiceError("AccÃ¨s refusé.", 403);
  }

  const before = await findProductById(productId);
  if (!before) {
    throw new ProductServiceError("Produit introuvable.", 404);
  }

  await assertUniqueProductInput(input, { excludeProductId: productId });
  await assertValidProductRelations(input, {
    currentBrandId: before.brand != null ? Number(before.brand.id) : null,
  });
  await assertValidProductMedia(input);
  assertValidProductAttributes(input, {
    allowedAttributeIds: before.attributeValues.map((attributeLink) =>
      Number(attributeLink.attribute.id),
    ),
  });
  assertValidVariantPrices(input);
  await assertValidProductVariants(input, {
    allowedVariantIds: before.variants.map((variant) => Number(variant.id)),
  });
  const resolvedTags = await resolveOrCreateTagsByNames(input.tagNames);
  const attributes = normalizeAttributeIds(input);
  const variants = normalizeVariantIds(input);

  const product = await updateProduct(productId, {
    ...input,
    tagIds: resolvedTags.map((tag) => Number(tag.id)),
    attributes,
    variants,
  });

  await createProductAuditLog({
    actorUserId: session.id,
    actionType: "UPDATE",
    entityId: String(product.id),
    targetLabel: product.name,
    summary: "Mise Ã  jour d'une famille produit",
    beforeSnapshotJson: toProductAuditSnapshot(before),
    afterSnapshotJson: toProductAuditSnapshot(product),
  });

  return mapProductToDetailDto(product);
}

export async function deleteProductService(
  session: StaffSession,
  productId: number,
) {
  if (!canManageProducts(session)) {
    throw new ProductServiceError("AccÃ¨s refusé.", 403);
  }

  const before = await findProductById(productId);
  if (!before) {
    throw new ProductServiceError("Produit introuvable.", 404);
  }

  const deleted = await deleteProduct(productId);

  await createProductAuditLog({
    actorUserId: session.id,
    actionType: "DELETE",
    entityId: String(deleted.id),
    targetLabel: deleted.name,
    summary: "Suppression d'une famille produit",
    beforeSnapshotJson: toProductAuditSnapshot(before),
  });
}

