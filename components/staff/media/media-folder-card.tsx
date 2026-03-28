"use client";

import { useRef, useState } from "react";
import type { DragEvent, MouseEvent } from "react";
import { CheckSquare2, Folder } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { MediaFolderListItemDto } from "@/features/media/types";
import StaffBadge from "@/components/staff/ui/StaffBadge";
import {
  readDraggedMediaSelection,
  type DraggedMediaSelection,
} from "./media-dnd";

export default function MediaFolderCard({
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
    <Card
      draggable
      onDragStart={(event) => onDragStart(folder.id, event)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={
        isDragOver
          ? "overflow-hidden rounded-3xl border border-cobam-water-blue bg-cobam-water-blue/5 shadow-md ring-2 ring-cobam-water-blue/20"
          : isSelected
            ? "overflow-hidden rounded-3xl border border-cobam-water-blue/40 bg-cobam-water-blue/5 shadow-sm"
          : "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-cobam-water-blue/30 hover:shadow-md"
      }
    >
      <CardContent className="px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
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
              <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                <CheckSquare2 className="h-3.5 w-3.5" />
                Selection
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpen(folder.id)}
            className="flex w-full flex-col gap-4 text-left"
          >
            <div className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cobam-water-blue/10 text-cobam-water-blue">
              <Folder className="h-6 w-6" />
            </div>
            <h2 className="line-clamp-2 text-base font-semibold text-cobam-dark-blue">
              {folder.name}
            </h2>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex items-center gap-1">
              <StaffBadge icon="folder" size="sm" color="default">
                {folder.childFolderCount}
              </StaffBadge>
              <StaffBadge icon="file" size="sm" color="default">
                {folder.mediaCount}
              </StaffBadge>
            </div>
          </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
