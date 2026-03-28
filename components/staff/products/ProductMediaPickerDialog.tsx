"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, File, FileText, Upload, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SearchInput from "@/components/staff/ui/SearchInput";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import MediaThumbnail from "@/components/staff/media/media-thumbnail";
import { formatBytes, getMediaDisplayTitle } from "@/components/staff/media/utils";
import {
  listMediaClient,
  uploadMediaClient,
} from "@/features/media/client";
import type { MediaListItemDto } from "@/features/media/types";
import type { ProductMediaDto } from "@/features/products/types";
import { cn } from "@/lib/utils";
import { mapMediaListItemToProductMedia } from "./product-media-utils";

type PickerTab = "library" | "upload";
const PAGE_SIZE = 18;

function MediaKindIcon({
  kind,
}: {
  kind: ProductMediaDto["kind"] | MediaListItemDto["kind"];
}) {
  if (kind === "VIDEO") {
    return <Video className="h-8 w-8" />;
  }

  if (kind === "DOCUMENT") {
    return <FileText className="h-8 w-8" />;
  }

  return <File className="h-8 w-8" />;
}

function UploadPreview({
  file,
  previewUrl,
}: {
  file: File | null;
  previewUrl: string | null;
}) {
  if (!file) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        Choisissez un fichier pour voir son apercu.
      </div>
    );
  }

  if (file.type.startsWith("image/") && previewUrl) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
        <Image
          src={previewUrl}
          alt={file.name}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 text-slate-500">
      <MediaKindIcon
        kind={file.type.startsWith("video/") ? "VIDEO" : "DOCUMENT"}
      />
      <p className="max-w-[18rem] truncate text-sm font-medium text-cobam-dark-blue">
        {file.name}
      </p>
      <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
    </div>
  );
}

function LibraryMediaCard({
  item,
  selected,
  blocked,
  onSelect,
}: {
  item: MediaListItemDto;
  selected: boolean;
  blocked: boolean;
  onSelect: (item: MediaListItemDto) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      disabled={blocked}
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl border bg-white text-left transition",
        selected
          ? "border-cobam-water-blue shadow-sm"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
        blocked ? "cursor-not-allowed opacity-45 hover:border-slate-200 hover:shadow-none" : "",
      )}
    >
      <MediaThumbnail media={item} className="aspect-square rounded-none" />
      <div className="space-y-1 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-semibold text-cobam-dark-blue">
            {getMediaDisplayTitle(item)}
          </p>
          {selected ? (
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cobam-water-blue text-white">
              <Check className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-slate-500">
          {item.originalFilename || `Media #${item.id}`}
        </p>
      </div>
    </button>
  );
}

export default function ProductMediaPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  excludedMediaIds = [],
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  excludedMediaIds?: number[];
  onSelect: (media: ProductMediaDto) => void;
}) {
  const [activeTab, setActiveTab] = useState<PickerTab>("library");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [items, setItems] = useState<MediaListItemDto[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaListItemDto | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!uploadFile) {
      setUploadPreviewUrl(null);
      return;
    }

    if (!uploadFile.type.startsWith("image/")) {
      setUploadPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(uploadFile);
    setUploadPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [uploadFile]);

  const loadMedia = useCallback(
    async (nextPage: number, reset: boolean) => {
      if (!open) {
        return;
      }

      setError(null);
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const result = await listMediaClient({
          page: nextPage,
          pageSize: PAGE_SIZE,
          q: deferredSearch,
          sortBy: "date",
          sortDirection: "desc",
        });

        setItems((current) => (reset ? result.items : [...current, ...result.items]));
        setPage(nextPage);
        setHasMore(nextPage * PAGE_SIZE < result.total);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des medias.",
        );
      } finally {
        if (reset) {
          setIsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [deferredSearch, open],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedMedia(null);
    void loadMedia(1, true);
  }, [loadMedia, open]);

  const excludedSet = useMemo(() => new Set(excludedMediaIds), [excludedMediaIds]);

  const handleClose = () => {
    if (isUploading) {
      return;
    }

    setActiveTab("library");
    setSearch("");
    setUploadFile(null);
    setUploadPreviewUrl(null);
    setSelectedMedia(null);
    setError(null);
    onOpenChange(false);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const media = await uploadMediaClient({
        file: uploadFile,
      });

      onSelect(mapMediaListItemToProductMedia(media));
      handleClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de l'import du media.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : handleClose())}>
      <DialogContent className="flex h-[82vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="text-base font-semibold text-cobam-dark-blue">
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-6 text-slate-500">
            {description}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as PickerTab)}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6"
        >
          <TabsList variant="line" className="justify-start gap-2 rounded-none p-0">
            <TabsTrigger
              value="library"
              className={cn(
                "min-w-28 px-3 py-2",
                activeTab === "library"
                  ? "border-slate-300 font-semibold text-cobam-dark-blue shadow-sm"
                  : "",
              )}
            >
              Bibliotheque
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className={cn(
                "min-w-28 px-3 py-2",
                activeTab === "upload"
                  ? "border-slate-300 font-semibold text-cobam-dark-blue shadow-sm"
                  : "",
              )}
            >
              Importer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-0 space-y-5">
            <SearchInput
              value={search}
              onChange={(value: string) => setSearch(value)}
              fullWidth
              placeholder="Rechercher un media..."
            />

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-square animate-pulse rounded-3xl border border-slate-200 bg-slate-100"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                Aucun media disponible pour le moment.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <LibraryMediaCard
                      key={item.id}
                      item={item}
                      selected={selectedMedia?.id === item.id}
                      blocked={excludedSet.has(item.id)}
                      onSelect={setSelectedMedia}
                    />
                  ))}
                </div>

                {hasMore ? (
                  <div className="flex justify-center">
                    <AnimatedUIButton
                      type="button"
                      variant="light"
                      onClick={() => void loadMedia(page + 1, false)}
                      loading={isLoadingMore}
                      loadingText="Chargement..."
                      disabled={isLoadingMore}
                    >
                      Charger plus
                    </AnimatedUIButton>
                  </div>
                ) : null}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="mt-0 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-cobam-dark-blue">
                <Upload className="h-4 w-4" />
                Ajouter un nouveau media
              </div>
              <Input
                type="file"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-sm leading-6 text-slate-500">
                Vous pouvez importer une image, une video ou un document puis l&apos;ajouter
                directement a cette variante.
              </p>
            </div>

            <div className="space-y-4">
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
              <UploadPreview file={uploadFile} previewUrl={uploadPreviewUrl} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-slate-200 px-6 py-4">
          <AnimatedUIButton
            type="button"
            variant="light"
            onClick={handleClose}
            disabled={isUploading}
          >
            Annuler
          </AnimatedUIButton>

          {activeTab === "library" ? (
            <AnimatedUIButton
              type="button"
              variant="primary"
              icon="plus"
              iconPosition="left"
              onClick={() => {
                if (!selectedMedia) {
                  return;
                }

                onSelect(mapMediaListItemToProductMedia(selectedMedia));
                handleClose();
              }}
              disabled={!selectedMedia}
            >
              Ajouter ce media
            </AnimatedUIButton>
          ) : (
            <AnimatedUIButton
              type="button"
              variant="primary"
              icon="upload"
              iconPosition="left"
              onClick={() => void handleUpload()}
              disabled={!uploadFile || isUploading}
              loading={isUploading}
              loadingText="Import..."
            >
              Importer et ajouter
            </AnimatedUIButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
