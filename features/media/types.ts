import type { MediaKind, MediaVisibility } from "@prisma/client";
import type { MediaStorageInfo } from "@/lib/server/storage/media/types";

export const DEFAULT_MEDIA_PAGE_SIZE = 36;
export const MAX_MEDIA_PAGE_SIZE = 96;

export type MediaFilterStatus = "all" | "active" | "inactive";
export type MediaFilterKind = MediaKind | "ALL";
export type MediaSortBy = "date" | "name" | "size";
export type MediaSortDirection = "asc" | "desc";
export type MediaView = "all" | "images" | "videos" | "pdf" | "audio" | "other";
export type MediaBrowseMode = "folders" | "library";
export type MediaFolderLayout = "grid" | "list";
export type MediaFileVariant = "original" | "thumbnail";
export type MediaDeleteOptions = {
  force?: boolean;
};

export type MediaListQuery = {
  browseMode: MediaBrowseMode;
  page: number;
  pageSize: number;
  folderId?: number | null;
  q?: string;
  kind?: MediaFilterKind;
  status?: MediaFilterStatus;
  sortBy?: MediaSortBy;
  sortDirection?: MediaSortDirection;
};

export type MediaUploadInput = {
  file: File;
  title: string | null;
  altText: string | null;
  description: string | null;
  visibility: MediaVisibility;
  folderId: number | null;
};

export type MediaUploadRequest = {
  file: File;
  title?: string;
  altText?: string;
  description?: string;
  visibility?: MediaVisibility;
  folderId?: number | null;
};

export type MediaUpdateInput = {
  visibility?: MediaVisibility;
  folderId?: number | null;
};

export type MediaFolderCreateInput = {
  name: string;
  parentId: number | null;
};

export type MediaFolderUpdateInput = {
  parentId: number | null;
};

export type MediaUsageDto = {
  productFamilies: number;
  productVariants: number;
  brandLogos: number;
  productCategoryImages: number;
  staffAvatars: number;
  articleAttachments: number;
  articleCovers: number;
  articleOgImages: number;
  total: number;
};

export type MediaListItemDto = {
  id: number;
  folderId: number | null;
  kind: MediaKind;
  visibility: MediaVisibility;
  storagePath: string;
  fileEndpoint: string;
  publicFileEndpoint: string;
  originalFilename: string | null;
  title: string | null;
  description: string | null;
  altText: string | null;
  mimeType: string | null;
  extension: string | null;
  widthPx: number | null;
  heightPx: number | null;
  durationSeconds: number | null;
  sizeBytes: number | null;
  sha256Hash: string | null;
  isActive: boolean;
  uploadedByUserId: string | null;
  uploadedByLabel: string | null;
  uploadedByCurrentUser: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canForceRemove: boolean;
  usage: MediaUsageDto;
  createdAt: string;
  updatedAt: string;
};

export type MediaFolderSummaryDto = {
  id: number;
  parentId: number | null;
  name: string;
};

export type MediaFolderListItemDto = MediaFolderSummaryDto & {
  mediaCount: number;
  childFolderCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MediaFolderBreadcrumbDto = {
  id: number;
  name: string;
};

export type MediaFolderOptionDto = {
  id: number;
  parentId: number | null;
  name: string;
  pathLabel: string;
};

export type MediaUploadBatchItemResult =
  | {
      ok: true;
      input: MediaUploadRequest;
      media: MediaListItemDto;
    }
  | {
      ok: false;
      input: MediaUploadRequest;
      errorMessage: string;
    };

export type MediaUploadBatchResult = {
  total: number;
  successCount: number;
  errorCount: number;
  items: MediaUploadBatchItemResult[];
};

export type MediaUploadBatchCallbacks = {
  onItemStart?: (context: { index: number; input: MediaUploadRequest }) => void;
  onItemComplete?: (context: {
    index: number;
    result: MediaUploadBatchItemResult;
  }) => void;
};

export type MediaStatsDto = {
  total: number;
  images: number;
  videos: number;
  documents: number;
  totalSizeBytes: number;
};

export type MediaListResult = {
  items: MediaListItemDto[];
  currentFolder: MediaFolderSummaryDto | null;
  breadcrumbs: MediaFolderBreadcrumbDto[];
  folders: MediaFolderListItemDto[];
  folderOptions: MediaFolderOptionDto[];
  total: number;
  page: number;
  pageSize: number;
  stats: MediaStatsDto;
  storage: MediaStorageInfo;
};
