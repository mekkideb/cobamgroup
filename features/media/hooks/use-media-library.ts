"use client";

import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createMediaFolderClient,
  deleteMediaFolderClient,
  deleteMediaClient,
  listMediaClient,
  updateMediaFolderClient,
  updateMediaClient,
  uploadMediaClient,
} from "../client";
import type {
  MediaBrowseMode,
  MediaDeleteOptions,
  MediaUploadBatchCallbacks,
  MediaUploadBatchResult,
  MediaUploadRequest,
  MediaFilterKind,
  MediaFolderLayout,
  MediaFolderCreateInput,
  MediaFolderListItemDto,
  MediaListItemDto,
  MediaListResult,
  MediaSortBy,
  MediaSortDirection,
  MediaUpdateInput,
  MediaView,
} from "../types";
import { DEFAULT_MEDIA_PAGE_SIZE } from "../types";
import {
  getMediaGroupDescriptor,
  getMediaViewForItem,
} from "@/components/staff/media/utils";

type UseMediaLibraryOptions = {
  browseMode?: MediaBrowseMode;
  onBrowseModeChange?: (value: MediaBrowseMode) => void;
  folderLayout?: MediaFolderLayout;
  onFolderLayoutChange?: (value: MediaFolderLayout) => void;
  currentFolderId?: number | null;
  onCurrentFolderIdChange?: (value: number | null) => void;
};

type MediaRenderGroup = {
  key: string;
  label: string;
  items: MediaListItemDto[];
};

type MediaSelectionKey = `folder:${number}` | `media:${number}`;

function getMediaSelectionKey(mediaId: number): MediaSelectionKey {
  return `media:${mediaId}`;
}

function getFolderSelectionKey(folderId: number): MediaSelectionKey {
  return `folder:${folderId}`;
}

const SERVER_KIND_BY_VIEW: Record<MediaView, MediaFilterKind> = {
  all: "ALL",
  images: "IMAGE",
  videos: "VIDEO",
  pdf: "DOCUMENT",
  audio: "DOCUMENT",
  other: "DOCUMENT",
};

function matchesView(media: MediaListItemDto, view: MediaView) {
  return view === "all" ? true : getMediaViewForItem(media) === view;
}

function withDefaultFolderId(
  input: MediaUploadRequest,
  browseMode: MediaBrowseMode,
  currentFolderId: number | null,
): MediaUploadRequest {
  if (input.folderId !== undefined) {
    return input;
  }

  return {
    ...input,
    folderId: browseMode === "folders" ? currentFolderId : null,
  };
}

export function useMediaLibrary(
  pageSize = DEFAULT_MEDIA_PAGE_SIZE,
  options: UseMediaLibraryOptions = {},
) {
  const [items, setItems] = useState<MediaListItemDto[]>([]);
  const [folders, setFolders] = useState<MediaFolderListItemDto[]>([]);
  const [currentFolder, setCurrentFolder] =
    useState<MediaListResult["currentFolder"]>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    MediaListResult["breadcrumbs"]
  >([]);
  const [folderOptions, setFolderOptions] = useState<
    MediaListResult["folderOptions"]
  >([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [internalBrowseMode, setInternalBrowseMode] =
    useState<MediaBrowseMode>("folders");
  const [internalFolderLayout, setInternalFolderLayout] =
    useState<MediaFolderLayout>("grid");
  const [internalCurrentFolderId, setInternalCurrentFolderId] =
    useState<number | null>(null);
  const [activeView, setActiveViewState] = useState<MediaView>("all");
  const [sortBy, setSortByState] = useState<MediaSortBy>("date");
  const [sortDirection, setSortDirection] =
    useState<MediaSortDirection>("desc");
  const [stats, setStats] = useState<MediaListResult["stats"] | null>(null);
  const [storage, setStorage] = useState<MediaListResult["storage"] | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<number | null>(null);
  const [isDeletingSelection, setIsDeletingSelection] = useState(false);
  const [isMovingSelection, setIsMovingSelection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMediaIds, setSelectedMediaIds] = useState<number[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
  const [selectionAnchorKey, setSelectionAnchorKey] =
    useState<MediaSelectionKey | null>(null);
  const [openedMediaId, setOpenedMediaId] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const browseMode = options.browseMode ?? internalBrowseMode;
  const folderLayout = options.folderLayout ?? internalFolderLayout;
  const currentFolderId =
    options.currentFolderId !== undefined
      ? options.currentFolderId
      : internalCurrentFolderId;

  const fetchPage = useCallback(
    async ({
      nextPage,
      reset,
      preserveOpenedMedia = false,
    }: {
      nextPage: number;
      reset: boolean;
      preserveOpenedMedia?: boolean;
    }) => {
      const requestId = ++requestIdRef.current;

      if (reset) {
        setIsLoadingInitial(true);
        setItems([]);
        setFolders([]);
        setPage(1);
        setHasMore(true);
        setSelectedMediaIds([]);
        setSelectedFolderIds([]);
        setSelectionAnchorKey(null);
        if (!preserveOpenedMedia) {
          setOpenedMediaId(null);
        }
      } else {
        setIsLoadingMore(true);
      }

      setError(null);

      try {
        const result = await listMediaClient({
          browseMode,
          folderId: browseMode === "folders" ? currentFolderId : undefined,
          page: nextPage,
          pageSize,
          q: deferredSearch,
          kind: SERVER_KIND_BY_VIEW[activeView],
          sortBy,
          sortDirection,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        setItems((current) => {
          if (reset) {
            return result.items;
          }

          const knownIds = new Set(current.map((item) => item.id));
          const merged = [...current];

          for (const item of result.items) {
            if (!knownIds.has(item.id)) {
              merged.push(item);
            }
          }

          return merged;
        });
        setFolders(result.folders);
        setCurrentFolder(result.currentFolder);
        setBreadcrumbs(result.breadcrumbs);
        setFolderOptions(result.folderOptions);
        setTotal(result.total);
        setStats(result.stats);
        setStorage(result.storage);
        setPage(nextPage);
        setHasMore(nextPage * pageSize < result.total);
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des médias",
        );
        if (reset) {
          setFolders([]);
          setCurrentFolder(null);
          setBreadcrumbs([]);
          setFolderOptions([]);
          setTotal(0);
          setStats(null);
          setStorage(null);
          setHasMore(false);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          if (reset) {
            setIsLoadingInitial(false);
          } else {
            setIsLoadingMore(false);
          }
        }
      }
    },
    [
      activeView,
      browseMode,
      currentFolderId,
      deferredSearch,
      pageSize,
      sortBy,
      sortDirection,
    ],
  );

  useEffect(() => {
    void fetchPage({ nextPage: 1, reset: true });
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingInitial || isLoadingMore || !hasMore) {
      return;
    }

    await fetchPage({ nextPage: page + 1, reset: false });
  }, [fetchPage, hasMore, isLoadingInitial, isLoadingMore, page]);

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      {
        rootMargin: "640px 0px",
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [loadMore]);

  const visibleItems = useMemo(
    () => items.filter((item) => matchesView(item, activeView)),
    [activeView, items],
  );

  const groups = useMemo<MediaRenderGroup[]>(() => {
    const result: MediaRenderGroup[] = [];

    for (const item of visibleItems) {
      const descriptor = getMediaGroupDescriptor(item, sortBy);
      const currentGroup = result[result.length - 1];

      if (!currentGroup || currentGroup.key !== descriptor.key) {
        result.push({
          key: descriptor.key,
          label: descriptor.label,
          items: [item],
        });
        continue;
      }

      currentGroup.items.push(item);
    }

    return result;
  }, [sortBy, visibleItems]);

  const selectedMediaIdSet = useMemo(
    () => new Set(selectedMediaIds),
    [selectedMediaIds],
  );
  const selectedFolderIdSet = useMemo(
    () => new Set(selectedFolderIds),
    [selectedFolderIds],
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedMediaIdSet.has(item.id)),
    [items, selectedMediaIdSet],
  );

  const selectedFolders = useMemo(
    () => folders.filter((folder) => selectedFolderIdSet.has(folder.id)),
    [folders, selectedFolderIdSet],
  );

  const selectedMedia = useMemo(
    () => items.find((item) => item.id === openedMediaId) ?? null,
    [items, openedMediaId],
  );

  const selectedTotalSize = useMemo(
    () => selectedItems.reduce((sum, item) => sum + (item.sizeBytes ?? 0), 0),
    [selectedItems],
  );

  const selectedCount = selectedMediaIds.length + selectedFolderIds.length;
  const selectionRequiresForceDelete =
    selectedItems.some((item) => item.usage.total > 0) ||
    selectedFolders.some(
      (folder) => folder.mediaCount > 0 || folder.childFolderCount > 0,
    );
  const canDeleteSelection =
    (selectedItems.length > 0 || selectedFolders.length > 0) &&
    selectedItems.every((item) =>
      item.usage.total > 0 ? item.canForceRemove : item.canDelete,
    );

  const orderedVisibleEntryKeys = useMemo(
    () => [
      ...(browseMode === "folders"
        ? folders.map((folder) => getFolderSelectionKey(folder.id))
        : []),
      ...visibleItems.map((item) => getMediaSelectionKey(item.id)),
    ],
    [browseMode, folders, visibleItems],
  );

  const setBrowseMode = useCallback((value: MediaBrowseMode) => {
    startTransition(() => {
      options.onBrowseModeChange?.(value);

      if (options.browseMode === undefined) {
        setInternalBrowseMode(value);
      }
    });
  }, [options]);

  const setFolderLayout = useCallback((value: MediaFolderLayout) => {
    startTransition(() => {
      options.onFolderLayoutChange?.(value);

      if (options.folderLayout === undefined) {
        setInternalFolderLayout(value);
      }
    });
  }, [options]);

  const setActiveView = useCallback((view: MediaView) => {
    startTransition(() => {
      setActiveViewState(view);
    });
  }, []);

  const setSortBy = useCallback((value: MediaSortBy) => {
    startTransition(() => {
      setSortByState(value);
    });
  }, []);

  const toggleSortDirection = useCallback(() => {
    startTransition(() => {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    });
  }, []);

  const openFolder = useCallback((folderId: number) => {
    startTransition(() => {
      options.onCurrentFolderIdChange?.(folderId);

      if (options.currentFolderId === undefined) {
        setInternalCurrentFolderId(folderId);
      }
    });
  }, [options]);

  const openRootFolder = useCallback(() => {
    startTransition(() => {
      options.onCurrentFolderIdChange?.(null);

      if (options.currentFolderId === undefined) {
        setInternalCurrentFolderId(null);
      }
    });
  }, [options]);

  const toggleSelectionKey = useCallback(
    (
      selectionKey: MediaSelectionKey,
      checked: boolean,
      options: {
        shiftKey?: boolean;
      } = {},
    ) => {
      const nextMediaIds = new Set(selectedMediaIds);
      const nextFolderIds = new Set(selectedFolderIds);

      if (options.shiftKey && selectionAnchorKey != null) {
        const startIndex = orderedVisibleEntryKeys.indexOf(selectionAnchorKey);
        const endIndex = orderedVisibleEntryKeys.indexOf(selectionKey);

        if (startIndex !== -1 && endIndex !== -1) {
          const [from, to] =
            startIndex <= endIndex
              ? [startIndex, endIndex]
              : [endIndex, startIndex];

          for (const key of orderedVisibleEntryKeys.slice(from, to + 1)) {
            const [kind, rawId] = key.split(":");
            const parsedId = Number(rawId);

            if (!Number.isInteger(parsedId) || parsedId <= 0) {
              continue;
            }

            if (kind === "folder") {
              if (checked) {
                nextFolderIds.add(parsedId);
              } else {
                nextFolderIds.delete(parsedId);
              }
            } else {
              if (checked) {
                nextMediaIds.add(parsedId);
              } else {
                nextMediaIds.delete(parsedId);
              }
            }
          }

          setSelectedMediaIds(Array.from(nextMediaIds));
          setSelectedFolderIds(Array.from(nextFolderIds));
          setSelectionAnchorKey(selectionKey);
          return;
        }
      }

      const [kind, rawId] = selectionKey.split(":");
      const parsedId = Number(rawId);

      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return;
      }

      if (kind === "folder") {
        if (checked) {
          nextFolderIds.add(parsedId);
        } else {
          nextFolderIds.delete(parsedId);
        }
      } else if (checked) {
        nextMediaIds.add(parsedId);
      } else {
        nextMediaIds.delete(parsedId);
      }

      setSelectedMediaIds(Array.from(nextMediaIds));
      setSelectedFolderIds(Array.from(nextFolderIds));
      setSelectionAnchorKey(selectionKey);
    },
    [
      orderedVisibleEntryKeys,
      selectedFolderIds,
      selectedMediaIds,
      selectionAnchorKey,
    ],
  );

  const toggleSelected = useCallback(
    (
      mediaId: number,
      checked: boolean,
      options: {
        shiftKey?: boolean;
      } = {},
    ) => {
      toggleSelectionKey(getMediaSelectionKey(mediaId), checked, options);
    },
    [toggleSelectionKey],
  );

  const toggleSelectedFolder = useCallback(
    (
      folderId: number,
      checked: boolean,
      options: {
        shiftKey?: boolean;
      } = {},
    ) => {
      toggleSelectionKey(getFolderSelectionKey(folderId), checked, options);
    },
    [toggleSelectionKey],
  );

  const toggleManySelected = useCallback(
    (mediaIds: number[], checked: boolean) => {
      setSelectedMediaIds((current) => {
        const next = new Set(current);

        for (const mediaId of mediaIds) {
          if (checked) {
            next.add(mediaId);
          } else {
            next.delete(mediaId);
          }
        }

        return Array.from(next);
      });
    },
    [],
  );

  const toggleManyFoldersSelected = useCallback(
    (folderIds: number[], checked: boolean) => {
      setSelectedFolderIds((current) => {
        const next = new Set(current);

        for (const folderId of folderIds) {
          if (checked) {
            next.add(folderId);
          } else {
            next.delete(folderId);
          }
        }

        return Array.from(next);
      });
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedMediaIds([]);
    setSelectedFolderIds([]);
    setSelectionAnchorKey(null);
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedMediaIds(visibleItems.map((item) => item.id));
    setSelectedFolderIds(
      browseMode === "folders" ? folders.map((folder) => folder.id) : [],
    );

    const lastVisibleEntryKey =
      orderedVisibleEntryKeys[orderedVisibleEntryKeys.length - 1] ?? null;
    setSelectionAnchorKey(lastVisibleEntryKey);
  }, [browseMode, folders, orderedVisibleEntryKeys, visibleItems]);

  const openMedia = useCallback((mediaId: number) => {
    setOpenedMediaId(mediaId);
  }, []);

  const closeMedia = useCallback(() => {
    setOpenedMediaId(null);
  }, []);

  const createFolder = useCallback(
    async (input: Omit<MediaFolderCreateInput, "parentId"> & { parentId?: number | null }) => {
      const folder = await createMediaFolderClient({
        name: input.name,
        parentId:
          input.parentId !== undefined
            ? input.parentId
            : browseMode === "folders"
              ? currentFolderId
              : null,
      });

      await fetchPage({ nextPage: 1, reset: true });
      return folder;
    },
    [browseMode, currentFolderId, fetchPage],
  );

  const upload = useCallback(
    async (input: MediaUploadRequest) => {
      setIsUploading(true);
      setError(null);

      try {
        const media = await uploadMediaClient(
          withDefaultFolderId(input, browseMode, currentFolderId),
        );
        await fetchPage({ nextPage: 1, reset: true });
        return media;
      } finally {
        setIsUploading(false);
      }
    },
    [browseMode, currentFolderId, fetchPage],
  );

  const uploadMany = useCallback(
    async (
      inputs: MediaUploadRequest[],
      callbacks?: MediaUploadBatchCallbacks,
    ): Promise<MediaUploadBatchResult> => {
      setIsUploading(true);
      setError(null);

      try {
        const results: MediaUploadBatchResult["items"] = [];

        for (const [index, rawInput] of inputs.entries()) {
          const input = withDefaultFolderId(
            rawInput,
            browseMode,
            currentFolderId,
          );
          callbacks?.onItemStart?.({ index, input });

          try {
            const media = await uploadMediaClient(input);
            const result = {
              ok: true as const,
              input,
              media,
            };

            results.push(result);
            callbacks?.onItemComplete?.({ index, result });
          } catch (error: unknown) {
            const result = {
              ok: false as const,
              input,
              errorMessage:
                error instanceof Error
                  ? error.message
                  : "Erreur lors de l'import du média.",
            };

            results.push(result);
            callbacks?.onItemComplete?.({ index, result });
          }
        }

        const successCount = results.filter((result) => result.ok).length;
        const errorCount = results.length - successCount;

        if (successCount > 0) {
          await fetchPage({ nextPage: 1, reset: true });
        }

        return {
          total: results.length,
          successCount,
          errorCount,
          items: results,
        };
      } finally {
        setIsUploading(false);
      }
    },
    [browseMode, currentFolderId, fetchPage],
  );

  const remove = useCallback(
    async (mediaId: number, options: MediaDeleteOptions = {}) => {
      setDeletingMediaId(mediaId);
      setError(null);

      try {
        await deleteMediaClient(mediaId, options);
        setSelectedMediaIds((current) =>
          current.filter((id) => id !== mediaId),
        );
        setSelectionAnchorKey((current) =>
          current === getMediaSelectionKey(mediaId) ? null : current,
        );
        setOpenedMediaId((current) => (current === mediaId ? null : current));
        await fetchPage({ nextPage: 1, reset: true });
        return true;
      } finally {
        setDeletingMediaId(null);
      }
    },
    [fetchPage],
  );

  const removeSelected = useCallback(
    async (options: MediaDeleteOptions = {}) => {
      if (selectedItems.length === 0 && selectedFolders.length === 0) {
        return 0;
      }

      setIsDeletingSelection(true);
      setError(null);

      try {
        const parentByFolderId = new Map(
          folderOptions.map((option) => [option.id, option.parentId]),
        );
        const selectedFolderIdSet = new Set(
          selectedFolders.map((folder) => folder.id),
        );
        const topLevelSelectedFolders = selectedFolders.filter((folder) => {
          let currentParentId = parentByFolderId.get(folder.id) ?? null;

          while (currentParentId != null) {
            if (selectedFolderIdSet.has(currentParentId)) {
              return false;
            }

            currentParentId = parentByFolderId.get(currentParentId) ?? null;
          }

          return true;
        });

        for (const folder of topLevelSelectedFolders) {
          await deleteMediaFolderClient(folder.id, {
            force:
              options.force === true &&
              (folder.mediaCount > 0 || folder.childFolderCount > 0),
          });
        }

        for (const item of selectedItems) {
          const shouldForceDelete = options.force === true && item.usage.total > 0;

          await deleteMediaClient(
            item.id,
            shouldForceDelete ? { force: true } : {},
          );
        }

        const deletedCount = topLevelSelectedFolders.length + selectedItems.length;
        setSelectedMediaIds([]);
        setSelectedFolderIds([]);
        setSelectionAnchorKey(null);
        setOpenedMediaId(null);
        await fetchPage({ nextPage: 1, reset: true });
        return deletedCount;
      } finally {
        setIsDeletingSelection(false);
      }
    },
    [fetchPage, folderOptions, selectedFolders, selectedItems],
  );

  const moveFolderIdsToFolder = useCallback(
    async (folderIds: readonly number[], folderId: number | null) => {
      const normalizedFolderIds = [...new Set(folderIds)];
      const parentByFolderId = new Map(
        folderOptions.map((option) => [option.id, option.parentId]),
      );
      const topLevelFolderIds = normalizedFolderIds.filter((selectedFolderId) => {
        let currentParentId = parentByFolderId.get(selectedFolderId) ?? null;

        while (currentParentId != null) {
          if (normalizedFolderIds.includes(currentParentId)) {
            return false;
          }

          currentParentId = parentByFolderId.get(currentParentId) ?? null;
        }

        return true;
      });
      const candidates = selectedFolders.filter(
        (folder) =>
          topLevelFolderIds.includes(folder.id) && folder.parentId !== folderId,
      );

      if (candidates.length === 0) {
        return 0;
      }

      if (
        folderId != null &&
        candidates.some((folder) => {
          if (folder.id === folderId) {
            return true;
          }

          let currentParentId = parentByFolderId.get(folderId) ?? null;

          while (currentParentId != null) {
            if (currentParentId === folder.id) {
              return true;
            }

            currentParentId = parentByFolderId.get(currentParentId) ?? null;
          }

          return false;
        })
      ) {
        throw new Error(
          "Impossible de déplacer un dossier dans lui-même ou dans l'un de ses sous-dossiers.",
        );
      }

      for (const folder of candidates) {
        await updateMediaFolderClient(folder.id, { parentId: folderId });
      }

      const movedFolderIdSet = new Set(candidates.map((folder) => folder.id));
      setSelectedFolderIds((current) =>
        current.filter((id) => !movedFolderIdSet.has(id)),
      );
      setSelectionAnchorKey((current) =>
        current != null &&
        current.startsWith("folder:") &&
        movedFolderIdSet.has(Number(current.slice("folder:".length)))
          ? null
          : current,
      );

      await fetchPage({
        nextPage: 1,
        reset: true,
        preserveOpenedMedia: true,
      });

      return candidates.length;
    },
    [fetchPage, folderOptions, selectedFolders],
  );

  const moveMediaIdsToFolder = useCallback(
    async (mediaIds: readonly number[], folderId: number | null) => {
      const idSet = new Set(mediaIds);
      const candidates = items.filter(
        (item) => idSet.has(item.id) && item.folderId !== folderId,
      );

      if (candidates.length === 0) {
        return 0;
      }

      for (const item of candidates) {
        await updateMediaClient(item.id, { folderId });
      }

      const movedOutOfCurrentFolder =
        browseMode === "folders" &&
        candidates.some((item) => item.folderId === currentFolderId && folderId !== currentFolderId);

      setSelectedMediaIds((current) => current.filter((id) => !idSet.has(id)));
      setSelectionAnchorKey((current) =>
        current != null &&
        current.startsWith("media:") &&
        idSet.has(Number(current.slice("media:".length)))
          ? null
          : current,
      );

      if (
        movedOutOfCurrentFolder &&
        openedMediaId != null &&
        idSet.has(openedMediaId)
      ) {
        setOpenedMediaId(null);
      }

      await fetchPage({
        nextPage: 1,
        reset: true,
        preserveOpenedMedia: !movedOutOfCurrentFolder,
      });

      return candidates.length;
    },
    [browseMode, currentFolderId, fetchPage, items, openedMediaId],
  );

  const moveSelectedToFolder = useCallback(
    async (folderId: number | null) => {
      if (selectedItems.length === 0 && selectedFolders.length === 0) {
        return 0;
      }

      setIsMovingSelection(true);
      setError(null);

      try {
        let movedCount = 0;

        if (selectedFolders.length > 0) {
          movedCount += await moveFolderIdsToFolder(
            selectedFolders.map((folder) => folder.id),
            folderId,
          );
        }

        if (selectedItems.length > 0) {
          movedCount += await moveMediaIdsToFolder(
            selectedItems.map((item) => item.id),
            folderId,
          );
        }

        return movedCount;
      } finally {
        setIsMovingSelection(false);
      }
    },
    [moveFolderIdsToFolder, moveMediaIdsToFolder, selectedFolders, selectedItems],
  );

  const updateMedia = useCallback(
    async (mediaId: number, input: MediaUpdateInput) => {
      const updatedMedia = await updateMediaClient(mediaId, input);
      const folderChanged = input.folderId !== undefined;

      if (folderChanged) {
        const movedOutOfCurrentFolder =
          browseMode === "folders" &&
          ((currentFolderId == null && updatedMedia.folderId != null) ||
            (currentFolderId != null && updatedMedia.folderId !== currentFolderId));

        if (movedOutOfCurrentFolder) {
          setOpenedMediaId(null);
        }

        await fetchPage({
          nextPage: 1,
          reset: true,
          preserveOpenedMedia: !movedOutOfCurrentFolder,
        });
        return updatedMedia;
      }

      setItems((current) =>
        current.map((item) => (item.id === mediaId ? updatedMedia : item)),
      );

      return updatedMedia;
    },
    [browseMode, currentFolderId, fetchPage],
  );

  return {
    items,
    visibleItems,
    groups,
    folders,
    currentFolder,
    breadcrumbs,
    folderOptions,
    total,
    stats,
    storage,
    search,
    setSearch,
    browseMode,
    setBrowseMode,
    folderLayout,
    setFolderLayout,
    currentFolderId,
    openFolder,
    openRootFolder,
    activeView,
    setActiveView,
    sortBy,
    setSortBy,
    sortDirection,
    toggleSortDirection,
    selectedCount,
    selectedMediaIds,
    selectedFolderIds,
    selectedItems,
    selectedFolders,
    selectedTotalSize,
    selectionRequiresForceDelete,
    canDeleteSelection,
    isMovingSelection,
    toggleSelected,
    toggleSelectedFolder,
    toggleManySelected,
    toggleManyFoldersSelected,
    selectAllVisible,
    clearSelection,
    selectedMedia,
    openMedia,
    closeMedia,
    openedMediaId,
    hasMore,
    isLoadingInitial,
    isLoadingMore,
    isUploading,
    deletingMediaId,
    isDeletingSelection,
    error,
    createFolder,
    upload,
    uploadMany,
    remove,
    removeSelected,
    moveFolderIdsToFolder,
    moveMediaIdsToFolder,
    moveSelectedToFolder,
    updateMedia,
    refetch: (
      options: {
        preserveOpenedMedia?: boolean;
      } = {},
    ) => fetchPage({ nextPage: 1, reset: true, ...options }),
    sentinelRef,
  };
}
