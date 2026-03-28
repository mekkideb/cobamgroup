"use client";

import { useState } from "react";
import type { DragEvent } from "react";
import { ChevronRight, Home } from "lucide-react";
import type { MediaFolderBreadcrumbDto } from "@/features/media/types";
import {
  readDraggedMediaSelection,
  type DraggedMediaSelection,
} from "./media-dnd";

export default function MediaFolderBreadcrumbs({
  breadcrumbs,
  onOpenRoot,
  onOpenFolder,
  onDropSelectionToFolder,
}: {
  breadcrumbs: MediaFolderBreadcrumbDto[];
  onOpenRoot: () => void;
  onOpenFolder: (folderId: number) => void;
  onDropSelectionToFolder: (
    folderId: number | null,
    selection: DraggedMediaSelection,
  ) => void;
}) {
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const handleDragOver = (
    event: DragEvent<HTMLButtonElement>,
    target: string,
  ) => {
    const selection = readDraggedMediaSelection(event);

    if (selection.mediaIds.length === 0 && selection.folderIds.length === 0) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverTarget(target);
  };

  const handleDrop = (
    event: DragEvent<HTMLButtonElement>,
    folderId: number | null,
    target: string,
  ) => {
    const selection = readDraggedMediaSelection(event);
    setDragOverTarget((current) => (current === target ? null : current));

    if (selection.mediaIds.length === 0 && selection.folderIds.length === 0) {
      return;
    }

    event.preventDefault();
    onDropSelectionToFolder(folderId, selection);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[1.75rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <button
        type="button"
        onClick={onOpenRoot}
        onDragOver={(event) => handleDragOver(event, "root")}
        onDragLeave={() =>
          setDragOverTarget((current) => (current === "root" ? null : current))
        }
        onDrop={(event) => handleDrop(event, null, "root")}
        className={
          dragOverTarget === "root"
            ? "inline-flex items-center gap-2 rounded-full bg-cobam-water-blue/10 px-2 py-1 text-sm font-medium text-cobam-dark-blue ring-1 ring-cobam-water-blue/30"
            : "inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-cobam-dark-blue"
        }
      >
        <Home className="h-4 w-4" />
        Racine
      </button>

      {breadcrumbs.map((crumb) => (
        <div key={crumb.id} className="inline-flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <button
            type="button"
            onClick={() => onOpenFolder(crumb.id)}
            onDragOver={(event) => handleDragOver(event, `crumb-${crumb.id}`)}
            onDragLeave={() =>
              setDragOverTarget((current) =>
                current === `crumb-${crumb.id}` ? null : current,
              )
            }
            onDrop={(event) =>
              handleDrop(event, crumb.id, `crumb-${crumb.id}`)
            }
            className={
              dragOverTarget === `crumb-${crumb.id}`
                ? "rounded-full bg-cobam-water-blue/10 px-2 py-1 text-sm font-medium text-cobam-dark-blue ring-1 ring-cobam-water-blue/30"
                : "rounded-full px-2 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-cobam-dark-blue"
            }
          >
            {crumb.name}
          </button>
        </div>
      ))}
    </div>
  );
}
