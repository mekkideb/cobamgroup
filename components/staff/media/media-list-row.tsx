"use client";

import { useRef } from "react";
import type { DragEvent, MouseEvent } from "react";
import { CheckSquare2, Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import StaffBadge from "@/components/staff/ui/StaffBadge";
import type { MediaListItemDto } from "@/features/media/types";
import MediaKindBadge from "./media-kind-badge";
import MediaThumbnail from "./media-thumbnail";
import MediaVisibilityBadge from "./media-visibility-badge";
import {
  formatBytes,
  formatMediaDate,
  getMediaDisplayTitle,
  getMediaViewForItem,
} from "./utils";

function getTypeLabel(item: MediaListItemDto) {
  const view = getMediaViewForItem(item);

  switch (view) {
    case "pdf":
      return "PDF";
    case "audio":
      return "Audio";
    case "other":
      return "Autre";
    default:
      return item.mimeType || "Fichier";
  }
}

export default function MediaListRow({
  item,
  isSelected,
  onToggleSelected,
  onOpen,
  onDragStart,
}: {
  item: MediaListItemDto;
  isSelected: boolean;
  onToggleSelected: (
    mediaId: number,
    checked: boolean,
    options?: { shiftKey?: boolean },
  ) => void;
  onOpen: (mediaId: number) => void;
  onDragStart: (mediaId: number, event: DragEvent<HTMLDivElement>) => void;
}) {
  const pendingShiftRef = useRef(false);

  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(item.id, event)}
      className={
        isSelected
          ? "grid grid-cols-[auto_minmax(0,1.6fr)_minmax(0,0.8fr)_auto_auto] items-center gap-4 rounded-2xl border border-cobam-water-blue/35 bg-cobam-water-blue/5 px-4 py-3"
          : "grid grid-cols-[auto_minmax(0,1.6fr)_minmax(0,0.8fr)_auto_auto] items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-cobam-water-blue/25 hover:bg-slate-50"
      }
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isSelected}
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            pendingShiftRef.current = event.shiftKey;
          }}
          onCheckedChange={(checked) => {
            onToggleSelected(item.id, checked === true, {
              shiftKey: pendingShiftRef.current,
            });
            pendingShiftRef.current = false;
          }}
          aria-label={`Selectionner ${getMediaDisplayTitle(item)}`}
        />
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
          <CheckSquare2 className="h-3.5 w-3.5" />
          Selection
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpen(item.id)}
        className="flex min-w-0 items-center gap-4 text-left"
      >
        <MediaThumbnail media={item} className="h-14 w-20 flex-shrink-0 rounded-2xl" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-cobam-dark-blue">
            {getMediaDisplayTitle(item)}
          </p>
          <p className="truncate text-xs text-slate-400">
            {item.originalFilename || item.storagePath}
          </p>
        </div>
      </button>

      <div className="flex flex-wrap gap-2">
        <MediaKindBadge kind={item.kind} />
        <MediaVisibilityBadge visibility={item.visibility} />
        <StaffBadge size="md" color="default">
          {getTypeLabel(item)}
        </StaffBadge>
        <StaffBadge size="md" color={item.isActive ? "green" : "default"}>
          {item.isActive ? "Actif" : "Inactif"}
        </StaffBadge>
      </div>

      <div className="text-right text-xs text-slate-500">
        <p>{formatBytes(item.sizeBytes)}</p>
        <p>{formatMediaDate(item.createdAt)}</p>
      </div>

      <div className="inline-flex items-center justify-end gap-1 text-xs text-slate-500">
        <Package className="h-3.5 w-3.5" />
        {item.usage.total}
      </div>
    </div>
  );
}
