import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db/prisma";
import type { BrandCreateInput, BrandListQuery, BrandUpdateInput } from "./types";

function buildBrandWhere(query: BrandListQuery): Prisma.ProductBrandWhereInput {
  const where: Prisma.ProductBrandWhereInput = {
    deletedAt: null,
  };

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { slug: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listBrands(query: BrandListQuery) {
  return prisma.productBrand.findMany({
    where: buildBrandWhere(query),
    orderBy: { createdAt: "desc" },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoMediaId: true,
      showcasePlacement: true,
      isProductBrand: true,
      ownerUserId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function countBrands(query: BrandListQuery) {
  return prisma.productBrand.count({
    where: buildBrandWhere(query),
  });
}

export async function findBrandById(brandId: number) {
  return prisma.productBrand.findFirst({
    where: {
      id: BigInt(brandId),
      deletedAt: null,
    },
  });
}

export async function countProductFamiliesForBrand(brandId: number) {
  return prisma.productFamily.count({
    where: {
      brandId: BigInt(brandId),
    },
  });
}

export async function findBrandBySlug(slug: string) {
  return prisma.productBrand.findUnique({
    where: { slug },
    select: {
      id: true,
      deletedAt: true,
    },
  });
}

export async function findBrandByName(name: string) {
  return prisma.productBrand.findUnique({
    where: { name },
    select: {
      id: true,
      deletedAt: true,
    },
  });
}

export async function createBrand(actorUserId: string, input: BrandCreateInput) {
  return prisma.productBrand.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      logoMediaId:
        input.logoMediaId != null ? BigInt(input.logoMediaId) : null,
      showcasePlacement: input.showcasePlacement,
      isProductBrand: input.isProductBrand,
      ownerUserId: actorUserId,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
  });
}

export async function updateBrand(
  brandId: number,
  actorUserId: string,
  input: BrandUpdateInput,
) {
  return prisma.productBrand.update({
    where: { id: BigInt(brandId) },
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      logoMediaId:
        input.logoMediaId != null ? BigInt(input.logoMediaId) : null,
      showcasePlacement: input.showcasePlacement,
      isProductBrand: input.isProductBrand,
      updatedByUserId: actorUserId,
    },
  });
}

export async function deleteBrand(brandId: number) {
  return prisma.productBrand.delete({
    where: { id: BigInt(brandId) },
  });
}

function toAuditJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createBrandAuditLog(data: {
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
      entityType: "ProductBrand",
      entityId: data.entityId,
      targetLabel: data.targetLabel,
      summary: data.summary,
      beforeSnapshotJson: toAuditJson(data.beforeSnapshotJson),
      afterSnapshotJson: toAuditJson(data.afterSnapshotJson),
    },
  });
}
