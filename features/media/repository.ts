import { MediaKind, MediaVisibility, Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db/prisma";
import type {
  MediaBrowseMode,
  MediaFilterStatus,
  MediaListQuery,
  MediaUpdateInput,
} from "./types";

function buildMediaWhere(input: {
  query: MediaListQuery;
  ownerUserId: string | null;
}): Prisma.MediaWhereInput {
  const where: Prisma.MediaWhereInput = {
    deletedAt: null,
  };

  if (input.ownerUserId) {
    where.uploadedByUserId = input.ownerUserId;
  }

  if (input.query.q) {
    where.OR = [
      { originalFilename: { contains: input.query.q, mode: "insensitive" } },
      { title: { contains: input.query.q, mode: "insensitive" } },
      { description: { contains: input.query.q, mode: "insensitive" } },
      { altText: { contains: input.query.q, mode: "insensitive" } },
      { mimeType: { contains: input.query.q, mode: "insensitive" } },
      { storagePath: { contains: input.query.q, mode: "insensitive" } },
    ];
  }

  if (input.query.kind && input.query.kind !== "ALL") {
    where.kind = input.query.kind;
  }

  if (input.query.status === "active") {
    where.isActive = true;
  } else if (input.query.status === "inactive") {
    where.isActive = false;
  }

  if (input.query.browseMode === "folders") {
    where.folderId =
      input.query.folderId != null ? BigInt(input.query.folderId) : null;
  }

  return where;
}

function buildMediaFolderWhere(input: {
  parentId: number | null;
  ownerUserId: string | null;
  q?: string;
}): Prisma.MediaFolderWhereInput {
  const where: Prisma.MediaFolderWhereInput = {
    parentId: input.parentId != null ? BigInt(input.parentId) : null,
  };

  if (input.ownerUserId) {
    where.createdByUserId = input.ownerUserId;
  }

  if (input.q?.trim()) {
    where.name = {
      contains: input.q.trim(),
      mode: "insensitive",
    };
  }

  return where;
}

function buildMediaOrderBy(
  query: MediaListQuery,
): Prisma.MediaOrderByWithRelationInput[] {
  const direction = query.sortDirection ?? "desc";

  switch (query.sortBy) {
    case "name":
      return [
        { originalFilename: direction },
        { title: direction },
        { storagePath: direction },
        { id: direction },
      ];

    case "size":
      return [
        { sizeBytes: direction },
        { createdAt: "desc" },
        { id: "desc" },
      ];

    case "date":
    default:
      return [
        { createdAt: direction },
        { id: direction },
      ];
  }
}

const mediaSelect = {
  id: true,
  folderId: true,
  kind: true,
  visibility: true,
  storagePath: true,
  originalFilename: true,
  mimeType: true,
  extension: true,
  altText: true,
  title: true,
  description: true,
  widthPx: true,
  heightPx: true,
  durationSeconds: true,
  sizeBytes: true,
  sha256Hash: true,
  isActive: true,
  uploadedByUserId: true,
  createdAt: true,
  updatedAt: true,
  uploadedByUser: {
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  },
} satisfies Prisma.MediaSelect;

const mediaFolderSelect = {
  id: true,
  parentId: true,
  name: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MediaFolderSelect;

type MediaUsageCounts = {
  productFamilyLinks: number;
  productVariantLinks: number;
  brandLogoFor: number;
  productCategoryImageFor: number;
  productSubcategoryImageFor: number;
  staffProfileAvatarFor: number;
  articleMediaLinks: number;
  articleCoverFor: number;
  articleOgImageFor: number;
};

export type DetachedMediaReferenceCounts = {
  productFamilyLinks: number;
  productVariantLinks: number;
  brandLogos: number;
  productCategoryImages: number;
  productSubcategoryImages: number;
  staffAvatars: number;
  articleAttachments: number;
  articleCovers: number;
  articleOgImages: number;
  total: number;
};

type MediaRecord = Prisma.MediaGetPayload<{
  select: typeof mediaSelect;
}>;

export type MediaFolderRecord = Prisma.MediaFolderGetPayload<{
  select: typeof mediaFolderSelect;
}>;

export type MediaFolderListRecord = MediaFolderRecord & {
  mediaCount: number;
  childFolderCount: number;
};

function buildRecursiveMediaCountByFolderId(
  folders: Array<{
    id: bigint;
    parentId: bigint | null;
  }>,
  directMediaCountByFolderId: Map<string, number>,
) {
  const childFolderIdsByParentId = new Map<string, string[]>();

  for (const folder of folders) {
    const parentKey = folder.parentId?.toString() ?? "__root__";
    const currentChildren = childFolderIdsByParentId.get(parentKey) ?? [];
    currentChildren.push(folder.id.toString());
    childFolderIdsByParentId.set(parentKey, currentChildren);
  }

  const recursiveMediaCountByFolderId = new Map<string, number>();

  const countFolderMedia = (folderId: string): number => {
    const cachedCount = recursiveMediaCountByFolderId.get(folderId);

    if (cachedCount !== undefined) {
      return cachedCount;
    }

    let total = directMediaCountByFolderId.get(folderId) ?? 0;

    for (const childFolderId of childFolderIdsByParentId.get(folderId) ?? []) {
      total += countFolderMedia(childFolderId);
    }

    recursiveMediaCountByFolderId.set(folderId, total);
    return total;
  };

  for (const folder of folders) {
    countFolderMedia(folder.id.toString());
  }

  return recursiveMediaCountByFolderId;
}

function createEmptyMediaUsageCounts(): MediaUsageCounts {
  return {
    productFamilyLinks: 0,
    productVariantLinks: 0,
    brandLogoFor: 0,
    productCategoryImageFor: 0,
    productSubcategoryImageFor: 0,
    staffProfileAvatarFor: 0,
    articleMediaLinks: 0,
    articleCoverFor: 0,
    articleOgImageFor: 0,
  };
}

function incrementUsageCount(
  countsByMediaId: Map<string, MediaUsageCounts>,
  mediaId: bigint | null | undefined,
  field: keyof MediaUsageCounts,
) {
  if (mediaId == null) {
    return;
  }

  const key = mediaId.toString();
  const counts = countsByMediaId.get(key);

  if (!counts) {
    return;
  }

  counts[field] += 1;
}

async function attachMediaUsageCounts<T extends MediaRecord>(records: T[]) {
  if (records.length === 0) {
    return [] as Array<T & { _count: MediaUsageCounts }>;
  }

  const mediaIds = [...new Set(records.map((record) => record.id.toString()))].map((id) =>
    BigInt(id),
  );
  const countsByMediaId = new Map(
    mediaIds.map((mediaId) => [mediaId.toString(), createEmptyMediaUsageCounts()]),
  );

    const [
    productFamilyLinks,
    productVariantLinks,
    brandLogos,
    productCategoryImages,
    productSubcategoryImages,
    staffAvatars,
    articleAttachments,
    articleCovers,
    articleOgImages,
  ] = await Promise.all([
    prisma.productFamilyMediaLink.findMany({
      where: {
        mediaId: {
          in: mediaIds,
        },
      },
      select: {
        mediaId: true,
      },
    }),
    prisma.productVariantMediaLink.findMany({
      where: {
        mediaId: {
          in: mediaIds,
        },
      },
      select: {
        mediaId: true,
      },
    }),
    prisma.productBrand.findMany({
      where: {
        deletedAt: null,
        logoMediaId: {
          in: mediaIds,
        },
      },
      select: {
        logoMediaId: true,
      },
    }),
    prisma.productCategory.findMany({
      where: {
        imageMediaId: {
          in: mediaIds,
        },
      },
      select: {
        imageMediaId: true,
      },
    }),
    prisma.productSubcategory.findMany({
      where: {
        imageMediaId: {
          in: mediaIds,
        },
      },
      select: {
        imageMediaId: true,
      },
    }),
    prisma.staffProfile.findMany({
      where: {
        avatarMediaId: {
          in: mediaIds,
        },
      },
      select: {
        avatarMediaId: true,
      },
    }),
    prisma.articleMediaLink.findMany({
      where: {
        mediaId: {
          in: mediaIds,
        },
        article: {
          deletedAt: null,
        },
      },
      select: {
        mediaId: true,
      },
    }),
    prisma.article.findMany({
      where: {
        deletedAt: null,
        coverMediaId: {
          in: mediaIds,
        },
      },
      select: {
        coverMediaId: true,
      },
    }),
    prisma.article.findMany({
      where: {
        deletedAt: null,
        ogImageMediaId: {
          in: mediaIds,
        },
      },
      select: {
        ogImageMediaId: true,
      },
    }),
  ]);

  for (const link of productFamilyLinks) {
    incrementUsageCount(countsByMediaId, link.mediaId, "productFamilyLinks");
  }

  for (const link of productVariantLinks) {
    incrementUsageCount(countsByMediaId, link.mediaId, "productVariantLinks");
  }

  for (const brand of brandLogos) {
    incrementUsageCount(countsByMediaId, brand.logoMediaId, "brandLogoFor");
  }

  for (const category of productCategoryImages) {
    incrementUsageCount(
      countsByMediaId,
      category.imageMediaId,
      "productCategoryImageFor",
    );
  }

  for (const subcategory of productSubcategoryImages) {
    incrementUsageCount(
      countsByMediaId,
      subcategory.imageMediaId,
      "productSubcategoryImageFor",
    );
  }

  for (const profile of staffAvatars) {
    incrementUsageCount(countsByMediaId, profile.avatarMediaId, "staffProfileAvatarFor");
  }

  for (const link of articleAttachments) {
    incrementUsageCount(countsByMediaId, link.mediaId, "articleMediaLinks");
  }

  for (const article of articleCovers) {
    incrementUsageCount(countsByMediaId, article.coverMediaId, "articleCoverFor");
  }

  for (const article of articleOgImages) {
    incrementUsageCount(countsByMediaId, article.ogImageMediaId, "articleOgImageFor");
  }

  return records.map((record) => ({
    ...record,
    _count: countsByMediaId.get(record.id.toString()) ?? createEmptyMediaUsageCounts(),
  }));
}

export async function listMedia(input: {
  query: MediaListQuery;
  ownerUserId: string | null;
}) {
  const records = await prisma.media.findMany({
    where: buildMediaWhere(input),
    orderBy: buildMediaOrderBy(input.query),
    skip: (input.query.page - 1) * input.query.pageSize,
    take: input.query.pageSize,
    select: mediaSelect,
  });

  return attachMediaUsageCounts(records);
}

export async function listMediaFoldersAtLevel(input: {
  parentId: number | null;
  ownerUserId: string | null;
  q?: string;
}) {
  const folderWhere = input.ownerUserId
    ? {
        createdByUserId: input.ownerUserId,
      }
    : undefined;

  const folders = await prisma.mediaFolder.findMany({
    where: buildMediaFolderWhere(input),
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: mediaFolderSelect,
  });

  if (folders.length === 0) {
    return [] as MediaFolderListRecord[];
  }

  const [allFolders, childFolderCounts] = await Promise.all([
    prisma.mediaFolder.findMany({
      where: folderWhere,
      select: {
        id: true,
        parentId: true,
      },
    }),
    prisma.mediaFolder.groupBy({
      by: ["parentId"],
      where: {
        parentId: {
          in: folders.map((folder) => folder.id),
        },
        ...folderWhere,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const allFolderIds = allFolders.map((folder) => folder.id);
  const mediaCounts =
    allFolderIds.length === 0
      ? []
      : await prisma.media.groupBy({
          by: ["folderId"],
          where: {
            deletedAt: null,
            folderId: {
              in: allFolderIds,
            },
            ...(input.ownerUserId
              ? {
                  uploadedByUserId: input.ownerUserId,
                }
              : {}),
          },
          _count: {
            _all: true,
          },
        });

  const recursiveMediaCountByFolderId = buildRecursiveMediaCountByFolderId(
    allFolders,
    new Map(
      mediaCounts.map((entry) => [
        entry.folderId?.toString() ?? "",
        entry._count._all,
      ]),
    ),
  );
  const childFolderCountByFolderId = new Map(
    childFolderCounts.map((entry) => [
      entry.parentId?.toString() ?? "",
      entry._count._all,
    ]),
  );

  return folders.map((folder) => ({
    ...folder,
    mediaCount: recursiveMediaCountByFolderId.get(folder.id.toString()) ?? 0,
    childFolderCount: childFolderCountByFolderId.get(folder.id.toString()) ?? 0,
  }));
}

export async function listAllMediaFolders(ownerUserId: string | null) {
  return prisma.mediaFolder.findMany({
    where: ownerUserId
      ? {
          createdByUserId: ownerUserId,
        }
      : undefined,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: mediaFolderSelect,
  });
}

export async function findMediaFolderById(
  folderId: number,
  ownerUserId: string | null,
) {
  return prisma.mediaFolder.findFirst({
    where: {
      id: BigInt(folderId),
      ...(ownerUserId
        ? {
            createdByUserId: ownerUserId,
          }
        : {}),
    },
    select: mediaFolderSelect,
  });
}

export async function countMedia(input: {
  query: MediaListQuery;
  ownerUserId: string | null;
}) {
  return prisma.media.count({
    where: buildMediaWhere(input),
  });
}

export async function aggregateMediaStats(input: {
  browseMode: MediaBrowseMode;
  folderId: number | null;
  q?: string;
  status?: MediaFilterStatus;
  ownerUserId: string | null;
}) {
  const baseWhere = buildMediaWhere({
    query: {
      browseMode: input.browseMode,
      page: 1,
      pageSize: 1,
      folderId: input.folderId,
      q: input.q,
      kind: "ALL",
      status: input.status,
    },
    ownerUserId: input.ownerUserId,
  });

  const [total, images, videos, documents, totalSize] = await Promise.all([
    prisma.media.count({ where: baseWhere }),
    prisma.media.count({ where: { ...baseWhere, kind: MediaKind.IMAGE } }),
    prisma.media.count({ where: { ...baseWhere, kind: MediaKind.VIDEO } }),
    prisma.media.count({ where: { ...baseWhere, kind: MediaKind.DOCUMENT } }),
    prisma.media.aggregate({
      where: baseWhere,
      _sum: {
        sizeBytes: true,
      },
    }),
  ]);

  return {
    total,
    images,
    videos,
    documents,
    totalSizeBytes: totalSize._sum.sizeBytes,
  };
}

export async function findMediaById(mediaId: number) {
  const record = await prisma.media.findFirst({
    where: {
      id: BigInt(mediaId),
      deletedAt: null,
    },
    select: mediaSelect,
  });

  if (!record) {
    return null;
  }

  const [media] = await attachMediaUsageCounts([record]);
  return media;
}

export async function findImageMediaById(mediaId: number) {
  return prisma.media.findFirst({
    where: {
      id: BigInt(mediaId),
      kind: MediaKind.IMAGE,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
    },
  });
}

export async function findActiveMediaByIds(mediaIds: readonly number[]) {
  if (mediaIds.length === 0) {
    return [];
  }

  return prisma.media.findMany({
    where: {
      id: {
        in: [...new Set(mediaIds)].map((mediaId) => BigInt(mediaId)),
      },
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      kind: true,
    },
  });
}

export async function findPublicMediaById(mediaId: number) {
  return prisma.media.findFirst({
    where: {
      id: BigInt(mediaId),
      deletedAt: null,
      isActive: true,
      visibility: MediaVisibility.PUBLIC,
    },
    select: {
      id: true,
      kind: true,
      visibility: true,
      storagePath: true,
      originalFilename: true,
      mimeType: true,
      extension: true,
    },
  });
}

export async function createMediaRecord(input: {
  folderId: number | null;
  kind: MediaKind;
  visibility: MediaVisibility;
  storagePath: string;
  originalFilename: string | null;
  mimeType: string | null;
  extension: string | null;
  title: string | null;
  altText: string | null;
  description: string | null;
  widthPx?: number | null;
  heightPx?: number | null;
  sizeBytes: bigint;
  sha256Hash: string;
  uploadedByUserId: string;
}) {
  const record = await prisma.media.create({
    data: {
      folderId: input.folderId != null ? BigInt(input.folderId) : null,
      kind: input.kind,
      visibility: input.visibility,
      storagePath: input.storagePath,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      extension: input.extension,
      title: input.title,
      altText: input.altText,
      description: input.description,
      widthPx: input.widthPx ?? null,
      heightPx: input.heightPx ?? null,
      sizeBytes: input.sizeBytes,
      sha256Hash: input.sha256Hash,
      isActive: true,
      uploadedByUserId: input.uploadedByUserId,
      updatedByUserId: input.uploadedByUserId,
    },
    select: mediaSelect,
  });

  const [media] = await attachMediaUsageCounts([record]);
  return media;
}

export async function updateMediaRecord(
  mediaId: number,
  input: MediaUpdateInput & { updatedByUserId: string },
) {
  const record = await prisma.media.update({
    where: { id: BigInt(mediaId) },
    data: {
      ...(input.visibility != null
        ? {
            visibility: input.visibility,
          }
        : {}),
      ...(input.folderId !== undefined
        ? {
            folderId: input.folderId != null ? BigInt(input.folderId) : null,
          }
        : {}),
      updatedByUserId: input.updatedByUserId,
    },
    select: mediaSelect,
  });

  const [media] = await attachMediaUsageCounts([record]);
  return media;
}

export async function createMediaFolderRecord(input: {
  name: string;
  parentId: number | null;
  createdByUserId: string;
}) {
  return prisma.mediaFolder.create({
    data: {
      name: input.name,
      parentId: input.parentId != null ? BigInt(input.parentId) : null,
      createdByUserId: input.createdByUserId,
    },
    select: mediaFolderSelect,
  });
}

export async function updateMediaFolderRecord(input: {
  folderId: number;
  parentId: number | null;
}) {
  return prisma.mediaFolder.update({
    where: {
      id: BigInt(input.folderId),
    },
    data: {
      parentId: input.parentId != null ? BigInt(input.parentId) : null,
    },
    select: mediaFolderSelect,
  });
}

export async function countMediaFolderContents(
  folderId: number,
  ownerUserId: string | null,
) {
  const folderIdValue = BigInt(folderId);
  const [mediaCount, childFolderCount] = await Promise.all([
    prisma.media.count({
      where: {
        deletedAt: null,
        folderId: folderIdValue,
        ...(ownerUserId
          ? {
              uploadedByUserId: ownerUserId,
            }
          : {}),
      },
    }),
    prisma.mediaFolder.count({
      where: {
        parentId: folderIdValue,
        ...(ownerUserId
          ? {
              createdByUserId: ownerUserId,
            }
          : {}),
      },
    }),
  ]);

  return {
    mediaCount,
    childFolderCount,
  };
}

export async function deleteMediaFolderRecord(folderId: number) {
  return prisma.mediaFolder.delete({
    where: {
      id: BigInt(folderId),
    },
    select: mediaFolderSelect,
  });
}

export async function detachMediaFolderRelationsAndDeleteFolderRecord(input: {
  folderId: number;
  parentId: number | null;
  ownerUserId: string | null;
}) {
  const folderIdValue = BigInt(input.folderId);
  const parentIdValue =
    input.parentId != null ? BigInt(input.parentId) : null;

  return prisma.$transaction(async (tx) => {
    const movedMedia = await tx.media.updateMany({
      where: {
        deletedAt: null,
        folderId: folderIdValue,
        ...(input.ownerUserId
          ? {
              uploadedByUserId: input.ownerUserId,
            }
          : {}),
      },
      data: {
        folderId: parentIdValue,
      },
    });

    const movedChildFolders = await tx.mediaFolder.updateMany({
      where: {
        parentId: folderIdValue,
        ...(input.ownerUserId
          ? {
              createdByUserId: input.ownerUserId,
            }
          : {}),
      },
      data: {
        parentId: parentIdValue,
      },
    });

    const deletedFolder = await tx.mediaFolder.delete({
      where: {
        id: folderIdValue,
      },
      select: mediaFolderSelect,
    });

    return {
      deletedFolder,
      detachedReferences: {
        mediaCount: movedMedia.count,
        childFolderCount: movedChildFolders.count,
        total: movedMedia.count + movedChildFolders.count,
      },
    };
  });
}

export async function makeMediaPublic(mediaId: number) {
  return prisma.media.updateMany({
    where: {
      id: BigInt(mediaId),
      deletedAt: null,
      isActive: true,
    },
    data: {
      visibility: MediaVisibility.PUBLIC,
    },
  });
}

export async function makeMediaPublicMany(mediaIds: readonly number[]) {
  const normalizedIds = [...new Set(mediaIds.filter((mediaId) => Number.isInteger(mediaId) && mediaId > 0))];

  if (normalizedIds.length === 0) {
    return { count: 0 };
  }

  return prisma.media.updateMany({
    where: {
      id: {
        in: normalizedIds.map((mediaId) => BigInt(mediaId)),
      },
      deletedAt: null,
      isActive: true,
    },
    data: {
      visibility: MediaVisibility.PUBLIC,
    },
  });
}

export async function deleteMediaRecord(mediaId: number) {
  const record = await prisma.media.delete({
    where: { id: BigInt(mediaId) },
    select: mediaSelect,
  });

  const [media] = await attachMediaUsageCounts([record]);
  return media;
}

export async function detachMediaReferencesAndDeleteMediaRecord(mediaId: number) {
  const mediaIdValue = BigInt(mediaId);

  return prisma.$transaction(async (tx) => {
    const productFamilyLinks = await tx.productFamilyMediaLink.deleteMany({
      where: {
        mediaId: mediaIdValue,
      },
    });
    const productVariantLinks = await tx.productVariantMediaLink.deleteMany({
      where: {
        mediaId: mediaIdValue,
      },
    });
    const brandLogos = await tx.productBrand.updateMany({
      where: {
        logoMediaId: mediaIdValue,
      },
      data: {
        logoMediaId: null,
      },
    });
    const productCategoryImages = await tx.productCategory.updateMany({
      where: {
        imageMediaId: mediaIdValue,
      },
      data: {
        imageMediaId: null,
      },
    });
    const productSubcategoryImages = await tx.productSubcategory.updateMany({
      where: {
        imageMediaId: mediaIdValue,
      },
      data: {
        imageMediaId: null,
      },
    });
    const staffAvatars = await tx.staffProfile.updateMany({
      where: {
        avatarMediaId: mediaIdValue,
      },
      data: {
        avatarMediaId: null,
      },
    });
    const articleAttachments = await tx.articleMediaLink.deleteMany({
      where: {
        mediaId: mediaIdValue,
      },
    });
    const articleCovers = await tx.article.updateMany({
      where: {
        coverMediaId: mediaIdValue,
      },
      data: {
        coverMediaId: null,
      },
    });
    const articleOgImages = await tx.article.updateMany({
      where: {
        ogImageMediaId: mediaIdValue,
      },
      data: {
        ogImageMediaId: null,
      },
    });
    const deletedMedia = await tx.media.delete({
      where: { id: mediaIdValue },
      select: mediaSelect,
    });

    const detachedReferences: DetachedMediaReferenceCounts = {
      productFamilyLinks: productFamilyLinks.count,
      productVariantLinks: productVariantLinks.count,
      brandLogos: brandLogos.count,
      productCategoryImages: productCategoryImages.count,
      productSubcategoryImages: productSubcategoryImages.count,
      staffAvatars: staffAvatars.count,
      articleAttachments: articleAttachments.count,
      articleCovers: articleCovers.count,
      articleOgImages: articleOgImages.count,
      total:
        productFamilyLinks.count +
        productVariantLinks.count +
        brandLogos.count +
        productCategoryImages.count +
        productSubcategoryImages.count +
        staffAvatars.count +
        articleAttachments.count +
        articleCovers.count +
        articleOgImages.count,
    };

    return {
      deletedMedia,
      detachedReferences,
    };
  });
}

function toAuditJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createMediaAuditLog(data: {
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
      entityType: "Media",
      entityId: data.entityId,
      targetLabel: data.targetLabel,
      summary: data.summary,
      beforeSnapshotJson: toAuditJson(data.beforeSnapshotJson),
      afterSnapshotJson: toAuditJson(data.afterSnapshotJson),
    },
  });
}
