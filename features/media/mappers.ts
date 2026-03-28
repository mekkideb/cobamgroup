import type { MediaKind, Prisma } from "@prisma/client";
import type { MediaVisibility } from "@prisma/client";
import type { StaffSession } from "@/features/auth/types";
import {
  canDeleteMediaRecord,
  canForceRemoveMediaRecord,
  canUpdateMediaRecord,
} from "./access";
import type {
  MediaFolderListItemDto,
  MediaFolderOptionDto,
  MediaFolderSummaryDto,
  MediaListItemDto,
  MediaStatsDto,
  MediaUsageDto,
} from "./types";

type MediaWithRelations = {
  id: bigint;
  folderId: bigint | null;
  kind: MediaKind;
  visibility: MediaVisibility;
  storagePath: string;
  originalFilename: string | null;
  mimeType: string | null;
  extension: string | null;
  altText: string | null;
  title: string | null;
  description: string | null;
  widthPx: number | null;
  heightPx: number | null;
  durationSeconds: Prisma.Decimal | null;
  sizeBytes: bigint | null;
  sha256Hash: string | null;
  isActive: boolean;
  uploadedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  uploadedByUser: {
    id: string;
    email: string;
    profile: {
      firstName: string | null;
      lastName: string | null;
    } | null;
  } | null;
  _count: {
    productFamilyLinks: number;
    productVariantLinks: number;
    brandLogoFor: number;
    productCategoryImageFor: number;
    staffProfileAvatarFor: number;
    articleMediaLinks: number;
    articleCoverFor: number;
    articleOgImageFor: number;
  };
};

function toNullableNumber(
  value: bigint | Prisma.Decimal | number | null | undefined,
): number | null {
  if (value == null) {
    return null;
  }

  return Number(value);
}

function buildUploadedByLabel(media: MediaWithRelations): string | null {
  const profile = media.uploadedByUser?.profile;
  const fullName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  return media.uploadedByUser?.email ?? null;
}

function buildUsage(media: MediaWithRelations): MediaUsageDto {
  const total =
    media._count.productFamilyLinks +
    media._count.productVariantLinks +
    media._count.brandLogoFor +
    media._count.productCategoryImageFor +
    media._count.staffProfileAvatarFor +
    media._count.articleMediaLinks +
    media._count.articleCoverFor +
    media._count.articleOgImageFor;

  return {
    productFamilies: media._count.productFamilyLinks,
    productVariants: media._count.productVariantLinks,
    brandLogos: media._count.brandLogoFor,
    productCategoryImages: media._count.productCategoryImageFor,
    staffAvatars: media._count.staffProfileAvatarFor,
    articleAttachments: media._count.articleMediaLinks,
    articleCovers: media._count.articleCoverFor,
    articleOgImages: media._count.articleOgImageFor,
    total,
  };
}

export function mapMediaToListItemDto(
  media: MediaWithRelations,
  session: StaffSession,
): MediaListItemDto {
  const usage = buildUsage(media);

  return {
    id: Number(media.id),
    folderId: media.folderId != null ? Number(media.folderId) : null,
    kind: media.kind,
    visibility: media.visibility,
    storagePath: media.storagePath,
    fileEndpoint: `/api/staff/medias/${media.id}/file`,
    publicFileEndpoint: `/api/media/${media.id}/file`,
    originalFilename: media.originalFilename,
    title: media.title,
    description: media.description,
    altText: media.altText,
    mimeType: media.mimeType,
    extension: media.extension,
    widthPx: media.widthPx,
    heightPx: media.heightPx,
    durationSeconds: toNullableNumber(media.durationSeconds),
    sizeBytes: toNullableNumber(media.sizeBytes),
    sha256Hash: media.sha256Hash,
    isActive: media.isActive,
    uploadedByUserId: media.uploadedByUserId,
    uploadedByLabel: buildUploadedByLabel(media),
    uploadedByCurrentUser: media.uploadedByUserId === session.id,
    canUpdate: canUpdateMediaRecord(session, media.uploadedByUserId),
    canDelete: canDeleteMediaRecord(session, media.uploadedByUserId),
    canForceRemove: canForceRemoveMediaRecord(session, media.uploadedByUserId),
    usage,
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
  };
}

export function mapMediaFolderSummaryDto(folder: {
  id: bigint;
  parentId: bigint | null;
  name: string;
}): MediaFolderSummaryDto {
  return {
    id: Number(folder.id),
    parentId: folder.parentId != null ? Number(folder.parentId) : null,
    name: folder.name,
  };
}

export function mapMediaFolderListItemDto(folder: {
  id: bigint;
  parentId: bigint | null;
  name: string;
  mediaCount: number;
  childFolderCount: number;
  createdAt: Date;
  updatedAt: Date;
}): MediaFolderListItemDto {
  return {
    id: Number(folder.id),
    parentId: folder.parentId != null ? Number(folder.parentId) : null,
    name: folder.name,
    mediaCount: folder.mediaCount,
    childFolderCount: folder.childFolderCount,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

export function mapMediaFolderOptionDto(folder: {
  id: bigint;
  parentId: bigint | null;
  name: string;
  pathLabel: string;
}): MediaFolderOptionDto {
  return {
    id: Number(folder.id),
    parentId: folder.parentId != null ? Number(folder.parentId) : null,
    name: folder.name,
    pathLabel: folder.pathLabel,
  };
}

export function mapMediaStatsDto(data: {
  total: number;
  images: number;
  videos: number;
  documents: number;
  totalSizeBytes: bigint | null;
}): MediaStatsDto {
  return {
    total: data.total,
    images: data.images,
    videos: data.videos,
    documents: data.documents,
    totalSizeBytes: data.totalSizeBytes != null ? Number(data.totalSizeBytes) : 0,
  };
}

export function toMediaAuditSnapshot(value: unknown): unknown {
  if (value == null) return value;

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(toMediaAuditSnapshot);
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = toMediaAuditSnapshot(item);
    }

    return result;
  }

  return value;
}
