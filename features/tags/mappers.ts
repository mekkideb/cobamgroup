import type { Tag } from "@prisma/client";
import type { TagDetailDto, TagListItemDto } from "./types";

type TagWithCounts = Tag & {
  _count: {
    articleLinks: number;
    productFamilyLinks: number;
  };
};

export function mapTagToListItemDto(tag: TagWithCounts): TagListItemDto {
  return {
    id: Number(tag.id),
    name: tag.name,
    slug: tag.slug,
    articleCount: tag._count.articleLinks,
    productFamilyCount: tag._count.productFamilyLinks,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };
}

export function mapTagToDetailDto(tag: TagWithCounts): TagDetailDto {
  return mapTagToListItemDto(tag);
}

export function toTagAuditSnapshot(value: unknown): unknown {
  if (value == null) return value;

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(toTagAuditSnapshot);
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = toTagAuditSnapshot(item);
    }
    return result;
  }

  return value;
}
