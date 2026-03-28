import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db/prisma";
import type {
  ProductCategoryCreateInput,
  ProductCategoryListQuery,
  ProductCategoryUpdateInput,
} from "./types";

function buildProductCategoryWhere(
  query: ProductCategoryListQuery,
): Prisma.ProductCategoryWhereInput {
  const where: Prisma.ProductCategoryWhereInput = {};

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { slug: { contains: query.q, mode: "insensitive" } },
      { subtitle: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
      {
        subcategories: {
          some: {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { slug: { contains: query.q, mode: "insensitive" } },
              { subtitle: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  return where;
}

const productSubcategorySelect = {
  id: true,
  categoryId: true,
  name: true,
  subtitle: true,
  slug: true,
  description: true,
  descriptionSeo: true,
  imageMediaId: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      productFamilies: true,
    },
  },
} satisfies Prisma.ProductSubcategorySelect;

const productCategorySelect = {
  id: true,
  name: true,
  subtitle: true,
  slug: true,
  description: true,
  descriptionSeo: true,
  imageMediaId: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  subcategories: {
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    select: productSubcategorySelect,
  },
  _count: {
    select: {
      subcategories: true,
    },
  },
} satisfies Prisma.ProductCategorySelect;

async function syncProductSubcategories(
  tx: Prisma.TransactionClient,
  categoryId: bigint,
  subcategories: ProductCategoryCreateInput["subcategories"],
) {
  const keptSubcategoryIds = subcategories
    .map((subcategory) => subcategory.id)
    .filter((subcategoryId): subcategoryId is number => subcategoryId != null)
    .map((subcategoryId) => BigInt(subcategoryId));

  await tx.productSubcategory.deleteMany({
    where: keptSubcategoryIds.length
      ? {
          categoryId,
          id: {
            notIn: keptSubcategoryIds,
          },
        }
      : {
          categoryId,
        },
  });

  for (const subcategory of subcategories) {
    const data = {
      categoryId,
      name: subcategory.name,
      subtitle: subcategory.subtitle,
      slug: subcategory.slug,
      description: subcategory.description,
      descriptionSeo: subcategory.descriptionSeo,
      imageMediaId:
        subcategory.imageMediaId != null
          ? BigInt(subcategory.imageMediaId)
          : null,
      sortOrder: subcategory.sortOrder,
      isActive: subcategory.isActive,
    };

    if (subcategory.id != null) {
      await tx.productSubcategory.update({
        where: {
          id: BigInt(subcategory.id),
        },
        data,
      });
      continue;
    }

    await tx.productSubcategory.create({
      data,
    });
  }
}

export async function listProductCategories(query: ProductCategoryListQuery) {
  return prisma.productCategory.findMany({
    where: buildProductCategoryWhere(query),
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { createdAt: "desc" }],
    skip: query.tree ? undefined : (query.page - 1) * query.pageSize,
    take: query.tree ? undefined : query.pageSize,
    select: productCategorySelect,
  });
}

export async function countProductCategories(query: ProductCategoryListQuery) {
  return prisma.productCategory.count({
    where: buildProductCategoryWhere(query),
  });
}

export async function findProductCategoryById(categoryId: number) {
  return prisma.productCategory.findUnique({
    where: { id: BigInt(categoryId) },
    select: productCategorySelect,
  });
}

export async function findProductCategoryBySlug(slug: string) {
  return prisma.productCategory.findUnique({
    where: { slug },
    select: {
      id: true,
    },
  });
}

export async function findProductCategoriesBySlugs(slugs: readonly string[]) {
  if (slugs.length === 0) {
    return [];
  }

  return prisma.productCategory.findMany({
    where: {
      slug: {
        in: [...new Set(slugs)],
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });
}

export async function findProductSubcategoriesByCategoryAndSlugs(input: {
  categoryId?: number | null;
  subcategoryIds?: readonly number[];
  slugs?: readonly string[];
}) {
  return prisma.productSubcategory.findMany({
    where: {
      ...(input.categoryId != null
        ? {
            categoryId: BigInt(input.categoryId),
          }
        : {}),
      ...(input.subcategoryIds != null && input.subcategoryIds.length > 0
        ? {
            id: {
              in: [...new Set(input.subcategoryIds)].map((subcategoryId) =>
                BigInt(subcategoryId),
              ),
            },
          }
        : {}),
      ...(input.slugs != null && input.slugs.length > 0
        ? {
            slug: {
              in: [...new Set(input.slugs)],
            },
          }
        : {}),
    },
    select: {
      id: true,
      categoryId: true,
      slug: true,
      name: true,
      _count: {
        select: {
          productFamilies: true,
        },
      },
    },
  });
}

export async function createProductCategory(
  input: ProductCategoryCreateInput,
) {
  return prisma.$transaction(async (tx) => {
    const category = await tx.productCategory.create({
      data: {
        name: input.name,
        subtitle: input.subtitle,
        slug: input.slug,
        description: input.description,
        descriptionSeo: input.descriptionSeo,
        imageMediaId:
          input.imageMediaId != null ? BigInt(input.imageMediaId) : null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
      select: {
        id: true,
      },
    });

    await syncProductSubcategories(tx, category.id, input.subcategories);

    return tx.productCategory.findUniqueOrThrow({
      where: { id: category.id },
      select: productCategorySelect,
    });
  });
}

export async function updateProductCategory(
  categoryId: number,
  input: ProductCategoryUpdateInput,
) {
  return prisma.$transaction(async (tx) => {
    const categoryIdValue = BigInt(categoryId);

    await tx.productCategory.update({
      where: { id: categoryIdValue },
      data: {
        name: input.name,
        subtitle: input.subtitle,
        slug: input.slug,
        description: input.description,
        descriptionSeo: input.descriptionSeo,
        imageMediaId:
          input.imageMediaId != null ? BigInt(input.imageMediaId) : null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
    });

    await syncProductSubcategories(tx, categoryIdValue, input.subcategories);

    return tx.productCategory.findUniqueOrThrow({
      where: { id: categoryIdValue },
      select: productCategorySelect,
    });
  });
}

export async function deleteProductCategory(categoryId: number) {
  return prisma.productCategory.delete({
    where: { id: BigInt(categoryId) },
  });
}

export async function countProductFamiliesForCategory(categoryId: number) {
  return prisma.productFamily.count({
    where: {
      subcategories: {
        some: {
          categoryId: BigInt(categoryId),
        },
      },
    },
  });
}

export async function countProductFamiliesForSubcategories(
  subcategoryIds: readonly number[],
) {
  if (subcategoryIds.length === 0) {
    return [];
  }

  return prisma.productSubcategory.findMany({
    where: {
      id: {
        in: [...new Set(subcategoryIds)].map((subcategoryId) =>
          BigInt(subcategoryId),
        ),
      },
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          productFamilies: true,
        },
      },
    },
  });
}

function toAuditJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createProductCategoryAuditLog(data: {
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
      entityType: "ProductCategory",
      entityId: data.entityId,
      targetLabel: data.targetLabel,
      summary: data.summary,
      beforeSnapshotJson: toAuditJson(data.beforeSnapshotJson),
      afterSnapshotJson: toAuditJson(data.afterSnapshotJson),
    },
  });
}
