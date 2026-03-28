"use client";

import { useRef, useState } from "react";
import type { DragEvent, MouseEvent } from "react";
import { Folder, FolderTree } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import StaffBadge from "@/components/staff/ui/StaffBadge";
import type { MediaFolderListItemDto } from "@/features/media/types";
import {
  readDraggedMediaSelection,
  type DraggedMediaSelection,
} from "./media-dnd";

export default function MediaFolderListRow({
  folder,
  isSelected,
  onToggleSelected,
  onOpen,
  onDropSelection,
  onDragStart,
}: {
  folder: MediaFolderListItemDto;
  isSelected: boolean;
  onToggleSelected: (
    folderId: number,
    checked: boolean,
    options?: { shiftKey?: boolean },
  ) => void;
  onOpen: (folderId: number) => void;
  onDropSelection: (
    folderId: number,
    selection: DraggedMediaSelection,
  ) => void;
  onDragStart: (folderId: number, event: DragEvent<HTMLDivElement>) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const pendingShiftRef = useRef(false);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    const selection = readDraggedMediaSelection(event);

    if (selection.mediaIds.length === 0 && selection.folderIds.length === 0) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const selection = readDraggedMediaSelection(event);
    setIsDragOver(false);

    if (selection.mediaIds.length === 0 && selection.folderIds.length === 0) {
      return;
    }

    event.preventDefault();
    onDropSelection(folder.id, selection);
  };

  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(folder.id, event)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={
        isDragOver
          ? "grid grid-cols-[minmax(0,1.8fr)_auto_auto] items-center gap-4 rounded-2xl border border-cobam-water-blue bg-cobam-water-blue/5 px-4 py-3 ring-2 ring-cobam-water-blue/20"
          : isSelected
            ? "grid grid-cols-[minmax(0,1.8fr)_auto_auto] items-center gap-4 rounded-2xl border border-cobam-water-blue/35 bg-cobam-water-blue/5 px-4 py-3"
          : "grid grid-cols-[minmax(0,1.8fr)_auto_auto] items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-cobam-water-blue/25 hover:bg-slate-50"
      }
    >
      <div className="flex min-w-0 items-center gap-4">
        <Checkbox
          checked={isSelected}
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            pendingShiftRef.current = event.shiftKey;
          }}
          onCheckedChange={(checked) => {
            onToggleSelected(folder.id, checked === true, {
              shiftKey: pendingShiftRef.current,
            });
            pendingShiftRef.current = false;
          }}
          aria-label={`Selectionner le dossier ${folder.name}`}
        />

        <button
          type="button"
          onClick={() => onOpen(folder.id)}
          className="flex min-w-0 items-center gap-4 text-left"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cobam-water-blue/10 text-cobam-water-blue">
            <Folder className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-cobam-dark-blue">
              {folder.name}
            </p>
            <p className="truncate text-xs text-slate-400">
              {folder.mediaCount} media
            </p>
          </div>
        </button>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <StaffBadge size="md" color="default">
          {folder.mediaCount} media
        </StaffBadge>
        <StaffBadge size="md" color="default">
          {folder.childFolderCount} dossier(s)
        </StaffBadge>
      </div>

      <div className="inline-flex items-center justify-end gap-1 text-xs text-slate-500">
        <FolderTree className="h-3.5 w-3.5" />
        {folder.childFolderCount}
      </div>
    </div>
  );
}
