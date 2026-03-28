"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { StaffField } from "../ui";
import PanelField from "../ui/PanelField";
import PanelInput from "../ui/PanelInput";

export default function MediaFolderCreateDialog({
  open,
  onOpenChange,
  parentLabel,
  isCreating,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentLabel: string;
  isCreating: boolean;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName || isCreating) {
      return;
    }

    await onCreate(trimmedName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col gap-6 px-8">
        <DialogHeader>
          <DialogTitle>Nouveau dossier</DialogTitle>
          <DialogDescription>
            Le dossier sera créé dans <span className="font-medium">{parentLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        <PanelField id="media-folder-name" label="Nom du dossier">
          <PanelInput
            id="media-folder-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex. Logos partenaires"
            className="h-12 border-slate-300"
            autoFocus
          />
        </PanelField>

        <DialogFooter className="gap-2 sm:gap-2">
          <AnimatedUIButton
            type="button"
            variant="light"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Annuler
          </AnimatedUIButton>
          <AnimatedUIButton
            type="button"
            variant="secondary"
            icon="plus"
            iconPosition="left"
            onClick={() => void handleSubmit()}
            disabled={isCreating || name.trim().length === 0}
          >
            Creer le dossier
          </AnimatedUIButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
