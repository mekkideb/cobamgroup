"use client";

import type { CSSProperties, ReactNode } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaObjectUrl } from "@/features/media/hooks/use-media-object-url";
import type { MediaFileVariant } from "@/features/media/types";
import Image from "next/image";
import Loading from "@/components/staff/Loading";

type ImagePreviewProps = {
  alt: string;
  mediaId?: number | null;
  src?: string | null;
  variant?: MediaFileVariant;
  className?: string;
  imageClassName?: string;
  fallback?: ReactNode;
  style?: CSSProperties;
};

export default function ImagePreview({
  alt,
  mediaId = null,
  src = null,
  variant = "thumbnail",
  className,
  imageClassName,
  fallback,
  style,
}: ImagePreviewProps) {
  const { objectUrl, isLoading } = useMediaObjectUrl(
    src ? null : mediaId,
    variant,
  );
  const effectiveSrc = src || objectUrl;

  if (effectiveSrc) {
    return (
      <div
        className={cn("overflow-hidden border border-slate-200 bg-slate-50", className)}
        style={style}
      >
        <Image
          draggable={false} 
          width={1280}
          height={960}
          src={effectiveSrc}
          alt={alt}
          className={cn("h-full w-full object-cover", imageClassName)}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 animate-pulse",
          className,
        )}
        style={style}
      >
        <Loading />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden border border-slate-300 bg-slate-50",
        className,
      )}
      style={style}
    >
      {fallback ?? <ImageIcon className="text-slate-300 h-7 w-7" />}
    </div>
  );
}
