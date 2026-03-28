import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db/prisma";
import { slugifyTagName } from "./slug";
import type {
  TagCreateInput,
  TagListQuery,
  TagSuggestionQuery,
  TagUpdateInput,
} from "./types";

function buildTagWhere(query: TagListQuery): Prisma.TagWhereInput {
  const where: Prisma.TagWhereInput = {};

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { slug: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

const tagSelect = {
  id: true,
  name: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      articleLinks: true,
      productFamilyLinks: true,
    },
  },
} satisfies Prisma.TagSelect;

export async function listTags(query: TagListQuery) {
  return prisma.tag.findMany({
    where: buildTagWhere(query),
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    select: tagSelect,
  });
}

export async function countTags(query: TagListQuery) {
  return prisma.tag.count({
    where: buildTagWhere(query),
  });
}

export async function findTagById(tagId: number) {
  return prisma.tag.findUnique({
    where: { id: BigInt(tagId) },
    select: tagSelect,
  });
}

export async function findTagBySlug(slug: string) {
  return prisma.tag.findUnique({
    where: { slug },
    select: { id: true },
  });
}

export async function findTagByName(name: string) {
  return prisma.tag.findUnique({
    where: { name },
    select: { id: true },
  });
}

export async function createTag(input: TagCreateInput) {
  return prisma.tag.create({
    data: {
      name: input.name,
      slug: input.slug,
    },
    select: tagSelect,
  });
}

export async function updateTag(tagId: number, input: TagUpdateInput) {
  return prisma.tag.update({
    where: { id: BigInt(tagId) },
    data: {
      name: input.name,
      slug: input.slug,
    },
    select: tagSelect,
  });
}

export async function deleteTag(tagId: number) {
  return prisma.tag.delete({
    where: { id: BigInt(tagId) },
  });
}

export async function listTagSuggestions(query: TagSuggestionQuery) {
  const normalizedQuery = query.q?.trim();

  if (!normalizedQuery) {
    return [];
  }

  return prisma.tag.findMany({
    where: {
      OR: [
        { name: { contains: normalizedQuery, mode: "insensitive" } },
        { slug: { contains: slugifyTagName(normalizedQuery), mode: "insensitive" } },
      ],
    },
    orderBy: [{ name: "asc" }],
    take: query.limit,
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
}

function normalizeTagNames(tagNames: readonly string[]) {
  const seenSlugs = new Set<string>();

  return tagNames
    .map((tagName) => tagName.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      slug: slugifyTagName(name),
    }))
    .filter((entry) => {
      if (!entry.slug || seenSlugs.has(entry.slug)) {
        return false;
      }

      seenSlugs.add(entry.slug);
      return true;
    });
}

export async function resolveOrCreateTagsByNames(tagNames: readonly string[]) {
  const normalizedEntries = normalizeTagNames(tagNames);

  if (normalizedEntries.length === 0) {
    return [];
  }

  const slugs = normalizedEntries.map((entry) => entry.slug);
  const existingTags = await prisma.tag.findMany({
    where: {
      slug: {
        in: slugs,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const existingBySlug = new Map(
    existingTags.map((tag) => [tag.slug, tag]),
  );

  for (const entry of normalizedEntries) {
    if (existingBySlug.has(entry.slug)) {
      continue;
    }

    try {
      const created = await prisma.tag.create({
        data: {
          name: entry.name,
          slug: entry.slug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      existingBySlug.set(created.slug, created);
    } catch (error: unknown) {
      const isKnownRequestError =
        error instanceof Prisma.PrismaClientKnownRequestError;

      if (!isKnownRequestError || error.code !== "P2002") {
        throw error;
      }

      const concurrentTag = await prisma.tag.findUnique({
        where: { slug: entry.slug },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      if (concurrentTag) {
        existingBySlug.set(concurrentTag.slug, concurrentTag);
      }
    }
  }

  return normalizedEntries
    .map((entry) => existingBySlug.get(entry.slug))
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));
}

function toAuditJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createTagAuditLog(data: {
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
      entityType: "Tag",
      entityId: data.entityId,
      targetLabel: data.targetLabel,
      summary: data.summary,
      beforeSnapshotJson: toAuditJson(data.beforeSnapshotJson),
      afterSnapshotJson: toAuditJson(data.afterSnapshotJson),
    },
  });
}
