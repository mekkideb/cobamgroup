import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db/prisma";
import { parseRawProductAttributeValue } from "./attribute-values";
import { slugifyProductName } from "./slug";
import type {
  ProductAttributeDataType,
  ProductListQuery,
} from "./types";

type ResolvedProductAttributeInput = {
  tempKey: string;
  id: number | null;
  name: string;
  dataType: ProductAttributeDataType;
  unit: string | null;
  sortOrder: number;
};

type ResolvedProductVariantAttributeValueInput = {
  attributeId: number | null;
  attributeTempKey: string | null;
  value: string | null;
};

type ResolvedProductInput = {
  brandId: number | null;
  productSubcategoryIds: number[];
  mainImageMediaId: number | null;
  name: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  description: string | null;
  descriptionSeo: string | null;
  lifecycleStatus: "DRAFT" | "ACTIVE" | "ARCHIVED";
  visibility: "HIDDEN" | "PUBLIC";
  isPromoted: boolean;
  tagIds: number[];
  attributes: ResolvedProductAttributeInput[];
  variants: ResolvedProductVariantInput[];
};

type ResolvedProductVariantInput = {
  id: number | null;
  sku: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  lifecycleStatus: "DRAFT" | "ACTIVE" | "ARCHIVED";
  visibility: "HIDDEN" | "PUBLIC";
  commercialMode: "REFERENCE_ONLY" | "QUOTE_ONLY" | "SELLABLE";
  priceVisibility: "HIDDEN" | "VISIBLE";
  isPromoted: boolean;
  basePriceAmount: string | null;
  currentPriceAmount: string | null;
  sortOrder: number;
  mediaIds: number[];
  attributeValues: ResolvedProductVariantAttributeValueInput[];
};

type ResolvedAttributeDefinition = {
  tempKey: string;
  id: bigint;
  dataType: ProductAttributeDataType;
};

function buildProductWhere(query: ProductListQuery): Prisma.ProductFamilyWhereInput {
  const where: Prisma.ProductFamilyWhereInput = {};

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { slug: { contains: query.q, mode: "insensitive" } },
      { subtitle: { contains: query.q, mode: "insensitive" } },
      { excerpt: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
      { brand: { name: { contains: query.q, mode: "insensitive" } } },
      {
        subcategories: {
          some: {
            name: { contains: query.q, mode: "insensitive" },
          },
        },
      },
      {
        subcategories: {
          some: {
            category: {
              name: { contains: query.q, mode: "insensitive" },
            },
          },
        },
      },
      { variants: { some: { title: { contains: query.q, mode: "insensitive" } } } },
      { variants: { some: { sku: { contains: query.q, mode: "insensitive" } } } },
      { variants: { some: { slug: { contains: query.q, mode: "insensitive" } } } },
      {
        attributeValues: {
          some: {
            attribute: {
              name: { contains: query.q, mode: "insensitive" },
            },
          },
        },
      },
    ];
  }

  if (query.brandId != null) {
    where.brandId = BigInt(query.brandId);
  }

  if (query.productSubcategoryId != null) {
    where.subcategories = {
      some: {
        id: BigInt(query.productSubcategoryId),
      },
    };
  }

  return where;
}

const productFamilyListSelect = {
  id: true,
  name: true,
  slug: true,
  subtitle: true,
  excerpt: true,
  description: true,
  lifecycleStatus: true,
  visibility: true,
  isPromoted: true,
  createdAt: true,
  updatedAt: true,
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  subcategories: {
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      categoryId: true,
      name: true,
      slug: true,
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  },
  _count: {
    select: {
      variants: true,
      tagLinks: true,
    },
  },
} satisfies Prisma.ProductFamilySelect;

const productLinkedMediaSelect = {
  id: true,
  kind: true,
  title: true,
  originalFilename: true,
  altText: true,
  mimeType: true,
  extension: true,
  widthPx: true,
  heightPx: true,
  sizeBytes: true,
} satisfies Prisma.MediaSelect;

const productFamilyDetailSelect = {
  ...productFamilyListSelect,
  descriptionSeo: true,
  mediaLinks: {
    where: {
      role: "COVER",
    },
    orderBy: [{ sortOrder: "asc" }, { mediaId: "asc" }],
    select: {
      media: {
        select: productLinkedMediaSelect,
      },
    },
  },
  defaultVariant: {
    select: {
      id: true,
      sku: true,
      title: true,
      slug: true,
    },
  },
  tagLinks: {
    orderBy: {
      tag: {
        name: "asc",
      },
    },
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
  attributeValues: {
    orderBy: [
      { attribute: { sortOrder: "asc" } },
      { attribute: { name: "asc" } },
    ],
    select: {
      attribute: {
        select: {
          id: true,
          key: true,
          name: true,
          slug: true,
          dataType: true,
          unit: true,
          sortOrder: true,
        },
      },
    },
  },
  variants: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      sku: true,
      slug: true,
      title: true,
      subtitle: true,
      description: true,
      lifecycleStatus: true,
      visibility: true,
      commercialMode: true,
      priceVisibility: true,
      isPromoted: true,
      currencyCode: true,
      basePriceAmount: true,
      currentPriceAmount: true,
      sortOrder: true,
      mediaLinks: {
        where: {
          role: "GALLERY",
        },
        orderBy: [{ sortOrder: "asc" }, { mediaId: "asc" }],
        select: {
          media: {
            select: productLinkedMediaSelect,
          },
        },
      },
      attributeValues: {
        orderBy: [
          { attribute: { sortOrder: "asc" } },
          { attribute: { name: "asc" } },
        ],
        select: {
          attributeId: true,
          valueText: true,
          valueNumber: true,
          valueBoolean: true,
          valueJson: true,
          attribute: {
            select: {
              dataType: true,
            },
          },
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ProductFamilySelect;

function buildUniqueAttributeIdentifier(
  name: string,
  index: number,
): string {
  const baseSlug = slugifyProductName(name) || "attribute";
  return `${baseSlug}-${Date.now()}-${index}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

async function resolveProductAttributeDefinitions(
  tx: Prisma.TransactionClient,
  attributes: ResolvedProductAttributeInput[],
) {
  const resolved: ResolvedAttributeDefinition[] = [];

  for (const [index, attribute] of attributes.entries()) {
    if (attribute.id != null) {
      const updated = await tx.productAttributeDefinition.update({
        where: { id: BigInt(attribute.id) },
        data: {
          name: attribute.name,
          dataType: attribute.dataType,
          unit: attribute.unit,
          scope: "VARIANT",
          sortOrder: attribute.sortOrder,
        },
        select: {
          id: true,
          dataType: true,
        },
      });

      resolved.push({
        tempKey: attribute.tempKey,
        id: updated.id,
        dataType: updated.dataType,
      });
      continue;
    }

    const uniqueIdentifier = buildUniqueAttributeIdentifier(attribute.name, index);
    const created = await tx.productAttributeDefinition.create({
      data: {
        key: uniqueIdentifier,
        name: attribute.name,
        slug: uniqueIdentifier,
        scope: "VARIANT",
        dataType: attribute.dataType,
        unit: attribute.unit,
        sortOrder: attribute.sortOrder,
      },
      select: {
        id: true,
        dataType: true,
      },
    });

    resolved.push({
      tempKey: attribute.tempKey,
      id: created.id,
      dataType: created.dataType,
    });
  }

  return resolved;
}

async function syncProductFamilyAttributes(
  tx: Prisma.TransactionClient,
  familyId: bigint,
  attributes: ResolvedAttributeDefinition[],
) {
  const attributeIds = attributes.map((attribute) => attribute.id);

  await tx.productFamilyAttributeValue.deleteMany({
    where: attributeIds.length
      ? {
          familyId,
          attributeId: {
            notIn: attributeIds,
          },
        }
      : {
          familyId,
        },
  });

  for (const attribute of attributes) {
    await tx.productFamilyAttributeValue.upsert({
      where: {
        familyId_attributeId: {
          familyId,
          attributeId: attribute.id,
        },
      },
      update: {
        optionId: null,
        valueText: null,
        valueNumber: null,
        valueBoolean: null,
        valueJson: Prisma.JsonNull,
      },
      create: {
        familyId,
        attributeId: attribute.id,
        optionId: null,
        valueText: null,
        valueNumber: null,
        valueBoolean: null,
        valueJson: Prisma.JsonNull,
      },
    });
  }
}

async function syncProductVariantAttributeValues(
  tx: Prisma.TransactionClient,
  variantId: bigint,
  attributeDefinitions: ResolvedAttributeDefinition[],
  attributeValues: ResolvedProductVariantAttributeValueInput[],
) {
  const definitionsById = new Map(
    attributeDefinitions.map((attribute) => [attribute.id.toString(), attribute]),
  );
  const definitionsByTempKey = new Map(
    attributeDefinitions.map((attribute) => [attribute.tempKey, attribute]),
  );

  const resolvedValues = attributeValues
    .map((attributeValue) => {
      const attributeDefinition =
        (attributeValue.attributeId != null
          ? definitionsById.get(String(attributeValue.attributeId))
          : null) ??
        (attributeValue.attributeTempKey != null
          ? definitionsByTempKey.get(attributeValue.attributeTempKey)
          : null);

      if (!attributeDefinition) {
        return null;
      }

      const parsedValue = parseRawProductAttributeValue(
        attributeDefinition.dataType,
        attributeValue.value,
      );

      if (
        parsedValue.valueText == null &&
        parsedValue.valueNumber == null &&
        parsedValue.valueBoolean == null &&
        parsedValue.valueJson == null
      ) {
        return null;
      }

      return {
        attributeId: attributeDefinition.id,
        parsedValue,
      };
    })
    .filter((value): value is NonNullable<typeof value> => value != null);

  const keptAttributeIds = resolvedValues.map((value) => value.attributeId);

  await tx.productVariantAttributeValue.deleteMany({
    where: keptAttributeIds.length
      ? {
          variantId,
          attributeId: {
            notIn: keptAttributeIds,
          },
        }
      : {
          variantId,
        },
  });

  for (const resolvedValue of resolvedValues) {
    await tx.productVariantAttributeValue.upsert({
      where: {
        variantId_attributeId: {
          variantId,
          attributeId: resolvedValue.attributeId,
        },
      },
      update: {
        optionId: null,
        valueText: resolvedValue.parsedValue.valueText,
        valueNumber: resolvedValue.parsedValue.valueNumber,
        valueBoolean: resolvedValue.parsedValue.valueBoolean,
        valueJson:
          resolvedValue.parsedValue.valueJson == null
            ? Prisma.JsonNull
            : (resolvedValue.parsedValue.valueJson as Prisma.InputJsonValue),
      },
      create: {
        variantId,
        attributeId: resolvedValue.attributeId,
        optionId: null,
        valueText: resolvedValue.parsedValue.valueText,
        valueNumber: resolvedValue.parsedValue.valueNumber,
        valueBoolean: resolvedValue.parsedValue.valueBoolean,
        valueJson:
          resolvedValue.parsedValue.valueJson == null
            ? Prisma.JsonNull
            : (resolvedValue.parsedValue.valueJson as Prisma.InputJsonValue),
      },
    });
  }
}

async function syncProductFamilyCoverMedia(
  tx: Prisma.TransactionClient,
  familyId: bigint,
  mediaId: number | null,
) {
  const mediaIdValue = mediaId != null ? BigInt(mediaId) : null;

  await tx.productFamilyMediaLink.deleteMany({
    where: mediaIdValue
      ? {
          familyId,
          mediaId: {
            not: mediaIdValue,
          },
        }
      : {
          familyId,
        },
  });

  if (!mediaIdValue) {
    return;
  }

  await tx.productFamilyMediaLink.upsert({
    where: {
      familyId_mediaId: {
        familyId,
        mediaId: mediaIdValue,
      },
    },
    update: {
      role: "COVER",
      sortOrder: 0,
    },
    create: {
      familyId,
      mediaId: mediaIdValue,
      role: "COVER",
      sortOrder: 0,
    },
  });
}

async function syncProductVariantMediaLinks(
  tx: Prisma.TransactionClient,
  variantId: bigint,
  mediaIds: readonly number[],
) {
  const uniqueMediaIds = [...new Set(mediaIds)].map((mediaId) => BigInt(mediaId));

  await tx.productVariantMediaLink.deleteMany({
    where: uniqueMediaIds.length
      ? {
          variantId,
          mediaId: {
            notIn: uniqueMediaIds,
          },
        }
      : {
          variantId,
        },
  });

  for (const [index, mediaId] of uniqueMediaIds.entries()) {
    await tx.productVariantMediaLink.upsert({
      where: {
        variantId_mediaId: {
          variantId,
          mediaId,
        },
      },
      update: {
        role: "GALLERY",
        sortOrder: index,
      },
      create: {
        variantId,
        mediaId,
        role: "GALLERY",
        sortOrder: index,
      },
    });
  }
}

async function syncProductVariants(
  tx: Prisma.TransactionClient,
  familyId: bigint,
  variants: ResolvedProductVariantInput[],
  attributes: ResolvedAttributeDefinition[],
) {
  const keptVariantIds = variants
    .map((variant) => variant.id)
    .filter((variantId): variantId is number => variantId != null)
    .map((variantId) => BigInt(variantId));

  await tx.productVariant.deleteMany({
    where: keptVariantIds.length
      ? {
          familyId,
          id: {
            notIn: keptVariantIds,
          },
        }
      : {
          familyId,
        },
  });

  const savedVariantIds: bigint[] = [];

  for (const variant of variants) {
    const data = {
      familyId,
      sku: variant.sku,
      slug: variant.slug,
      title: variant.title,
      subtitle: variant.subtitle,
      description: variant.description,
      lifecycleStatus: variant.lifecycleStatus,
      visibility: variant.visibility,
      commercialMode: variant.commercialMode,
      priceVisibility: variant.priceVisibility,
      isPromoted: variant.isPromoted,
      currencyCode: "EUR",
      basePriceAmount:
        variant.basePriceAmount != null
          ? new Prisma.Decimal(variant.basePriceAmount)
          : null,
      currentPriceAmount:
        variant.currentPriceAmount != null
          ? new Prisma.Decimal(variant.currentPriceAmount)
          : null,
      sortOrder: variant.sortOrder,
    };

    if (variant.id != null) {
      const updated = await tx.productVariant.update({
        where: { id: BigInt(variant.id) },
        data,
        select: {
          id: true,
        },
      });

      await syncProductVariantAttributeValues(
        tx,
        updated.id,
        attributes,
        variant.attributeValues,
      );
      await syncProductVariantMediaLinks(tx, updated.id, variant.mediaIds);

      savedVariantIds.push(updated.id);
      continue;
    }

    const created = await tx.productVariant.create({
      data,
      select: {
        id: true,
      },
    });

    await syncProductVariantAttributeValues(
      tx,
      created.id,
      attributes,
      variant.attributeValues,
    );
    await syncProductVariantMediaLinks(tx, created.id, variant.mediaIds);

    savedVariantIds.push(created.id);
  }

  await tx.productFamily.update({
    where: { id: familyId },
    data: {
      defaultVariantId: savedVariantIds[0] ?? null,
    },
  });
}

export async function listProducts(query: ProductListQuery) {
  return prisma.productFamily.findMany({
    where: buildProductWhere(query),
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    select: productFamilyListSelect,
  });
}

export async function countProducts(query: ProductListQuery) {
  return prisma.productFamily.count({
    where: buildProductWhere(query),
  });
}

export async function findProductById(productId: number) {
  return prisma.productFamily.findUnique({
    where: { id: BigInt(productId) },
    select: productFamilyDetailSelect,
  });
}

export async function findProductBySlug(slug: string) {
  return prisma.productFamily.findUnique({
    where: { slug },
    select: {
      id: true,
    },
  });
}

export async function findProductBySignature(
  brandId: number | null,
  name: string,
) {
  if (brandId == null) {
    return null;
  }

  return prisma.productFamily.findFirst({
    where: {
      brandId: BigInt(brandId),
      name,
    },
    select: {
      id: true,
    },
  });
}

export async function findBrandOptionById(brandId: number) {
  return prisma.productBrand.findFirst({
    where: {
      id: BigInt(brandId),
      deletedAt: null,
    },
    select: {
      id: true,
      isProductBrand: true,
    },
  });
}

export async function findProductSubcategoryOptionsByIds(
  productSubcategoryIds: readonly number[],
) {
  if (productSubcategoryIds.length === 0) {
    return [];
  }

  return prisma.productSubcategory.findMany({
    where: {
      id: {
        in: [...new Set(productSubcategoryIds)].map((productSubcategoryId) =>
          BigInt(productSubcategoryId),
        ),
      },
    },
    select: {
      id: true,
      categoryId: true,
      name: true,
      slug: true,
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });
}

export async function createProduct(input: ResolvedProductInput) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.productFamily.create({
      data: {
        brandId: input.brandId != null ? BigInt(input.brandId) : null,
        name: input.name,
        slug: input.slug,
        subtitle: input.subtitle,
        excerpt: input.excerpt,
        description: input.description,
        descriptionSeo: input.descriptionSeo,
        lifecycleStatus: input.lifecycleStatus,
        visibility: input.visibility,
        isPromoted: input.isPromoted,
        subcategories: {
          connect: input.productSubcategoryIds.map((productSubcategoryId) => ({
            id: BigInt(productSubcategoryId),
          })),
        },
      },
      select: {
        id: true,
      },
    });

    if (input.tagIds.length > 0) {
      await tx.productFamilyTagLink.createMany({
        data: input.tagIds.map((tagId) => ({
          familyId: created.id,
          tagId: BigInt(tagId),
        })),
        skipDuplicates: true,
      });
    }

    const resolvedAttributes = await resolveProductAttributeDefinitions(
      tx,
      input.attributes,
    );

    await syncProductFamilyCoverMedia(tx, created.id, input.mainImageMediaId);
    await syncProductFamilyAttributes(tx, created.id, resolvedAttributes);
    await syncProductVariants(tx, created.id, input.variants, resolvedAttributes);

    return tx.productFamily.findUniqueOrThrow({
      where: { id: created.id },
      select: productFamilyDetailSelect,
    });
  });
}

export async function updateProduct(productId: number, input: ResolvedProductInput) {
  return prisma.$transaction(async (tx) => {
    const familyId = BigInt(productId);

    await tx.productFamily.update({
      where: { id: familyId },
      data: {
        brandId: input.brandId != null ? BigInt(input.brandId) : null,
        name: input.name,
        slug: input.slug,
        subtitle: input.subtitle,
        excerpt: input.excerpt,
        description: input.description,
        descriptionSeo: input.descriptionSeo,
        lifecycleStatus: input.lifecycleStatus,
        visibility: input.visibility,
        isPromoted: input.isPromoted,
        subcategories: {
          set: input.productSubcategoryIds.map((productSubcategoryId) => ({
            id: BigInt(productSubcategoryId),
          })),
        },
      },
    });

    await tx.productFamilyTagLink.deleteMany({
      where: { familyId },
    });

    if (input.tagIds.length > 0) {
      await tx.productFamilyTagLink.createMany({
        data: input.tagIds.map((tagId) => ({
          familyId,
          tagId: BigInt(tagId),
        })),
        skipDuplicates: true,
      });
    }

    const resolvedAttributes = await resolveProductAttributeDefinitions(
      tx,
      input.attributes,
    );

    await syncProductFamilyCoverMedia(tx, familyId, input.mainImageMediaId);
    await syncProductFamilyAttributes(tx, familyId, resolvedAttributes);
    await syncProductVariants(tx, familyId, input.variants, resolvedAttributes);

    return tx.productFamily.findUniqueOrThrow({
      where: { id: familyId },
      select: productFamilyDetailSelect,
    });
  });
}

export async function deleteProduct(productId: number) {
  return prisma.productFamily.delete({
    where: { id: BigInt(productId) },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function findProductVariantsBySlugs(slugs: readonly string[]) {
  if (slugs.length === 0) {
    return [];
  }

  return prisma.productVariant.findMany({
    where: {
      slug: {
        in: [...new Set(slugs)],
      },
    },
    select: {
      id: true,
      familyId: true,
      slug: true,
    },
  });
}

export async function findProductVariantsBySkus(skus: readonly string[]) {
  if (skus.length === 0) {
    return [];
  }

  return prisma.productVariant.findMany({
    where: {
      sku: {
        in: [...new Set(skus)],
      },
    },
    select: {
      id: true,
      familyId: true,
      sku: true,
    },
  });
}

export async function listProductBrands() {
  return prisma.productBrand.findMany({
    where: {
      deletedAt: null,
      isProductBrand: true,
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
}

export async function listProductSubcategoriesOptions() {
  return prisma.productSubcategory.findMany({
    where: {
      isActive: true,
      category: {
        isActive: true,
      },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      categoryId: true,
      name: true,
      slug: true,
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });
}

export async function createProductAuditLog(data: {
  actorUserId: string;
  actionType: "CREATE" | "UPDATE" | "DELETE";
  entityId: string;
  targetLabel: string;
  summary: string;
  beforeSnapshotJson?: unknown;
  afterSnapshotJson?: unknown;
}) {
  return prisma.auditLog.create({
    data: {
      actorUserId: data.actorUserId,
      actionType: data.actionType,
      entityType: "ProductFamily",
      entityId: data.entityId,
      targetLabel: data.targetLabel,
      summary: data.summary,
      beforeSnapshotJson: data.beforeSnapshotJson as
        | Prisma.InputJsonValue
        | Prisma.NullableJsonNullValueInput
        | undefined,
      afterSnapshotJson: data.afterSnapshotJson as
        | Prisma.InputJsonValue
        | Prisma.NullableJsonNullValueInput
        | undefined,
    },
  });
}
