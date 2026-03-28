"use client";

import type { DragEvent } from "react";

const DRAGGED_MEDIA_SELECTION_MIME = "application/x-cobam-media-selection";

export type DraggedMediaSelection = {
  mediaIds: number[];
  folderIds: number[];
};

function normalizeIds(ids: readonly number[]) {
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
}

export function writeDraggedMediaSelection(
  event: DragEvent,
  selection: {
    mediaIds?: readonly number[];
    folderIds?: readonly number[];
  },
) {
  const payload: DraggedMediaSelection = {
    mediaIds: normalizeIds(selection.mediaIds ?? []),
    folderIds: normalizeIds(selection.folderIds ?? []),
  };

  if (payload.mediaIds.length === 0 && payload.folderIds.length === 0) {
    return;
  }

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(
    DRAGGED_MEDIA_SELECTION_MIME,
    JSON.stringify(payload),
  );
  event.dataTransfer.setData(
    "text/plain",
    JSON.stringify({
      mediaIds: payload.mediaIds,
      folderIds: payload.folderIds,
    }),
  );
}

export function readDraggedMediaSelection(
  event: DragEvent,
): DraggedMediaSelection {
  const raw =
    event.dataTransfer.getData(DRAGGED_MEDIA_SELECTION_MIME) ||
    event.dataTransfer.getData("text/plain");

  if (!raw) {
    return {
      mediaIds: [],
      folderIds: [],
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DraggedMediaSelection>;

    return {
      mediaIds: normalizeIds(Array.isArray(parsed.mediaIds) ? parsed.mediaIds : []),
      folderIds: normalizeIds(
        Array.isArray(parsed.folderIds) ? parsed.folderIds : [],
      ),
    };
  } catch {
    return {
      mediaIds: [],
      folderIds: [],
    };
  }
}
