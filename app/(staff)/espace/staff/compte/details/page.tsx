"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { staffApiFetch } from "@/lib/api/auth/staff/api-fetch";
import Loading from "@/components/staff/Loading";
import PersonalDetailsForm, {
  PersonalFormState,
} from "@/components/staff/ui/PersonalDetailsForm";
import PersonalDetailsPreviewAndAvatar from "@/components/staff/ui/PersonalDetailsPreviewAndAvatar";
import { StaffPageHeader } from "@/components/staff/ui";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import {
  findKnownJobTitle,
  OTHER_JOB_TITLE_VALUE,
} from "@/features/users/constants/job-titles";

type MeResponse = {
  ok: boolean;
  user?: {
    id: string;
    email: string;
    profile?: {
      firstName: string | null;
      lastName: string | null;
      jobTitle: string | null;
      phone: string | null;
      birthDate: string | null;
      avatarMediaId: number | null;
      bio: string | null;
    } | null;
  };
  message?: string;
};

export default function PersonalDetailsPage() {
  const [form, setForm] = useState<PersonalFormState>({
    firstName: "",
    lastName: "",
    email: "",
    jobTitleSelect: "",
    jobTitleOther: "",
    phone: "",
    birthDate: "",
    avatarMediaId: null,
    bio: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await staffApiFetch("/api/staff/me", {
          method: "GET",
          auth: true,
        });

        const data: MeResponse = await res.json().catch(() => ({
          ok: false,
          message: "Erreur lors du chargement du profil",
        }));

        if (!res.ok || !data.ok || !data.user) {
          throw new Error(data.message || "Impossible de charger le profil");
        }

        const user = data.user;
        const profile = user.profile;
        const incomingJobTitle = profile?.jobTitle?.trim() || "";
        const knownTitle = findKnownJobTitle(incomingJobTitle);

        setForm({
          firstName: profile?.firstName || "",
          lastName: profile?.lastName || "",
          email: user.email,
          jobTitleSelect:
            knownTitle || (incomingJobTitle ? OTHER_JOB_TITLE_VALUE : ""),
          jobTitleOther: knownTitle ? "" : incomingJobTitle,
          phone: profile?.phone || "",
          birthDate: profile?.birthDate
            ? new Date(profile.birthDate).toISOString().slice(0, 10)
            : "",
          avatarMediaId: profile?.avatarMediaId ?? null,
          bio: profile?.bio || "",
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(message);
        toast.error("Erreur lors du chargement du profil", {
          description: message || "Veuillez réessayer plus tard.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (
      form.jobTitleSelect === OTHER_JOB_TITLE_VALUE &&
      !form.jobTitleOther.trim()
    ) {
      toast.error("Poste manquant", {
        description:
          "Veuillez renseigner le poste si vous choisissez Autres.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const res = await staffApiFetch("/api/staff/me", {
        method: "PUT",
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName || null,
          lastName: form.lastName || null,
          jobTitle:
            form.jobTitleSelect === OTHER_JOB_TITLE_VALUE
              ? form.jobTitleOther || null
              : form.jobTitleSelect || null,
          phone: form.phone || null,
          birthDate: form.birthDate || null,
          avatarMediaId: form.avatarMediaId,
          bio: form.bio || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Erreur lors de la mise à jour");
      }

      toast.success("Profil mis à jour", {
        description: "Vos informations ont été enregistrées avec succès.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error("Erreur lors de la mise à jour", {
        description: message || "Veuillez réessayer plus tard.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-5">
      <StaffPageHeader eyebrow="Mon compte" title="Détails personnels">
        <AnimatedUIButton
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          loading={isSaving}
          loadingText="Enregistrement..."
          icon="save"
          variant="secondary"
        >
          Enregistrer
        </AnimatedUIButton>
      </StaffPageHeader>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <PersonalDetailsForm
          state={form}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          disableEmail
          title="Détails personnels"
          pretitle="Mon compte"
          description="Gérez vos informations de profil pour le portail staff."
        />

        <PersonalDetailsPreviewAndAvatar
          state={{
            avatarMediaId: form.avatarMediaId,
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            jobTitle:
              form.jobTitleSelect === OTHER_JOB_TITLE_VALUE
                ? form.jobTitleOther
                : form.jobTitleSelect,
            phone: form.phone,
            birthDate: form.birthDate,
          }}
          onAvatarMediaIdChange={(value) =>
            setForm((prev) => ({ ...prev, avatarMediaId: value }))
          }
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
