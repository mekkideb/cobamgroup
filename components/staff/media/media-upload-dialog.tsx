"use client";

import { type ChangeEvent, useMemo, useRef, useState } from "react";
import type { MediaVisibility } from "@prisma/client";
import { Info, UploadCloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StaffBadge, StaffSearchSelect, StaffSelect } from "@/components/staff/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import type {
  MediaListResult,
  MediaUploadBatchCallbacks,
  MediaUploadBatchResult,
  MediaUploadRequest,
} from "@/features/media/types";
import MediaUploadQueue, {
  type MediaUploadQueueItem,
} from "./media-upload-queue";
import { formatBytes } from "./utils";

const MEDIA_ACCEPT =
  "image/*,video/*,audio/*,application/pdf,application/*,text/*";

function getQueueItemId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${file.type}`;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

type MediaUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isUploading: boolean;
  storage: MediaListResult["storage"] | null;
  folderOptions: MediaListResult["folderOptions"];
  initialFolderId: number | null;
  onUploadMany: (
    inputs: MediaUploadRequest[],
    callbacks?: MediaUploadBatchCallbacks,
  ) => Promise<MediaUploadBatchResult>;
};

export default function MediaUploadDialog({
  open,
  onOpenChange,
  isUploading,
  storage,
  folderOptions,
  initialFolderId,
  onUploadMany,
}: MediaUploadDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<MediaUploadQueueItem[]>([]);
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<MediaVisibility>("PRIVATE");
  const [folderId, setFolderId] = useState(
    initialFolderId != null ? String(initialFolderId) : "",
  );

  const reset = () => {
    setItems([]);
    setTitle("");
    setAltText("");
    setDescription("");
    setVisibility("PRIVATE");
    setFolderId(initialFolderId != null ? String(initialFolderId) : "");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const summary = useMemo(() => {
    const totalSize = items.reduce((sum, item) => sum + item.file.size, 0);
    const pendingCount = items.filter((item) => item.status === "pending").length;
    const uploadingCount = items.filter((item) => item.status === "uploading").length;
    const successCount = items.filter((item) => item.status === "success").length;
    const errorCount = items.filter((item) => item.status === "error").length;
    const completedCount = successCount + errorCount;

    return {
      totalSize,
      pendingCount,
      uploadingCount,
      successCount,
      errorCount,
      completedCount,
    };
  }, [items]);

  const uploadableItems = useMemo(
    () => items.filter((item) => item.status === "pending" || item.status === "error"),
    [items],
  );

  const hasSingleFile = items.length === 1;
  const progressPercent =
    items.length === 0 ? 0 : clampPercent((summary.completedCount / items.length) * 100);

  const appendFiles = (files: FileList | File[]) => {
    const nextFiles = Array.from(files);

    if (nextFiles.length === 0) {
      return;
    }

    setItems((current) => {
      const knownIds = new Set(current.map((item) => item.id));
      const appended = [...current];

      for (const file of nextFiles) {
        const id = getQueueItemId(file);

        if (knownIds.has(id)) {
          continue;
        }

        knownIds.add(id);
        appended.push({
          id,
          file,
          status: "pending",
          errorMessage: null,
        });
      }

      return appended;
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (isUploading) {
        return;
      }

      reset();
    }

    onOpenChange(nextOpen);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    appendFiles(event.target.files ?? []);
    event.target.value = "";
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  };

  const handleClear = () => {
    if (isUploading) {
      return;
    }

    reset();
  };

  const handleSubmit = async () => {
    if (uploadableItems.length === 0) {
      return;
    }

    const queueIds = uploadableItems.map((item) => item.id);

    setItems((current) =>
      current.map((item) =>
        queueIds.includes(item.id)
          ? {
              ...item,
              status: "pending",
              errorMessage: null,
            }
          : item,
      ),
    );

    const inputs = uploadableItems.map((item) => ({
      file: item.file,
      title: hasSingleFile ? title : undefined,
      altText: hasSingleFile ? altText : undefined,
      description: hasSingleFile ? description : undefined,
      visibility,
      folderId: folderId ? Number(folderId) : null,
    }));

    const result = await onUploadMany(inputs, {
      onItemStart: ({ index }) => {
        const itemId = queueIds[index];

        setItems((current) =>
          current.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: "uploading",
                  errorMessage: null,
                }
              : item,
          ),
        );
      },
      onItemComplete: ({ index, result: itemResult }) => {
        const itemId = queueIds[index];

        setItems((current) =>
          current.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: itemResult.ok ? "success" : "error",
                  errorMessage: itemResult.ok ? null : itemResult.errorMessage,
                }
              : item,
          ),
        );
      },
    });

    if (result.errorCount === 0) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-slate-200 px-6 py-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UploadCloud className="h-5 w-5" />
            Importer plusieurs fichiers
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-500">
            Selectionnez un ou plusieurs fichiers pour les ajouter a la mediatheque.
            Stockage actif:{" "}
            <span className="font-medium text-slate-700">
              {storage?.label ?? "configuration locale"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            <Card className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50/70 py-0 ring-0">
              <CardContent className="space-y-4 px-5 py-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-cobam-dark-blue">
                      Selection des fichiers
                    </p>
                    <p className="text-sm text-slate-500">
                      Images, videos, PDF, audio et autres documents legers.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <AnimatedUIButton
                      type="button"
                      variant="secondary"
                      icon="plus"
                      iconPosition="left"
                      onClick={() => inputRef.current?.click()}
                      disabled={isUploading}
                    >
                      Ajouter des fichiers
                    </AnimatedUIButton>
                    <AnimatedUIButton
                      type="button"
                      variant="light"
                      onClick={handleClear}
                      disabled={items.length === 0 || isUploading}
                    >
                      Vider la file
                    </AnimatedUIButton>
                  </div>
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept={MEDIA_ACCEPT}
                  multiple
                  onChange={handleInputChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <StaffBadge size="md" color="default" className="bg-white">
                    {items.length} fichier(s)
                  </StaffBadge>
                  <StaffBadge size="md" color="default" className="bg-white">
                    {formatBytes(summary.totalSize)}
                  </StaffBadge>
                  <StaffBadge size="md" color="default" className="bg-white">
                    Ajout cumulatif
                  </StaffBadge>
                  <StaffBadge
                    size="md"
                    color={visibility === "PUBLIC" ? "blue" : "default"}
                    className="bg-white"
                  >
                    {visibility === "PUBLIC" ? "Public" : "Prive"}
                  </StaffBadge>
                  <StaffBadge size="md" color="default" className="bg-white">
                    {folderId
                      ? folderOptions.find((option) => option.id === Number(folderId))
                          ?.pathLabel ?? "Dossier"
                      : "Racine"}
                  </StaffBadge>
                </div>
              </CardContent>
            </Card>

            <MediaUploadQueue
              items={items}
              onRemove={handleRemoveItem}
              canRemove={!isUploading}
            />
          </div>

          <div className="space-y-4">
            <Card className="rounded-[2rem] border border-slate-200 py-0 ring-0">
              <CardHeader className="border-b border-slate-200 px-5 py-4">
                <CardTitle className="text-base text-cobam-dark-blue">
                  Résumé de l&apos;import
                </CardTitle>
                <CardDescription>
                  L&apos;envoi se fait fichier par fichier pour garder un import stable.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-5 py-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Progression</span>
                    <span>
                      {summary.completedCount}/{items.length || 0}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-cobam-dark-blue transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      En attente
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-cobam-dark-blue">
                      {summary.pendingCount + summary.uploadingCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Importes
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-700">
                      {summary.successCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      En erreur
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-rose-700">
                      {summary.errorCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Volume
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-cobam-dark-blue">
                      {formatBytes(summary.totalSize)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {hasSingleFile ? (
              <Card className="rounded-[2rem] border border-slate-200 py-0 ring-0">
                <CardHeader className="border-b border-slate-200 px-5 py-4">
                  <CardTitle className="text-base text-cobam-dark-blue">
                    Metadonnees du fichier
                  </CardTitle>
                  <CardDescription>
                    Ces champs s&apos;appliquent uniquement quand un seul fichier est importe.
                  </CardDescription>
                </CardHeader>
              <CardContent className="space-y-4 px-5 py-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-cobam-dark-blue">
                    Dossier cible
                  </label>
                  <StaffSearchSelect
                    value={folderId}
                    onValueChange={setFolderId}
                    options={folderOptions.map((option) => ({
                      value: String(option.id),
                      label: option.pathLabel,
                    }))}
                    emptyLabel="Racine"
                    placeholder="Choisir un dossier"
                    searchPlaceholder="Rechercher un dossier..."
                    noResultsLabel="Aucun dossier disponible"
                    fullWidth
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-cobam-dark-blue">
                    Visibilite initiale
                  </label>
                  <StaffSelect
                    value={visibility}
                    onValueChange={(value) => setVisibility(value as MediaVisibility)}
                    options={[
                      { value: "PRIVATE", label: "Prive" },
                      { value: "PUBLIC", label: "Public" },
                    ]}
                    fullWidth
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    Les fichiers publics pourront etre servis depuis le site sans
                    jeton d&apos;accès.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-cobam-dark-blue">
                    Titre
                  </label>
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Nom d'affichage facultatif"
                      className="h-12 rounded-2xl border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-cobam-dark-blue">
                      Texte alternatif
                    </label>
                    <Input
                      value={altText}
                      onChange={(event) => setAltText(event.target.value)}
                      placeholder="Utile surtout pour une image"
                      className="h-12 rounded-2xl border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-cobam-dark-blue">
                      Description
                    </label>
                    <Textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Contexte, usage ou notes internes"
                      className="min-h-28 rounded-2xl border-slate-200"
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-[2rem] border border-slate-200 py-0 ring-0">
                <CardHeader className="border-b border-slate-200 px-5 py-4">
                  <CardTitle className="flex items-center gap-2 text-base text-cobam-dark-blue">
                    <Info className="h-4 w-4" />
                    Import par lot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-5 py-5 text-sm leading-6 text-slate-500">
                  <p>
                    Les nouveaux fichiers sont importes en mode{" "}
                    <span className="font-medium text-slate-700">
                      {visibility === "PUBLIC" ? "public" : "prive"}
                    </span>
                    {" "}dans{" "}
                    <span className="font-medium text-slate-700">
                      {folderId
                        ? folderOptions.find((option) => option.id === Number(folderId))
                            ?.pathLabel ?? "le dossier selectionne"
                        : "la racine"}
                    </span>
                    .
                  </p>
                  <p>
                    Les noms d&apos;origine des fichiers sont conserves automatiquement.
                  </p>
                  <p>
                    Les metadonnees avancees pourront etre ajustees ensuite depuis
                    l&apos;inspecteur de la mediatheque.
                  </p>
                  <p>
                    En cas d&apos;erreur partielle, seuls les fichiers en echec restent a
                    reprendre.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 px-6 py-4">
          <AnimatedUIButton
            type="button"
            variant="light"
            onClick={() => handleOpenChange(false)}
            disabled={isUploading}
          >
            Annuler
          </AnimatedUIButton>
          <AnimatedUIButton
            type="button"
            variant="secondary"
            icon="plus"
            iconPosition="left"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            Ajouter
          </AnimatedUIButton>
          <AnimatedUIButton
            type="button"
            variant="primary"
            icon="plus"
            iconPosition="left"
            onClick={() => void handleSubmit()}
            disabled={uploadableItems.length === 0 || isUploading}
            loading={isUploading}
            loadingText="Import en cours..."
          >
            {uploadableItems.length > 1
              ? `Importer ${uploadableItems.length} fichiers`
              : uploadableItems.length === 1
                ? "Importer le fichier"
                : "Importer"}
          </AnimatedUIButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
