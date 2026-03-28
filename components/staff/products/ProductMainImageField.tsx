"use client";

import { toast } from "sonner";
import MediaImageField from "@/components/staff/media/importers/media-image-field";
import { getMediaByIdClient, MediaClientError } from "@/features/media/client";
import type { ProductMediaDto } from "@/features/products/types";
import { mapMediaListItemToProductMedia } from "./product-media-utils";

export default function ProductMainImageField({
  value,
  onChange,
}: {
  value: ProductMediaDto | null;
  onChange: (media: ProductMediaDto | null) => void;
}) {
  return (
    <MediaImageField
      label="Image principale"
      description="Cette image représente toute la famille produit. Elle est optionnelle."
      mediaId={value?.id ?? null}
      onChange={(mediaId) => {
        if (mediaId == null) {
          onChange(null);
          return;
        }

        void getMediaByIdClient(mediaId)
          .then((media) => {
            onChange(mapMediaListItemToProductMedia(media));
          })
          .catch((error: unknown) => {
            const message =
              error instanceof MediaClientError || error instanceof Error
                ? error.message
                : "Impossible de charger ce média.";
            toast.error(message);
          });
      }}
      aspectRatio="4:3"
      requireAspectRatio={false}
    />
  );
}
