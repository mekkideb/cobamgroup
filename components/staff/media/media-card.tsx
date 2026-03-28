"use client";

import { useRef } from "react";
import type { DragEvent, MouseEvent } from "react";
import { CheckSquare2, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StaffBadge } from "@/components/staff/ui";
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

export default function MediaCard({
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
    <Card
      draggable
      onDragStart={(event) => onDragStart(item.id, event)}
      className={
        isSelected
          ? "overflow-hidden rounded-3xl border border-cobam-water-blue/40 bg-cobam-water-blue/5 shadow-sm"
          : "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-cobam-water-blue/30 hover:shadow-md"
      }
    >
      <CardContent className="space-y-4 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
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
          <MediaKindBadge kind={item.kind} />
        </div>

        <button
          type="button"
          onClick={() => onOpen(item.id)}
          className="block w-full text-left"
        >
          <MediaThumbnail media={item} className="aspect-[4/3] w-full" />
        </button>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            className="block text-left"
          >
            <p className="line-clamp-2 text-base font-semibold text-cobam-dark-blue">
              {getMediaDisplayTitle(item)}
            </p>
            <p className="line-clamp-1 text-xs text-slate-400">
              {item.originalFilename || item.storagePath}
            </p>
          </button>

          {item.description ? (
            <p className="line-clamp-2 text-sm leading-6 text-slate-500">
              {item.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StaffBadge size="md" color="default">
            {formatBytes(item.sizeBytes)}
          </StaffBadge>
          <StaffBadge size="md" color="default">
            {getTypeLabel(item)}
          </StaffBadge>
          <MediaVisibilityBadge visibility={item.visibility} />
          <StaffBadge size="md" color={item.isActive ? "green" : "default"}>
            {item.isActive ? "Actif" : "Inactif"}
          </StaffBadge>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{formatMediaDate(item.createdAt)}</span>
          <span className="inline-flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {item.usage.total}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
