import { createHash, randomUUID } from "crypto";
import path from "path";
import { MediaKind, MediaVisibility } from "@prisma/client";
import sharp from "sharp";
import type { StaffSession } from "@/features/auth/types";
import {
  canAccessMediaLibrary,
  canDeleteMediaRecord,
  canForceRemoveMedia,
  canForceRemoveMediaRecord,
  canUpdateMediaRecord,
  canUploadMedia,
  canViewAllMedia,
  canViewMediaRecord,
  canViewOwnMedia,
} from "./access";
import {
  mapMediaFolderListItemDto,
  mapMediaFolderOptionDto,
  mapMediaFolderSummaryDto,
  mapMediaStatsDto,
  mapMediaToListItemDto,
  toMediaAuditSnapshot,
} from "./mappers";
import {
  aggregateMediaStats,
  countMediaFolderContents,
  countMedia,
  createMediaFolderRecord,
  createMediaAuditLog,
  createMediaRecord,
  deleteMediaFolderRecord,
  deleteMediaRecord,
  detachMediaFolderRelationsAndDeleteFolderRecord,
  detachMediaReferencesAndDeleteMediaRecord,
  findImageMediaById,
  findMediaFolderById,
  findMediaById,
  findPublicMediaById,
  listAllMediaFolders,
  listMediaFoldersAtLevel,
  listMedia,
  updateMediaFolderRecord,
  updateMediaRecord,
} from "./repository";
import {
  buildMediaVariantFilename,
  getMediaThumbnailMaxWidth,
  getMediaThumbnailQuality,
  getMediaVariantStoragePath,
} from "./file-variants";
import type {
  MediaDeleteOptions,
  MediaFolderCreateInput,
  MediaFolderUpdateInput,
  MediaFileVariant,
  MediaListQuery,
  MediaListResult,
  MediaUpdateInput,
  MediaUploadInput,
} from "./types";
import {
  getMediaMaxUploadBytes,
  getMediaStorageDriver,
  getMediaStorageInfo,
} from "@/lib/server/storage/media";

export class MediaServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type MediaStorageReadableRecord = {
  id: bigint;
  kind: MediaKind;
  visibility?: MediaVisibility;
  storagePath: string;
  originalFilename: string | null;
  mimeType: string | null;
  extension: string | null;
};

function getOwnerScope(session: StaffSession) {
  if (canViewAllMedia(session)) {
    return null;
  }

  if (canViewOwnMedia(session) || canUploadMedia(session)) {
    return session.id;
  }

  throw new MediaServiceError("Accès refusé.", 403);
}

function buildMediaFolderPathData(
  folders: Awaited<ReturnType<typeof listAllMediaFolders>>,
) {
  const foldersById = new Map(
    folders.map((folder) => [folder.id.toString(), folder]),
  );

  const buildBreadcrumbsForFolder = (folderId: bigint | null | undefined) => {
    const breadcrumbs: Array<{ id: bigint; name: string }> = [];
    let currentId = folderId ?? null;
    const visited = new Set<string>();

    while (currentId != null) {
      const key = currentId.toString();

      if (visited.has(key)) {
        break;
      }

      visited.add(key);
      const folder = foldersById.get(key);

      if (!folder) {
        break;
      }

      breadcrumbs.unshift({
        id: folder.id,
        name: folder.name,
      });
      currentId = folder.parentId;
    }

    return breadcrumbs;
  };

  return {
    buildBreadcrumbsForFolder,
    foldersById,
  };
}

function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFileExtension(filename: string, mimeType: string | null) {
  const parsedExtension = path.extname(filename).replace(/^\./, "").toLowerCase();

  if (parsedExtension) {
    return parsedExtension;
  }

  if (!mimeType) {
    return null;
  }

  if (mimeType === "application/pdf") {
    return "pdf";
  }

  const [, subtype = "bin"] = mimeType.split("/");
  return subtype.toLowerCase();
}

function inferMediaKind(input: { mimeType: string | null; extension: string | null }) {
  const mimeType = input.mimeType?.toLowerCase() ?? null;
  const extension = input.extension?.toLowerCase() ?? null;

  if (mimeType?.startsWith("image/")) {
    return MediaKind.IMAGE;
  }

  if (mimeType?.startsWith("video/")) {
    return MediaKind.VIDEO;
  }

  if (
    mimeType?.startsWith("audio/") ||
    mimeType?.startsWith("text/") ||
    mimeType === "application/pdf" ||
    extension === "pdf" ||
    mimeType?.startsWith("application/") ||
    extension
  ) {
    return MediaKind.DOCUMENT;
  }

  throw new MediaServiceError(
    "Format non pris en charge. Utilisez une image, une video, un audio ou un document.",
    400,
  );
}

function buildMediaStorageKey(input: {
  kind: MediaKind;
  originalFilename: string;
  extension: string | null;
}) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const baseName = sanitizeFilename(
    path.basename(input.originalFilename, path.extname(input.originalFilename)),
  );
  const extension = input.extension ?? "bin";

  return `media/${input.kind.toLowerCase()}/${year}/${month}/${randomUUID()}-${baseName || "file"}.${extension}`;
}

async function analyzeImageBuffer(
  buffer: Buffer,
  mimeType: string | null,
) {
  try {
    const image = sharp(buffer, { failOn: "none" }).rotate();
    const metadata = await image.metadata();
    const thumbnailBuffer = await image
      .clone()
      .resize({
        width: getMediaThumbnailMaxWidth(),
        withoutEnlargement: true,
      })
      .webp({
        quality: getMediaThumbnailQuality(),
      })
      .toBuffer();

    return {
      widthPx:
        typeof metadata.width === "number" ? metadata.width : null,
      heightPx:
        typeof metadata.height === "number" ? metadata.height : null,
      thumbnailBuffer,
      thumbnailContentType: "image/webp" as const,
    };
  } catch (error) {
    console.error("MEDIA_IMAGE_PROCESSING_ERROR:", error);
    throw new MediaServiceError(
      `Impossible de traiter cette image${mimeType ? ` (${mimeType})` : ""}.`,
      400,
    );
  }
}

function getMediaReferenceCount(media: Awaited<ReturnType<typeof findMediaById>>) {
  if (!media) {
    return 0;
  }

  return (
    media._count.productFamilyLinks +
    media._count.productVariantLinks +
    media._count.brandLogoFor +
    media._count.productCategoryImageFor +
    media._count.staffProfileAvatarFor +
    media._count.articleMediaLinks +
    media._count.articleCoverFor +
    media._count.articleOgImageFor
  );
}

function assertMediaCanBeDeletedWithoutForce(
  media: NonNullable<Awaited<ReturnType<typeof findMediaById>>>,
) {
  if (media._count.productFamilyLinks > 0) {
    throw new MediaServiceError(
      "Impossible de supprimer un média encore lié à une famille produit.",
      400,
    );
  }

  if (media._count.productVariantLinks > 0) {
    throw new MediaServiceError(
      "Impossible de supprimer un média encore lié à une variante produit.",
      400,
    );
  }

  if (media._count.brandLogoFor > 0) {
    throw new MediaServiceError(
      "Impossible de supprimer un média encore utilisé comme logo de marque.",
      400,
    );
  }

  if (media._count.productCategoryImageFor > 0) {
    throw new MediaServiceError(
      "Impossible de supprimer un média encore utilisé par une catégorie de produit.",
      400,
    );
  }

  if (media._count.staffProfileAvatarFor > 0) {
    throw new MediaServiceError(
      "Impossible de supprimer un média encore utilisé comme avatar.",
      400,
    );
  }

  if (
    media._count.articleMediaLinks > 0 ||
    media._count.articleCoverFor > 0 ||
    media._count.articleOgImageFor > 0
  ) {
    throw new MediaServiceError(
      "Impossible de supprimer un média encore utilisé dans les articles.",
      400,
    );
  }
}

export async function listMediaService(
  session: StaffSession,
  query: MediaListQuery,
): Promise<MediaListResult> {
  if (!canAccessMediaLibrary(session)) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  const ownerUserId = getOwnerScope(session);
  const allFolders = await listAllMediaFolders(ownerUserId);
  const { buildBreadcrumbsForFolder, foldersById } =
    buildMediaFolderPathData(allFolders);
  let currentFolder =
    query.browseMode === "folders" && query.folderId != null
      ? foldersById.get(String(query.folderId)) ?? null
      : null;

  if (query.browseMode === "folders" && query.folderId != null && !currentFolder) {
    const existingFolder = await findMediaFolderById(query.folderId, ownerUserId);

    if (!existingFolder) {
      throw new MediaServiceError("Dossier introuvable.", 404);
    }

    currentFolder = existingFolder;
  }

  const [items, total, stats, folders] = await Promise.all([
    listMedia({ query, ownerUserId }),
    countMedia({ query, ownerUserId }),
    aggregateMediaStats({
      q: query.q,
      status: query.status,
      ownerUserId,
      browseMode: query.browseMode,
      folderId: query.folderId ?? null,
    }),
    query.browseMode === "folders"
      ? listMediaFoldersAtLevel({
          parentId: query.folderId ?? null,
          ownerUserId,
          q: query.q,
        })
      : Promise.resolve([]),
  ]);

  return {
    items: items.map((item) => mapMediaToListItemDto(item, session)),
    currentFolder: currentFolder ? mapMediaFolderSummaryDto(currentFolder) : null,
    breadcrumbs: buildBreadcrumbsForFolder(currentFolder?.id).map((folder) => ({
      id: Number(folder.id),
      name: folder.name,
    })),
    folders: folders.map((folder) => mapMediaFolderListItemDto(folder)),
    folderOptions: allFolders.map((folder) =>
      mapMediaFolderOptionDto({
        ...folder,
        pathLabel: buildBreadcrumbsForFolder(folder.id)
          .map((crumb) => crumb.name)
          .join(" / "),
      }),
    ),
    total,
    page: query.page,
    pageSize: query.pageSize,
    stats: mapMediaStatsDto(stats),
    storage: getMediaStorageInfo(),
  };
}

export async function uploadMediaService(
  session: StaffSession,
  input: MediaUploadInput,
) {
  if (!canUploadMedia(session)) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  const maxUploadBytes = getMediaMaxUploadBytes();
  if (input.file.size > maxUploadBytes) {
    throw new MediaServiceError(
      `Fichier trop volumineux. Limite actuelle: ${Math.floor(maxUploadBytes / (1024 * 1024))} MB.`,
      400,
    );
  }

  const originalFilename = input.file.name || "upload";
  const ownerUserId = getOwnerScope(session);

  if (input.folderId != null) {
    const folder = await findMediaFolderById(input.folderId, ownerUserId);

    if (!folder) {
      throw new MediaServiceError("Dossier introuvable.", 404);
    }
  }

  const extension = getFileExtension(originalFilename, input.file.type || null);
  const kind = inferMediaKind({
    mimeType: input.file.type || null,
    extension,
  });
  const storagePath = buildMediaStorageKey({
    kind,
    originalFilename,
    extension,
  });
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const sha256Hash = createHash("sha256").update(buffer).digest("hex");
  const storage = getMediaStorageDriver();
  const imageArtifacts =
    kind === MediaKind.IMAGE
      ? await analyzeImageBuffer(buffer, input.file.type || null)
      : null;
  const thumbnailStoragePath =
    kind === MediaKind.IMAGE
      ? getMediaVariantStoragePath(storagePath, "thumbnail")
      : null;
  let originalStored = false;
  let thumbnailStored = false;

  try {
    await storage.putObject({
      key: storagePath,
      body: new Uint8Array(buffer),
      contentType: input.file.type || null,
    });
    originalStored = true;

    if (thumbnailStoragePath && imageArtifacts) {
      await storage.putObject({
        key: thumbnailStoragePath,
        body: new Uint8Array(imageArtifacts.thumbnailBuffer),
        contentType: imageArtifacts.thumbnailContentType,
      });
      thumbnailStored = true;
    }
  } catch (error) {
    if (thumbnailStored && thumbnailStoragePath) {
      await storage.deleteObject(thumbnailStoragePath).catch(() => undefined);
    }

    if (originalStored) {
      await storage.deleteObject(storagePath).catch(() => undefined);
    }

    throw error;
  }

  try {
    const media = await createMediaRecord({
      folderId: input.folderId,
      kind,
      visibility: input.visibility,
      storagePath,
      originalFilename,
      mimeType: input.file.type || null,
      extension,
      title: input.title,
      altText: input.altText,
      description: input.description,
      widthPx: imageArtifacts?.widthPx ?? null,
      heightPx: imageArtifacts?.heightPx ?? null,
      sizeBytes: BigInt(buffer.byteLength),
      sha256Hash,
      uploadedByUserId: session.id,
    });

    await createMediaAuditLog({
      actorUserId: session.id,
      actionType: "CREATE",
      entityId: String(media.id),
      targetLabel: media.originalFilename ?? media.title ?? `Media ${media.id}`,
      summary: "Import d'un média",
      afterSnapshotJson: toMediaAuditSnapshot(media),
    });

    return mapMediaToListItemDto(media, session);
  } catch (error) {
    if (thumbnailStored && thumbnailStoragePath) {
      await storage.deleteObject(thumbnailStoragePath).catch(() => undefined);
    }
    if (originalStored) {
      await storage.deleteObject(storagePath).catch(() => undefined);
    }
    throw error;
  }
}

export async function getMediaByIdService(
  session: StaffSession,
  mediaId: number,
) {
  if (!canAccessMediaLibrary(session)) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  const media = await findMediaById(mediaId);

  if (!media) {
    throw new MediaServiceError("Média introuvable.", 404);
  }

  if (!canViewMediaRecord(session, media.uploadedByUserId)) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  return mapMediaToListItemDto(media, session);
}

export async function updateMediaService(
  session: StaffSession,
  mediaId: number,
  input: MediaUpdateInput,
) {
  if (!canAccessMediaLibrary(session)) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  const existingMedia = await findMediaById(mediaId);

  if (!existingMedia) {
    throw new MediaServiceError("Média introuvable.", 404);
  }

  if (!canUpdateMediaRecord(session, existingMedia.uploadedByUserId)) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  const ownerUserId = getOwnerScope(session);

  if (input.folderId != null) {
    const folder = await findMediaFolderById(input.folderId, ownerUserId);

    if (!folder) {
      throw new MediaServiceError("Dossier introuvable.", 404);
    }
  }

  const shouldChangeVisibility =
    input.visibility != null && existingMedia.visibility !== input.visibility;
  const shouldChangeFolder =
    input.folderId !== undefined && existingMedia.folderId !== input.folderId;

  if (!shouldChangeVisibility && !shouldChangeFolder) {
    return mapMediaToListItemDto(existingMedia, session);
  }

  const updatedMedia = await updateMediaRecord(mediaId, {
    ...input,
    updatedByUserId: session.id,
  });

  await createMediaAuditLog({
    actorUserId: session.id,
    actionType: "UPDATE",
    entityId: String(updatedMedia.id),
    targetLabel:
      updatedMedia.originalFilename ??
      updatedMedia.title ??
      `Media ${updatedMedia.id}`,
    summary: shouldChangeFolder
      ? "Déplacement d'un média"
      : input.visibility === MediaVisibility.PUBLIC
        ? "Passage d'un média en public"
        : "Passage d'un média en privé",
    beforeSnapshotJson: toMediaAuditSnapshot(existingMedia),
    afterSnapshotJson: toMediaAuditSnapshot(updatedMedia),
  });

  return mapMediaToListItemDto(updatedMedia, session);
}

export async function createMediaFolderService(
  session: StaffSession,
  input: MediaFolderCreateInput,
) {
  if (!canAccessMediaLibrary(session) || !canUploadMedia(session)) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  const ownerUserId = getOwnerScope(session);

  if (input.parentId != null) {
    const parent = await findMediaFolderById(input.parentId, ownerUserId);

    if (!parent) {
      throw new MediaServiceError("Dossier parent introuvable.", 404);
    }
  }

  const folder = await createMediaFolderRecord({
    name: input.name.trim(),
    parentId: input.parentId,
    createdByUserId: session.id,
  });

  return mapMediaFolderSummaryDto(folder);
}

export async function deleteMediaFolderService(
  session: StaffSession,
  folderId: number,
  options: MediaDeleteOptions = {},
) {
  if (!canAccessMediaLibrary(session) || !canUploadMedia(session)) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  const ownerUserId = getOwnerScope(session);
  const existingFolder = await findMediaFolderById(folderId, ownerUserId);

  if (!existingFolder) {
    throw new MediaServiceError("Dossier introuvable.", 404);
  }

  const forceRemove = options.force === true;

  if (forceRemove && !canForceRemoveMedia(session)) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  const contents = await countMediaFolderContents(folderId, ownerUserId);

  if (!forceRemove && (contents.mediaCount > 0 || contents.childFolderCount > 0)) {
    throw new MediaServiceError(
      "Impossible de supprimer un dossier non vide sans forcer la suppression.",
      400,
    );
  }

  if (forceRemove) {
    await detachMediaFolderRelationsAndDeleteFolderRecord({
      folderId,
      parentId:
        existingFolder.parentId != null ? Number(existingFolder.parentId) : null,
      ownerUserId,
    });
    return;
  }

  await deleteMediaFolderRecord(folderId);
}

export async function updateMediaFolderService(
  session: StaffSession,
  folderId: number,
  input: MediaFolderUpdateInput,
) {
  if (!canAccessMediaLibrary(session) || !canUploadMedia(session)) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  const ownerUserId = getOwnerScope(session);
  const [existingFolder, allFolders] = await Promise.all([
    findMediaFolderById(folderId, ownerUserId),
    listAllMediaFolders(ownerUserId),
  ]);

  if (!existingFolder) {
    throw new MediaServiceError("Dossier introuvable.", 404);
  }

  if (input.parentId === folderId) {
    throw new MediaServiceError(
      "Impossible de déplacer un dossier dans lui-même.",
      400,
    );
  }

  const foldersById = new Map(
    allFolders.map((folder) => [Number(folder.id), folder]),
  );

  if (input.parentId != null) {
    const targetParent = foldersById.get(input.parentId);

    if (!targetParent) {
      throw new MediaServiceError("Dossier parent introuvable.", 404);
    }

    let currentParentId =
      targetParent.parentId != null ? Number(targetParent.parentId) : null;

    while (currentParentId != null) {
      if (currentParentId === folderId) {
        throw new MediaServiceError(
          "Impossible de déplacer un dossier dans l'un de ses sous-dossiers.",
          400,
        );
      }

      currentParentId =
        foldersById.get(currentParentId)?.parentId != null
          ? Number(foldersById.get(currentParentId)?.parentId)
          : null;
    }
  }

  const currentParentId =
    existingFolder.parentId != null ? Number(existingFolder.parentId) : null;

  if (currentParentId === input.parentId) {
    return mapMediaFolderSummaryDto(existingFolder);
  }

  const folder = await updateMediaFolderRecord({
    folderId,
    parentId: input.parentId,
  });

  return mapMediaFolderSummaryDto(folder);
}

export async function imageMediaExists(mediaId: number) {
  const media = await findImageMediaById(mediaId);
  return !!media;
}

export async function deleteMediaService(
  session: StaffSession,
  mediaId: number,
  options: MediaDeleteOptions = {},
) {
  if (!canAccessMediaLibrary(session)) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  const forceRemove = options.force === true;
  const media = await findMediaById(mediaId);

  if (!media) {
    throw new MediaServiceError("Média introuvable.", 404);
  }

  if (
    forceRemove
      ? !canForceRemoveMediaRecord(session, media.uploadedByUserId)
      : !canDeleteMediaRecord(session, media.uploadedByUserId)
  ) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  if (!forceRemove) {
    assertMediaCanBeDeletedWithoutForce(media);
  }

  const storage = getMediaStorageDriver();
  try {
    await storage.deleteObject(media.storagePath);

    if (media.kind === MediaKind.IMAGE) {
      await storage.deleteObject(getMediaVariantStoragePath(media.storagePath, "thumbnail"));
    }
  } catch (error) {
    console.error("MEDIA_STORAGE_DELETE_ERROR:", error);
    throw new MediaServiceError(
      "Impossible de supprimer le fichier dans le stockage.",
      500,
    );
  }

  const deletionResult = forceRemove
    ? await detachMediaReferencesAndDeleteMediaRecord(mediaId)
    : {
        deletedMedia: await deleteMediaRecord(mediaId),
        detachedReferences: null,
      };
  const referenceCount = forceRemove
    ? deletionResult.detachedReferences?.total ?? getMediaReferenceCount(media)
    : getMediaReferenceCount(media);
  const forceSummarySuffix =
    forceRemove && referenceCount > 0
      ? ` (${deletionResult.detachedReferences?.total ?? 0} reference(s) retirees)`
      : "";

  await createMediaAuditLog({
    actorUserId: session.id,
    actionType: "DELETE",
    entityId: String(media.id),
    targetLabel: media.originalFilename ?? media.title ?? `Media ${media.id}`,
    summary: forceRemove
      ? `Suppression forcee d'un media${forceSummarySuffix}`
      : "Suppression d'un média",
    beforeSnapshotJson: toMediaAuditSnapshot(media),
    afterSnapshotJson: toMediaAuditSnapshot(deletionResult.deletedMedia),
  });
}

async function readStoredMediaObject(
  media: MediaStorageReadableRecord,
  variant: MediaFileVariant = "original",
) {
  const storage = getMediaStorageDriver();
  const thumbnailStoragePath = getMediaVariantStoragePath(
    media.storagePath,
    "thumbnail",
  );

  if (variant === "thumbnail" && media.kind === MediaKind.IMAGE) {
    const existingThumbnail = await storage.readObject(thumbnailStoragePath);

    if (existingThumbnail) {
      return {
        body: existingThumbnail.body,
        contentType: existingThumbnail.contentType ?? "image/webp",
        originalFilename:
          buildMediaVariantFilename(media.originalFilename, "thumbnail") ??
          `media-${media.id}-thumbnail.webp`,
      };
    }

    const originalObject = await storage.readObject(media.storagePath);

    if (!originalObject) {
      throw new MediaServiceError(
        "Fichier média introuvable dans le stockage.",
        404,
      );
    }

    try {
      const imageArtifacts = await analyzeImageBuffer(
        Buffer.from(originalObject.body),
        media.mimeType ?? originalObject.contentType,
      );

      await storage.putObject({
        key: thumbnailStoragePath,
        body: new Uint8Array(imageArtifacts.thumbnailBuffer),
        contentType: imageArtifacts.thumbnailContentType,
      });

      return {
        body: new Uint8Array(imageArtifacts.thumbnailBuffer),
        contentType: imageArtifacts.thumbnailContentType,
        originalFilename:
          buildMediaVariantFilename(media.originalFilename, "thumbnail") ??
          `media-${media.id}-thumbnail.webp`,
      };
    } catch (error) {
      console.error("MEDIA_THUMBNAIL_GENERATION_ERROR:", error);

      return {
        body: originalObject.body,
        contentType:
          media.mimeType ??
          originalObject.contentType ??
          "application/octet-stream",
        originalFilename:
          buildMediaVariantFilename(media.originalFilename, "original") ??
          `media-${media.id}${media.extension ? `.${media.extension}` : ""}`,
      };
    }
  }

  const object = await storage.readObject(media.storagePath);

  if (!object) {
    throw new MediaServiceError("Fichier média introuvable dans le stockage.", 404);
  }

  return {
    body: object.body,
    contentType: media.mimeType ?? object.contentType ?? "application/octet-stream",
    originalFilename:
      buildMediaVariantFilename(
        media.originalFilename ??
          `media-${media.id}${media.extension ? `.${media.extension}` : ""}`,
        "original",
      ) ?? `media-${media.id}${media.extension ? `.${media.extension}` : ""}`,
  };
}

export async function readMediaFileService(
  session: StaffSession,
  mediaId: number,
  variant: MediaFileVariant = "original",
) {
  if (!canAccessMediaLibrary(session)) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  const media = await findMediaById(mediaId);

  if (!media) {
    throw new MediaServiceError("Média introuvable.", 404);
  }

  if (!canViewMediaRecord(session, media.uploadedByUserId)) {
    throw new MediaServiceError("Accès refusé.", 403);
  }

  return readStoredMediaObject(media, variant);
}

export async function readPublicMediaFileService(
  mediaId: number,
  variant: MediaFileVariant = "original",
) {
  const media = await findPublicMediaById(mediaId);

  if (!media) {
    throw new MediaServiceError("Média introuvable.", 404);
  }

  return readStoredMediaObject(media, variant);
}
