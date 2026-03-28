"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AlertCircle, File, Headphones, Package } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StaffBadge, StaffSearchSelect, StaffSelect } from "@/components/staff/ui";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { fetchMediaBlobClient } from "@/features/media/client";
import type {
  MediaDeleteOptions,
  MediaListItemDto,
  MediaListResult,
  MediaUpdateInput,
} from "@/features/media/types";
import DynamicSuppressionButton from "./dynamic-suppression-button";
import MediaKindBadge from "./media-kind-badge";
import MediaVisibilityBadge from "./media-visibility-badge";
import {
  formatBytes,
  formatMediaDateTime,
  getMediaDisplayTitle,
  getMediaViewForItem,
} from "./utils";

function MediaInspectorPreview({
  media,
}: {
  media: MediaListItemDto;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let nextUrl: string | null = null;

    void fetchMediaBlobClient(media.id)
      .then((blob) => {
        nextUrl = URL.createObjectURL(blob);
        if (isMounted) {
          setObjectUrl(nextUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setObjectUrl(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (nextUrl) {
        URL.revokeObjectURL(nextUrl);
      }
    };
  }, [media.id]);

  if (isLoading) {
    return <div className="aspect-[16/10] animate-pulse rounded-[2rem] bg-slate-200/80" />;
  }

  if (!objectUrl) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        Aperçu indisponible.
      </div>
    );
  }

  const view = getMediaViewForItem(media);

  if (view === "images") {
    return (
      <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] bg-slate-100">
        <Image
          src={objectUrl}
          alt={media.altText || getMediaDisplayTitle(media)}
          fill
          unoptimized
          className="object-contain"
          sizes="90vw"
        />
      </div>
    );
  }

  if (view === "videos") {
    return (
      <video
        src={objectUrl}
        controls
        className="aspect-[16/10] w-full rounded-[2rem] border border-slate-200 bg-slate-950"
      />
    );
  }

  if (view === "audio") {
    return (
      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-5 rounded-[2rem] border border-slate-200 bg-slate-50 px-6">
        <Headphones className="h-10 w-10 text-slate-400" />
        <audio src={objectUrl} controls className="w-full max-w-lg" />
      </div>
    );
  }

  if (view === "pdf") {
    return (
      <iframe
        src={objectUrl}
        title={getMediaDisplayTitle(media)}
        className="aspect-[16/10] w-full rounded-[2rem] border border-slate-200 bg-white"
      />
    );
  }

  return (
    <div className="flex aspect-[16/10] flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-slate-500">
      <File className="h-10 w-10 text-slate-300" />
      <p className="text-sm">Telechargez le fichier pour l&apos;ouvrir localement.</p>
    </div>
  );
}

export default function MediaInspectorDialog({
  media,
  folderOptions,
  open,
  onOpenChange,
  isDeleting,
  onDelete,
  onUpdateMedia,
}: {
  media: MediaListItemDto | null;
  folderOptions: MediaListResult["folderOptions"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  onDelete: (mediaId: number, options?: MediaDeleteOptions) => Promise<boolean>;
  onUpdateMedia: (
    mediaId: number,
    input: MediaUpdateInput,
  ) => Promise<MediaListItemDto>;
}) {
  const isForceDeleteMode =
    media != null && media.usage.total > 0 && media.canForceRemove;
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  const handleCopyPath = async () => {
    if (!media) return;

    try {
      await navigator.clipboard.writeText(media.storagePath);
      toast.success("Chemin de stockage copie.");
    } catch {
      toast.error("Impossible de copier le chemin.");
    }
  };

  const handleCopyPublicUrl = async () => {
    if (!media || media.visibility !== "PUBLIC") {
      return;
    }

    try {
      const publicUrl = `${window.location.origin}${media.publicFileEndpoint}`;
      await navigator.clipboard.writeText(publicUrl);
      toast.success("URL publique copiee.");
    } catch {
      toast.error("Impossible de copier l'URL publique.");
    }
  };

  const handleVisibilityChange = async (value: string) => {
    if (!media || value === media.visibility) {
      return;
    }

    setIsUpdatingVisibility(true);

    try {
      await onUpdateMedia(media.id, {
        visibility: value as "PRIVATE" | "PUBLIC",
      });
      toast.success(
        value === "PUBLIC"
          ? "Le media est maintenant public."
          : "Le media est maintenant prive.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de mettre a jour la visibilite.",
      );
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleFolderChange = async (value: string) => {
    if (!media) {
      return;
    }

    const nextFolderId = value ? Number(value) : null;

    if (media.folderId === nextFolderId) {
      return;
    }

    setIsUpdatingVisibility(true);

    try {
      await onUpdateMedia(media.id, {
        folderId: nextFolderId,
      });
      toast.success(
        nextFolderId == null
          ? "Le media a ete deplace vers la racine."
          : "Le media a ete deplace dans le dossier selectionne.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de deplacer le media.",
      );
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleDownload = async () => {
    if (!media) return;

    try {
      const blob = await fetchMediaBlobClient(media.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = media.originalFilename || `media-${media.id}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Impossible de telecharger le media.");
    }
  };

  const handleDelete = async () => {
    if (!media) return;

    const confirmed = window.confirm(
      isForceDeleteMode
        ? `Forcer la suppression de ${getMediaDisplayTitle(media)} ? Cette action va retirer toutes ses references avant suppression definitive.`
        : `Supprimer definitivement ${getMediaDisplayTitle(media)} ?`,
    );

    if (!confirmed) {
      return;
    }

    const didDelete = await onDelete(media.id, {
      force: isForceDeleteMode,
    });
    if (didDelete) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-5xl">
        {media ? (
          <>
            <DialogHeader>
              <DialogTitle>{getMediaDisplayTitle(media)}</DialogTitle>
              <DialogDescription>
                {media.originalFilename || media.storagePath}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 px-6 pb-6 lg:grid-cols-[minmax(0,1.3fr)_360px]">
              <div className="space-y-5">
                <MediaInspectorPreview key={media.id} media={media} />

                {media.usage.total > 0 ? (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Media deja utilise</AlertTitle>
                    <AlertDescription>
                      {media.canForceRemove
                        ? `Ce fichier est reference ${media.usage.total} fois. Le bouton Supprimer forcera le retrait de ces references avant suppression.`
                        : `Ce fichier est reference ${media.usage.total} fois. La suppression reste bloquee tant qu'il est encore lie a un contenu.`}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Taille</p>
                    <p className="mt-2 text-base font-semibold text-cobam-dark-blue">
                      {formatBytes(media.sizeBytes)}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Type MIME</p>
                    <p className="mt-2 text-base font-semibold text-cobam-dark-blue">
                      {media.mimeType || "-"}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Upload par</p>
                    <p className="mt-2 text-base font-semibold text-cobam-dark-blue">
                      {media.uploadedByLabel || "Inconnu"}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Cree le</p>
                    <p className="mt-2 text-base font-semibold text-cobam-dark-blue">
                      {formatMediaDateTime(media.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[2rem] border border-slate-200 bg-white px-5 py-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <MediaKindBadge kind={media.kind} />
                    <MediaVisibilityBadge visibility={media.visibility} />
                    <StaffBadge
                      size="md"
                      color={media.isActive ? "green" : "default"}
                    >
                      {media.isActive ? "Actif" : "Inactif"}
                    </StaffBadge>
                  </div>

                  {media.description ? (
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {media.description}
                    </p>
                  ) : null}

                  <div className="mt-5 space-y-4 text-sm">
                    <div className="space-y-2">
                      <p className="font-medium text-cobam-dark-blue">Visibilite</p>
                      <StaffSelect
                        value={media.visibility}
                        onValueChange={(value) => void handleVisibilityChange(value)}
                        options={[
                          { value: "PRIVATE", label: "Prive" },
                          { value: "PUBLIC", label: "Public" },
                        ]}
                        disabled={isUpdatingVisibility || !media.canUpdate}
                        fullWidth
                      />
                      <p className="text-xs leading-5 text-slate-500">
                        {media.canUpdate
                          ? "Un media public peut etre charge depuis le site sans jeton d'acces."
                          : "Vous n'avez pas l'autorisation de modifier la visibilite de ce media."}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-cobam-dark-blue">Dossier</p>
                      <StaffSearchSelect
                        value={media.folderId != null ? String(media.folderId) : ""}
                        onValueChange={(value) => void handleFolderChange(value)}
                        options={folderOptions.map((option) => ({
                          value: String(option.id),
                          label: option.pathLabel,
                        }))}
                        emptyLabel="Racine"
                        placeholder="Choisir un dossier"
                        searchPlaceholder="Rechercher un dossier..."
                        noResultsLabel="Aucun dossier disponible"
                        disabled={isUpdatingVisibility || !media.canUpdate}
                        fullWidth
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-cobam-dark-blue">Stockage</p>
                      <p className="break-all text-slate-500">{media.storagePath}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-cobam-dark-blue">Usages</p>
                      <p className="inline-flex items-center gap-2 text-slate-500">
                        <Package className="h-4 w-4" />
                        {media.usage.total} reference(s)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <AnimatedUIButton
                    type="button"
                    variant="light"
                    icon="external-link"
                    iconPosition="left"
                    onClick={() => void handleDownload()}
                  >
                    Telecharger
                  </AnimatedUIButton>
                  <AnimatedUIButton
                    type="button"
                    variant="ghost"
                    icon="modify"
                    iconPosition="left"
                    onClick={() => void handleCopyPath()}
                  >
                    Copier le chemin
                  </AnimatedUIButton>
                  <AnimatedUIButton
                    type="button"
                    variant="ghost"
                    icon="globe"
                    iconPosition="left"
                    onClick={() => void handleCopyPublicUrl()}
                    disabled={media.visibility !== "PUBLIC"}
                  >
                    Copier l&apos;URL publique
                  </AnimatedUIButton>
                  <DynamicSuppressionButton
                    buttonText={{
                      default: "Supprimer",
                      force: "Forcer la suppression",
                    }}
                    isForceMode={isForceDeleteMode}
                    onClick={() => void handleDelete()}
                    disabled={
                      isDeleting ||
                      (!media.canDelete && !isForceDeleteMode) ||
                      (media.usage.total > 0 && !media.canForceRemove)
                    }
                    loading={isDeleting}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-10 text-sm text-slate-500">
            Aucun media selectionne.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
