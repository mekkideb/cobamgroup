"use client";

import type { DragEvent } from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ImageIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Loading from "@/components/staff/Loading";
import { writeDraggedMediaSelection } from "@/components/staff/media/media-dnd";
import MediaFolderBreadcrumbs from "@/components/staff/media/media-folder-breadcrumbs";
import MediaFolderCreateDialog from "@/components/staff/media/media-folder-create-dialog";
import MediaGrid from "@/components/staff/media/media-grid";
import MediaInspectorDialog from "@/components/staff/media/media-inspector-dialog";
import MediaSelectionBar from "@/components/staff/media/media-selection-bar";
import MediaStats from "@/components/staff/media/media-stats";
import MediaToolbar from "@/components/staff/media/media-toolbar";
import MediaUploadDialog from "@/components/staff/media/media-upload-dialog";
import { StaffNotice, StaffPageHeader, StaffStateCard } from "@/components/staff/ui";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { useStaffSessionContext } from "@/features/auth/client/staff-session-provider";
import {
  canAccessMediaLibrary,
  canForceRemoveMedia,
  canUploadMedia,
} from "@/features/media/access";
import { MediaClientError } from "@/features/media/client";
import { useMediaLibrary } from "@/features/media/hooks/use-media-library";
import type {
  MediaDeleteOptions,
  MediaUploadBatchCallbacks,
  MediaUploadBatchResult,
} from "@/features/media/types";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
}

function MediaLibraryPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: authUser, isLoading: isAuthLoading } = useStaffSessionContext();
  const canAccess = authUser ? canAccessMediaLibrary(authUser) : false;
  const canImport = authUser ? canUploadMedia(authUser) : false;
  const canForceDeleteFolders = authUser ? canForceRemoveMedia(authUser) : false;
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const browseModeFromUrl = searchParams.get("browse") === "library"
    ? "library"
    : "folders";
  const folderLayoutFromUrl = searchParams.get("layout") === "list"
    ? "list"
    : "grid";
  const currentFolderIdFromUrl = useMemo(() => {
    const rawFolderId = searchParams.get("folder");

    if (!rawFolderId) {
      return null;
    }

    const parsedFolderId = Number(rawFolderId);
    return Number.isInteger(parsedFolderId) && parsedFolderId > 0
      ? parsedFolderId
      : null;
  }, [searchParams]);

  const updateHistoryState = useCallback(
    (
      update: (params: URLSearchParams) => void,
      historyMode: "push" | "replace" = "push",
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      update(params);

      const nextSearch = params.toString();
      const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
      const currentSearch = searchParams.toString();
      const currentUrl = currentSearch ? `${pathname}?${currentSearch}` : pathname;

      if (nextUrl === currentUrl) {
        return;
      }

      if (historyMode === "replace") {
        router.replace(nextUrl, { scroll: false });
        return;
      }

      router.push(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleBrowseModeChange = useCallback(
    (value: "folders" | "library") => {
      updateHistoryState((params) => {
        if (value === "folders") {
          params.delete("browse");
          return;
        }

        params.set("browse", "library");
      });
    },
    [updateHistoryState],
  );

  const handleFolderLayoutChange = useCallback(
    (value: "grid" | "list") => {
      updateHistoryState(
        (params) => {
          if (value === "grid") {
            params.delete("layout");
            return;
          }

          params.set("layout", "list");
        },
        "replace",
      );
    },
    [updateHistoryState],
  );

  const handleCurrentFolderChange = useCallback(
    (folderId: number | null) => {
      updateHistoryState((params) => {
        params.delete("browse");

        if (folderId == null) {
          params.delete("folder");
          return;
        }

        params.set("folder", String(folderId));
      });
    },
    [updateHistoryState],
  );

  const {
    groups,
    folders,
    currentFolder,
    breadcrumbs,
    folderOptions,
    stats,
    storage,
    search,
    setSearch,
    browseMode,
    setBrowseMode,
    folderLayout,
    setFolderLayout,
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
    uploadMany,
    remove,
    removeSelected,
    moveFolderIdsToFolder,
    moveMediaIdsToFolder,
    moveSelectedToFolder,
    updateMedia,
    sentinelRef,
  } = useMediaLibrary(undefined, {
    browseMode: browseModeFromUrl,
    onBrowseModeChange: handleBrowseModeChange,
    folderLayout: folderLayoutFromUrl,
    onFolderLayoutChange: handleFolderLayoutChange,
    currentFolderId: currentFolderIdFromUrl,
    onCurrentFolderIdChange: handleCurrentFolderChange,
  });
  const selectedFoldersRequireForceDelete = selectedFolders.some(
    (folder) => folder.mediaCount > 0 || folder.childFolderCount > 0,
  );
  const canDeleteFolderSelection =
    selectedFolderIds.length === 0 ||
    (canImport &&
      (!selectedFoldersRequireForceDelete || canForceDeleteFolders));
  const canDeleteMixedSelection =
    canDeleteSelection && canDeleteFolderSelection;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "a") {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      selectAllVisible();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectAllVisible]);

  const handleUploadMany = async (
    inputs: Parameters<typeof uploadMany>[0],
    callbacks?: MediaUploadBatchCallbacks,
  ): Promise<MediaUploadBatchResult> => {
    try {
      const result = await uploadMany(inputs, callbacks);

      if (result.errorCount > 0) {
        toast.error(
          result.successCount > 0
            ? `${result.successCount} fichier(s) importé(s), ${result.errorCount} en erreur.`
            : `${result.errorCount} fichier(s) n'ont pas pu être importés.`,
        );
      } else if (result.successCount > 0) {
        toast.success(
          result.successCount > 1
            ? `${result.successCount} fichiers importés avec succès.`
            : "Média importé avec succès.",
        );
      }

      return result;
    } catch (error: unknown) {
      const message =
        error instanceof MediaClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Erreur lors de l'import du media.";
      toast.error(message);

      return {
        total: inputs.length,
        successCount: 0,
        errorCount: inputs.length,
        items: inputs.map((input) => ({
          ok: false as const,
          input,
          errorMessage: message,
        })),
      };
    }
  };

  const handleDelete = async (
    mediaId: number,
    options: MediaDeleteOptions = {},
  ): Promise<boolean> => {
    try {
      const deleted = await remove(mediaId, options);

      if (deleted) {
        toast.success(
          options.force
            ? "Média déréférencé puis supprimé."
            : "Média supprimé.",
        );
      }

      return deleted;
    } catch (error: unknown) {
      const message =
        error instanceof MediaClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Erreur lors de la suppression du média.";
      toast.error(message);
      return false;
    }
  };

  const handleDeleteSelection = async () => {
    if (selectedCount === 0) {
      return;
    }

    const confirmed = window.confirm(
      selectionRequiresForceDelete
        ? `Forcer la suppression de ${selectedCount} élément(s) sélectionné(s) ? Les dossiers non vides seront d'abord vidés, et les fichiers encore référencés seront déréférencés avant suppression définitive.`
        : `Supprimer ${selectedCount} élément(s) sélectionné(s) ?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const deletedCount = await removeSelected({
        force: selectionRequiresForceDelete,
      });

      toast.success(
        selectionRequiresForceDelete
          ? `${deletedCount} élément(s) déréférencé(s) ou détaché(s), puis supprimé(s).`
          : `${deletedCount} élément(s) supprimé(s).`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof MediaClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Erreur lors de la suppression de la sélection.";
      toast.error(message);
    }
  };

  const handleUpdateVisibility = async (
    mediaId: number,
    input: { visibility?: "PRIVATE" | "PUBLIC"; folderId?: number | null },
  ) => {
    try {
      return await updateMedia(mediaId, input);
    } catch (error: unknown) {
      const message =
        error instanceof MediaClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Erreur lors de la mise à jour du média.";
      toast.error(message);
      throw error;
    }
  };

  const handleCreateFolder = async (name: string) => {
    setIsCreatingFolder(true);

    try {
      const folder = await createFolder({
        name,
        parentId: browseMode === "folders" ? currentFolder?.id ?? null : null,
      });

      setIsFolderDialogOpen(false);
      openFolder(folder.id);
      toast.success("Dossier créé.");
    } catch (error: unknown) {
      const message =
        error instanceof MediaClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Erreur lors de la création du dossier.";
      toast.error(message);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleMoveSelection = async (folderId: number | null) => {
    try {
      const movedCount = await moveSelectedToFolder(folderId);

      if (movedCount > 0) {
        toast.success(
          movedCount > 1
            ? `${movedCount} média(s) déplacé(s).`
            : "Média déplacé.",
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof MediaClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Erreur lors du déplacement de la sélection.";
      toast.error(message);
    }
  };

  const handleDropSelectionToFolder = async (
    folderId: number | null,
    selection: {
      mediaIds: number[];
      folderIds: number[];
    },
  ) => {
    try {
      let movedCount = 0;

      if (selection.folderIds.length > 0) {
        movedCount += await moveFolderIdsToFolder(selection.folderIds, folderId);
      }

      if (selection.mediaIds.length > 0) {
        movedCount += await moveMediaIdsToFolder(selection.mediaIds, folderId);
      }

      if (movedCount > 0) {
        toast.success(
          movedCount > 1
            ? `${movedCount} média(s) déplacé(s).`
            : "Média déplacé.",
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof MediaClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Erreur lors du déplacement de la sélection.";
      toast.error(message);
    }
  };

  const handleDragStartSelection = (
    type: "folder" | "media",
    entityId: number,
    event: DragEvent<HTMLDivElement>,
  ) => {
    const shouldDragCurrentSelection =
      (type === "media" && selectedMediaIds.includes(entityId)) ||
      (type === "folder" && selectedFolderIds.includes(entityId));

    writeDraggedMediaSelection(event, {
      mediaIds: shouldDragCurrentSelection
        ? selectedMediaIds
        : type === "media"
          ? [entityId]
          : [],
      folderIds: shouldDragCurrentSelection
        ? selectedFolderIds
        : type === "folder"
          ? [entityId]
          : [],
    });
  };

  if (isAuthLoading && !authUser) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <StaffStateCard
        variant="forbidden"
        title="Accès refusé"
        description="Vous n'avez pas l'autorisation d'accéder à la médiathèque."
        actionHref="/espace/staff"
        actionLabel="Retour au tableau de bord"
      />
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <StaffPageHeader
        eyebrow="Médias"
        title="Bibliothèque de fichiers"
        icon={ImageIcon}
        actions={
          canImport ? (
            <AnimatedUIButton
              type="button"
              variant="secondary"
              icon="plus"
              iconPosition="left"
              onClick={() => setIsUploadOpen(true)}
            >
              Importer des fichiers
            </AnimatedUIButton>
          ) : (
            <div className="flex h-12 items-center justify-center rounded-2xl border border-dashed border-slate-200 px-4 text-sm text-slate-400">
              Import indisponible
            </div>
          )
        }
      />

      <MediaStats stats={stats} />

      <MediaToolbar
        search={search}
        onSearchChange={setSearch}
        browseMode={browseMode}
        onBrowseModeChange={setBrowseMode}
        folderLayout={folderLayout}
        onFolderLayoutChange={setFolderLayout}
        activeView={activeView}
        onActiveViewChange={setActiveView}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortDirection={sortDirection}
        onToggleSortDirection={toggleSortDirection}
        canCreateFolder={canImport}
        onCreateFolder={() => setIsFolderDialogOpen(true)}
      />

      {browseMode === "folders" ? (
        <MediaFolderBreadcrumbs
          breadcrumbs={breadcrumbs}
          onOpenRoot={openRootFolder}
          onOpenFolder={openFolder}
          onDropSelectionToFolder={handleDropSelectionToFolder}
        />
      ) : null}

      {error ? (
        <StaffNotice variant="error" title="Chargement impossible">
          {error}
        </StaffNotice>
      ) : null}

      {selectedCount > 0 ? (
        <MediaSelectionBar
          count={selectedCount}
          mediaCount={selectedMediaIds.length}
          folderCount={selectedFolderIds.length}
          totalSize={selectedTotalSize}
          folderOptions={folderOptions}
          isMoving={isMovingSelection}
          canDelete={canDeleteMixedSelection}
          isForceDeleteMode={selectionRequiresForceDelete}
          isDeleting={isDeletingSelection}
          onMove={(folderId) => void handleMoveSelection(folderId)}
          onClear={clearSelection}
          onDelete={() => void handleDeleteSelection()}
        />
      ) : null}

      <MediaGrid
        folderLayout={folderLayout}
        folders={folders}
        showFolders={browseMode === "folders"}
        groups={groups}
        selectedMediaIds={selectedMediaIds}
        selectedFolderIds={selectedFolderIds}
        onToggleSelected={toggleSelected}
        onToggleSelectedFolder={toggleSelectedFolder}
        onToggleGroupSelected={toggleManySelected}
        onToggleFoldersSelected={toggleManyFoldersSelected}
        onOpenFolder={openFolder}
        onDropSelectionToFolder={handleDropSelectionToFolder}
        onDragStartFolder={(folderId, event) =>
          handleDragStartSelection("folder", folderId, event)
        }
        onDragStartMedia={(mediaId, event) =>
          handleDragStartSelection("media", mediaId, event)
        }
        onOpen={openMedia}
        isLoadingInitial={isLoadingInitial}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        sentinelRef={sentinelRef}
      />

      <MediaUploadDialog
        key={`upload-${isUploadOpen ? "open" : "closed"}-${browseMode}-${currentFolder?.id ?? "root"}`}
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        isUploading={isUploading}
        storage={storage}
        folderOptions={folderOptions}
        initialFolderId={browseMode === "folders" ? currentFolder?.id ?? null : null}
        onUploadMany={handleUploadMany}
      />

      <MediaFolderCreateDialog
        key={`folder-create-${isFolderDialogOpen ? "open" : "closed"}-${currentFolder?.id ?? "root"}`}
        open={isFolderDialogOpen}
        onOpenChange={setIsFolderDialogOpen}
        parentLabel={currentFolder?.name ?? "la racine"}
        isCreating={isCreatingFolder}
        onCreate={handleCreateFolder}
      />

      <MediaInspectorDialog
        media={selectedMedia}
        folderOptions={folderOptions}
        open={openedMediaId != null}
        onOpenChange={(open) => {
          if (!open) {
            closeMedia();
          }
        }}
        isDeleting={deletingMediaId === selectedMedia?.id}
        onDelete={handleDelete}
        onUpdateMedia={handleUpdateVisibility}
      />
    </div>
  );
}

export default function MediaLibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loading />
        </div>
      }
    >
      <MediaLibraryPageContent />
    </Suspense>
  );
}
