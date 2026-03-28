"use client";

import { Fragment, type DragEvent, type RefObject } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  MediaFolderLayout,
  MediaFolderListItemDto,
  MediaListItemDto,
} from "@/features/media/types";
import type { DraggedMediaSelection } from "./media-dnd";
import MediaCard from "./media-card";
import MediaFolderCard from "./media-folder-card";
import MediaFolderListRow from "./media-folder-list-row";
import MediaGridSkeleton from "./media-grid-skeleton";
import MediaListRow from "./media-list-row";

type MediaGroup = {
  key: string;
  label: string;
  items: MediaListItemDto[];
};

function MediaGroupHeader({
  label,
  itemCount,
  itemIds,
  selectedIds,
  onToggleGroupSelected,
}: {
  label: string;
  itemCount: number;
  itemIds: number[];
  selectedIds: Set<number>;
  onToggleGroupSelected: (mediaIds: number[], checked: boolean) => void;
}) {
  const selectedCount = itemIds.filter((id) => selectedIds.has(id)).length;
  const checked =
    selectedCount === 0
      ? false
      : selectedCount === itemIds.length
        ? true
        : "indeterminate";

  return (
    <div className="col-span-full flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={(nextChecked) =>
            onToggleGroupSelected(itemIds, nextChecked === true)
          }
          aria-label={`Selectionner ${label}`}
        />
        <div>
          <p className="text-sm font-semibold text-cobam-dark-blue">{label}</p>
          <p className="text-xs text-slate-500">{itemCount} fichier(s)</p>
        </div>
      </div>
    </div>
  );
}

function MediaFolderSectionHeader({
  folders,
  selectedFolderIds,
  onToggleFoldersSelected,
}: {
  folders: MediaFolderListItemDto[];
  selectedFolderIds: Set<number>;
  onToggleFoldersSelected: (folderIds: number[], checked: boolean) => void;
}) {
  const folderIds = folders.map((folder) => folder.id);
  const selectedCount = folderIds.filter((id) => selectedFolderIds.has(id)).length;
  const checked =
    selectedCount === 0
      ? false
      : selectedCount === folderIds.length
        ? true
        : "indeterminate";

  return (
    <div className="col-span-full flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={(nextChecked) =>
            onToggleFoldersSelected(folderIds, nextChecked === true)
          }
          aria-label="Selectionner tous les dossiers visibles"
        />
        <div>
          <p className="text-sm font-semibold text-cobam-dark-blue">Dossiers</p>
          <p className="text-xs text-slate-500">
            {folders.length} dossier{folders.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MediaGrid({
  folderLayout,
  folders,
  showFolders,
  groups,
  selectedMediaIds,
  selectedFolderIds,
  onToggleSelected,
  onToggleSelectedFolder,
  onToggleGroupSelected,
  onToggleFoldersSelected,
  onOpenFolder,
  onDropSelectionToFolder,
  onDragStartFolder,
  onDragStartMedia,
  onOpen,
  isLoadingInitial,
  isLoadingMore,
  hasMore,
  sentinelRef,
}: {
  folderLayout: MediaFolderLayout;
  folders: MediaFolderListItemDto[];
  showFolders: boolean;
  groups: MediaGroup[];
  selectedMediaIds: number[];
  selectedFolderIds: number[];
  onToggleSelected: (
    mediaId: number,
    checked: boolean,
    options?: { shiftKey?: boolean },
  ) => void;
  onToggleSelectedFolder: (
    folderId: number,
    checked: boolean,
    options?: { shiftKey?: boolean },
  ) => void;
  onToggleGroupSelected: (mediaIds: number[], checked: boolean) => void;
  onToggleFoldersSelected: (folderIds: number[], checked: boolean) => void;
  onOpenFolder: (folderId: number) => void;
  onDropSelectionToFolder: (
    folderId: number,
    selection: DraggedMediaSelection,
  ) => void;
  onDragStartFolder: (
    folderId: number,
    event: DragEvent<HTMLDivElement>,
  ) => void;
  onDragStartMedia: (
    mediaId: number,
    event: DragEvent<HTMLDivElement>,
  ) => void;
  onOpen: (mediaId: number) => void;
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
}) {
  const selectedMediaSet = new Set(selectedMediaIds);
  const selectedFolderSet = new Set(selectedFolderIds);
  const hasContent = groups.length > 0 || (showFolders && folders.length > 0);

  if (isLoadingInitial) {
    return (
      <div className="overflow-hidden px-4 py-5 md:px-6 md:py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <MediaGridSkeleton count={4} />
        </div>
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="overflow-hidden px-4 py-5 md:px-6 md:py-6">
        <div className="flex h-full flex-col place-items-center gap-4 text-center text-sm text-slate-500">
          <ImageOff className="h-10 w-10 text-slate-300" />
          <p>
            {showFolders
              ? "Aucun dossier ni media correspondant."
              : "Aucun media correspondant."}
          </p>
        </div>
      </div>
    );
  }

  if (folderLayout === "list" && showFolders) {
    return (
      <div className="overflow-hidden px-4 py-5 md:px-6 md:py-6">
        <div className="space-y-3">
          {folders.length > 0 ? (
            <>
              <MediaFolderSectionHeader
                folders={folders}
                selectedFolderIds={selectedFolderSet}
                onToggleFoldersSelected={onToggleFoldersSelected}
              />

              {folders.map((folder) => (
                <MediaFolderListRow
                  key={folder.id}
                  folder={folder}
                  isSelected={selectedFolderSet.has(folder.id)}
                  onToggleSelected={onToggleSelectedFolder}
                  onOpen={onOpenFolder}
                  onDropSelection={onDropSelectionToFolder}
                  onDragStart={onDragStartFolder}
                />
              ))}
            </>
          ) : null}

          {groups.map((group) => (
            <Fragment key={group.key}>
              <MediaGroupHeader
                label={group.label}
                itemCount={group.items.length}
                itemIds={group.items.map((item) => item.id)}
                selectedIds={selectedMediaSet}
                onToggleGroupSelected={onToggleGroupSelected}
              />

              {group.items.map((item) => (
                <MediaListRow
                  key={item.id}
                  item={item}
                  isSelected={selectedMediaSet.has(item.id)}
                  onToggleSelected={onToggleSelected}
                  onOpen={onOpen}
                  onDragStart={onDragStartMedia}
                />
              ))}
            </Fragment>
          ))}

          <div className="flex min-h-14 items-center justify-center">
            {isLoadingMore ? (
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement de nouveaux fichiers...
              </div>
            ) : hasMore ? (
              <div ref={sentinelRef} className="h-2 w-full" />
            ) : groups.length > 0 ? (
              <p className="text-xs text-slate-400">
                Tous les fichiers charges pour cette vue.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden px-4 py-5 md:px-6 md:py-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {showFolders && folders.length > 0 ? (
          <>
            <MediaFolderSectionHeader
              folders={folders}
              selectedFolderIds={selectedFolderSet}
              onToggleFoldersSelected={onToggleFoldersSelected}
            />

            {folders.map((folder) => (
              <MediaFolderCard
                key={folder.id}
                folder={folder}
                isSelected={selectedFolderSet.has(folder.id)}
                onToggleSelected={onToggleSelectedFolder}
                onOpen={onOpenFolder}
                onDropSelection={onDropSelectionToFolder}
                onDragStart={onDragStartFolder}
              />
            ))}
          </>
        ) : null}

        {groups.map((group) => (
          <Fragment key={group.key}>
            <MediaGroupHeader
              label={group.label}
              itemCount={group.items.length}
              itemIds={group.items.map((item) => item.id)}
              selectedIds={selectedMediaSet}
              onToggleGroupSelected={onToggleGroupSelected}
            />

            {group.items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                isSelected={selectedMediaSet.has(item.id)}
                onToggleSelected={onToggleSelected}
                onOpen={onOpen}
                onDragStart={onDragStartMedia}
              />
            ))}
          </Fragment>
        ))}

        {isLoadingMore ? <MediaGridSkeleton count={8} /> : null}
      </div>

      <div className="flex min-h-14 items-center justify-center">
        {isLoadingMore ? (
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement de nouveaux fichiers...
          </div>
        ) : hasMore ? (
          <div ref={sentinelRef} className="h-2 w-full" />
        ) : groups.length > 0 ? (
          <p className="text-xs text-slate-400">
            Tous les fichiers charges pour cette vue.
          </p>
        ) : null}
      </div>
    </div>
  );
}
