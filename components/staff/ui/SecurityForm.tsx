"use client";

import type { ReactNode } from "react";
import Panel from "@/components/staff/ui/Panel";
import PanelPasswordInput from "@/components/staff/ui/PanelPasswordInput";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { Label } from "@/components/ui/label";

type PasswordState = {
  currentPassword?: string;
  newPassword: string;
  confirmation: string;
};

export type SecurityFormProps = {
  state: PasswordState;
  onChange: (patch: Partial<PasswordState>) => void;
  requireActualPassword?: boolean;
  pretitle?: string;
  title?: string;
  description?: string;
  onSubmit?: () => void | Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
};

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-[15px] font-semibold text-cobam-dark-blue"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

export default function SecurityForm({
  state,
  onChange,
  requireActualPassword = true,
  pretitle = "Sécurité",
  title = "Mot de passe",
  description = "Gerez les identifiants du compte.",
  onSubmit,
  isSubmitting = false,
  submitLabel = "Enregistrer",
}: SecurityFormProps) {
  return (
    <Panel pretitle={pretitle} title={title} description={description}>
      <div className="flex flex-col gap-6">
        {requireActualPassword ? (
          <Field id="current-password" label="Mot de passe actuel">
            <PanelPasswordInput
              id="current-password"
              value={state.currentPassword || ""}
              onChange={(e) => onChange({ currentPassword: e.target.value })}
              autoComplete="current-password"
            />
          </Field>
        ) : null}

        <Field id="new-password" label="Nouveau mot de passe">
          <PanelPasswordInput
            id="new-password"
            value={state.newPassword}
            onChange={(e) => onChange({ newPassword: e.target.value })}
            autoComplete="new-password"
          />
        </Field>

        <Field id="confirm-password" label="Confirmation">
          <PanelPasswordInput
            id="confirm-password"
            value={state.confirmation}
            onChange={(e) => onChange({ confirmation: e.target.value })}
            autoComplete="new-password"
          />
        </Field>

        {onSubmit ? (
          <AnimatedUIButton
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSubmitting}
            loading={isSubmitting}
            loadingText="Enregistrement..."
            variant="primary"
            className="w-full"
          >
            {submitLabel}
          </AnimatedUIButton>
        ) : null}
      </div>
    </Panel>
  );
}
