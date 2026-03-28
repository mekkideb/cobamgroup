"use client";

import { useMemo, type ReactNode } from "react";
import { Textarea } from "@/components/ui/textarea";
import Panel from "@/components/staff/ui/Panel";
import PanelInput from "@/components/staff/ui/PanelInput";
import { PhoneInput } from "@/components/ui/custom/PhoneInput";
import { PanelBirthdayPicker } from "@/components/staff/ui/PanelBirthdayPicker";
import type { E164Number } from "libphonenumber-js/core";
import {
  JOB_TITLE_OPTIONS, findKnownJobTitle, OTHER_JOB_TITLE_VALUE
} from "@/features/users/constants/job-titles";
import PanelSelect from "@/components/staff/ui/PanelSelect";
import PanelField from "./PanelField";

export type PersonalFormState = {
  firstName: string;
  lastName: string;
  email: string;
  jobTitleSelect: string;
  jobTitleOther: string;
  phone: string;
  birthDate: string;
  avatarMediaId: number | null;
  bio: string;
};

export type PersonalDetailsFormProps = {
  state: PersonalFormState;
  onChange: (patch: Partial<PersonalFormState>) => void;
  onSubmit?: () => void | Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
  disableEmail?: boolean;
  actionSlot?: ReactNode;
  description?: string;
  title?: string;
  pretitle?: string;
};



export function normalizeJobTitleState(state: PersonalFormState) {
  const incoming = state.jobTitleSelect || state.jobTitleOther;
  const known = findKnownJobTitle(incoming);

  if (known) return { select: known, other: "" };
  if (incoming) return { select: OTHER_JOB_TITLE_VALUE, other: incoming };
  return { select: "", other: "" };
}

export default function PersonalDetailsForm({
  state,
  onChange,
  disableEmail = false,
  description = "Gerez les informations de profil.",
  title = "Détails personnels",
  pretitle = "Compte",
}: PersonalDetailsFormProps) {
  const { selectValue } = useMemo(() => {
    const normalized = normalizeJobTitleState(state);
    return { selectValue: normalized.select };
  }, [state]);

  return (
    <Panel pretitle={pretitle} title={title} description={description}>
      <div className="grid gap-6 sm:grid-cols-2">
        <PanelField id="firstName" label="Prenom">
          <PanelInput
          fullWidth
            id="firstName"
            value={state.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            autoComplete="given-name"
          />
        </PanelField>

        <PanelField id="lastName" label="Nom">
          <PanelInput
          fullWidth
            id="lastName"
            value={state.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            autoComplete="family-name"
          />
        </PanelField>

        <PanelField
          id="email"
          label="Adresse e-mail"
          hint={disableEmail ? "L'email ne peut pas etre modifie ici." : undefined}
        >
          <PanelInput
          fullWidth
            id="email"
            value={state.email}
            onChange={(e) => onChange({ email: e.target.value })}
            autoComplete="email"
            disabled={disableEmail}
          />
        </PanelField>

        <PanelField
          id="jobTitle"
          label="Fonction"
        >
          <div className="space-y-3">
            <PanelSelect
              value={selectValue}
              onValueChange={(value: string) => {
                onChange({
                  jobTitleSelect: value,
                  jobTitleOther:
                    value === OTHER_JOB_TITLE_VALUE ? state.jobTitleOther : "",
                });
              }}
              placeholder="Sélectionner une fonction"
              groupedOptions={JOB_TITLE_OPTIONS}
              fullWidth
            />

            {selectValue === OTHER_JOB_TITLE_VALUE ? (
              <PanelInput
                fullWidth
                id="jobTitleOther"
                value={state.jobTitleOther}
                onChange={(e) => onChange({ jobTitleOther: e.target.value })}
                placeholder="Saisissez l'intitule de poste"
              />
            ) : null}
          </div>
        </PanelField>

        <PanelField id="phone" label="Telephone">
          <PhoneInput
            fullWidth
            id="phone"
            value={(state.phone || "") as E164Number}
            onChange={(value) => onChange({ phone: value || "" })}
            placeholder="+216 ..."
          />
        </PanelField>

        <PanelField id="birthDate" label="Date de naissance">
          <PanelBirthdayPicker
            id="birthDate"
            value={state.birthDate}
            onChange={(dateStr) => onChange({ birthDate: dateStr })}
          />
        </PanelField>

        <div className="sm:col-span-2">
          <PanelField id="bio" label="Bio">
            <Textarea
              id="bio"
              value={state.bio}
              onChange={(e) => onChange({ bio: e.target.value })}
              rows={6}
              placeholder="Quelques lignes sur l'utilisateur..."
              className="min-h-[160px] rounded-2xl border-slate-300 px-4 py-3 text-base resize-none"
            />
          </PanelField>
        </div>
      </div>
    </Panel>
  );
}
