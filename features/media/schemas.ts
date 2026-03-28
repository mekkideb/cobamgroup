import { MediaKind, MediaVisibility } from "@prisma/client";
import {
  DEFAULT_MEDIA_PAGE_SIZE,
  MAX_MEDIA_PAGE_SIZE,
  type MediaBrowseMode,
  type MediaFileVariant,
  type MediaFilterKind,
  type MediaFilterStatus,
  type MediaFolderCreateInput,
  type MediaFolderUpdateInput,
  type MediaListQuery,
  type MediaSortBy,
  type MediaSortDirection,
  type MediaUpdateInput,
  type MediaUploadInput,
} from "./types";

export class MediaValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function parseOptionalString(value: FormDataEntryValue | string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseMediaVisibility(
  value: string | null | undefined,
): MediaVisibility | null {
  if (value == null) {
    return null;
  }

  return value === MediaVisibility.PUBLIC
    ? MediaVisibility.PUBLIC
    : value === MediaVisibility.PRIVATE
      ? MediaVisibility.PRIVATE
      : null;
}

export function parseMediaIdParam(idParam: string) {
  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    throw new MediaValidationError("Identifiant media invalide.");
  }

  return id;
}

function parseSortBy(value: string | null): MediaSortBy {
  if (value === "name" || value === "size") {
    return value;
  }

  return "date";
}

function parseSortDirection(value: string | null): MediaSortDirection {
  return value === "asc" ? "asc" : "desc";
}

function parseBrowseMode(value: string | null): MediaBrowseMode {
  return value === "library" ? "library" : "folders";
}

function parseOptionalMediaFolderId(
  value: string | number | null | undefined,
  fieldName: string,
): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new MediaValidationError(`Dossier invalide pour ${fieldName}.`);
  }

  return parsed;
}

export function parseMediaListQuery(
  searchParams: URLSearchParams,
): MediaListQuery {
  const browseMode = parseBrowseMode(searchParams.get("browseMode"));
  const pageRaw = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const pageSizeRaw = Number(searchParams.get("pageSize") ?? String(DEFAULT_MEDIA_PAGE_SIZE));
  const pageSize =
    Number.isInteger(pageSizeRaw) && pageSizeRaw >= 12 && pageSizeRaw <= MAX_MEDIA_PAGE_SIZE
      ? pageSizeRaw
      : DEFAULT_MEDIA_PAGE_SIZE;

  const qRaw = searchParams.get("q");
  const q = qRaw?.trim() ? qRaw.trim() : undefined;

  const kindRaw = searchParams.get("kind");
  const kind: MediaFilterKind =
    kindRaw && Object.values(MediaKind).includes(kindRaw as MediaKind)
      ? (kindRaw as MediaKind)
      : "ALL";

  const statusRaw = searchParams.get("status");
  const status: MediaFilterStatus =
    statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "all";

  const folderId =
    browseMode === "folders"
      ? (parseOptionalMediaFolderId(
          searchParams.get("folderId"),
          "folderId",
        ) ?? null)
      : undefined;

  return {
    browseMode,
    page,
    pageSize,
    folderId,
    q,
    kind,
    status,
    sortBy: parseSortBy(searchParams.get("sortBy")),
    sortDirection: parseSortDirection(searchParams.get("sortDirection")),
  };
}

export function parseMediaUploadFormData(formData: FormData): MediaUploadInput {
  const fileEntry = formData.get("file");

  if (!(fileEntry instanceof File) || fileEntry.size <= 0) {
    throw new MediaValidationError("Aucun fichier valide n'a ete fourni.");
  }

  return {
    file: fileEntry,
    title: parseOptionalString(formData.get("title")),
    altText: parseOptionalString(formData.get("altText")),
    description: parseOptionalString(formData.get("description")),
    visibility:
      parseMediaVisibility(
        typeof formData.get("visibility") === "string"
          ? (formData.get("visibility") as string)
          : null,
      ) ?? MediaVisibility.PRIVATE,
    folderId:
      parseOptionalMediaFolderId(
        typeof formData.get("folderId") === "string"
          ? (formData.get("folderId") as string)
          : null,
        "folderId",
      ) ?? null,
  };
}

export function parseMediaUpdateInput(raw: unknown): MediaUpdateInput {
  if (typeof raw !== "object" || raw === null) {
    throw new MediaValidationError("Requete invalide.");
  }

  const rawRecord = raw as Record<string, unknown>;

  const visibility =
    "visibility" in rawRecord && typeof rawRecord.visibility === "string"
      ? parseMediaVisibility(rawRecord.visibility)
      : null;

  const hasFolderId = "folderId" in rawRecord;
  const folderId = hasFolderId
    ? parseOptionalMediaFolderId(
        typeof rawRecord.folderId === "number" || typeof rawRecord.folderId === "string"
          ? rawRecord.folderId
          : rawRecord.folderId === null
            ? null
            : undefined,
        "folderId",
      )
    : undefined;

  if (!visibility && !hasFolderId) {
    throw new MediaValidationError("Aucune modification demandee.");
  }

  if ("visibility" in rawRecord && !visibility) {
    throw new MediaValidationError("Visibilite invalide.");
  }

  const result: MediaUpdateInput = {};

  if (visibility) {
    result.visibility = visibility;
  }

  if (hasFolderId) {
    result.folderId = folderId ?? null;
  }

  return result;
}

export function parseMediaFolderCreateInput(raw: unknown): MediaFolderCreateInput {
  if (typeof raw !== "object" || raw === null) {
    throw new MediaValidationError("Requete invalide.");
  }

  const rawRecord = raw as Record<string, unknown>;
  const name =
    "name" in rawRecord && typeof rawRecord.name === "string"
      ? rawRecord.name.trim()
      : "";

  if (!name) {
    throw new MediaValidationError("Le nom du dossier est requis.");
  }

  if (name.length > 255) {
    throw new MediaValidationError("Le nom du dossier est trop long.");
  }

  const parentId =
    "parentId" in rawRecord
      ? parseOptionalMediaFolderId(
          typeof rawRecord.parentId === "number" ||
          typeof rawRecord.parentId === "string"
            ? rawRecord.parentId
            : rawRecord.parentId === null
              ? null
              : undefined,
          "parentId",
        ) ?? null
      : null;

  return {
    name,
    parentId,
  };
}

export function parseMediaFolderUpdateInput(raw: unknown): MediaFolderUpdateInput {
  if (typeof raw !== "object" || raw === null) {
    throw new MediaValidationError("Requete invalide.");
  }

  const rawRecord = raw as Record<string, unknown>;

  if (!("parentId" in rawRecord)) {
    throw new MediaValidationError("Aucune modification demandee.");
  }

  const parentId =
    parseOptionalMediaFolderId(
      typeof rawRecord.parentId === "number" ||
      typeof rawRecord.parentId === "string"
        ? rawRecord.parentId
        : rawRecord.parentId === null
          ? null
          : undefined,
      "parentId",
    ) ?? null;

  return {
    parentId,
  };
}

export function parseMediaFileVariant(
  searchParams: URLSearchParams,
): MediaFileVariant {
  return searchParams.get("variant") === "thumbnail"
    ? "thumbnail"
    : "original";
}
