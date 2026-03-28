"use client";

import type { ReactNode } from "react";
import Panel from "./Panel";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";

export function StaffEditorLayout({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[7fr_4fr] xl:items-start">
      <div className="space-y-6">{children}</div>
      <div className="flex flex-col gap-6 xl:sticky xl:top-6 xl:self-start">
        {sidebar}
      </div>
    </div>
  );
}

export function StaffEditorInfoPanel({
  title = "Informations",
  description = "Repères rapides pour relire cette ressource avant validation.",
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Panel pretitle="Repères" title={title} description={description}>
      <div className="space-y-4">{children}</div>
    </Panel>
  );
}

export function StaffEditorActionsPanel({
  mode,
  onSave,
  isSaving = false,
  saveDisabled = false,
  saveLoadingText,
  onDelete,
  isDeleting = false,
  deleteDisabled = false,
  deleteLoadingText = "Suppression...",
  description = "Retrouvez ici les actions principales de cet écran.",
  topContent,
  children,
  bottomContent,
}: {
  mode: "create" | "edit";
  onSave: () => void;
  isSaving?: boolean;
  saveDisabled?: boolean;
  saveLoadingText?: string;
  onDelete?: () => void;
  isDeleting?: boolean;
  deleteDisabled?: boolean;
  deleteLoadingText?: string;
  description?: string;
  topContent?: ReactNode;
  children?: ReactNode;
  bottomContent?: ReactNode;
}) {
  const saveLabel = mode === "create" ? "Créer" : "Enregistrer";

  return (
    <Panel pretitle="Actions" title="Enregistrement" description={description}>
      <div className="space-y-4">
        {topContent}

        <AnimatedUIButton
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          loading={isSaving}
          loadingText={saveLoadingText ?? (mode === "create" ? "Création..." : "Enregistrement...")}
          variant="primary"
          icon={mode === "create" ? "plus" : "save"}
          iconPosition="left"
          className="w-full justify-center"
        >
          {saveLabel}
        </AnimatedUIButton>

        {children}

        {onDelete ? (
          <AnimatedUIButton
            type="button"
            onClick={onDelete}
            disabled={deleteDisabled}
            loading={isDeleting}
            loadingText={deleteLoadingText}
            variant="light"
            icon="delete"
            iconPosition="left"
            className="w-full border-red-200 bg-red-50 hover:border-red-300 hover:bg-red-100"
            textClassName="text-red-700"
            iconClassName="text-red-700"
          >
            Supprimer
          </AnimatedUIButton>
        ) : null}

        {bottomContent}
      </div>
    </Panel>
  );
}
