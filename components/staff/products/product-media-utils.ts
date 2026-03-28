"use client";

import type { MediaListItemDto } from "@/features/media/types";
import type { ProductMediaDto } from "@/features/products/types";

export function mapMediaListItemToProductMedia(
  media: MediaListItemDto,
): ProductMediaDto {
  return {
    id: media.id,
    kind: media.kind,
    title: media.title,
    originalFilename: media.originalFilename,
    altText: media.altText,
    mimeType: media.mimeType,
    extension: media.extension,
    widthPx: media.widthPx,
    heightPx: media.heightPx,
    sizeBytes: media.sizeBytes,
  };
}
