"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PersonalDetailsForm, {
  PersonalFormState,
} from "@/components/staff/ui/PersonalDetailsForm";
import SecurityForm from "@/components/staff/ui/SecurityForm";
import PersonalDetailsPreviewAndAvatar from "@/components/staff/ui/PersonalDetailsPreviewAndAvatar";
import RoleSelectionPanel from "@/components/staff/roles/RoleSelectionPanel";
import Loading from "@/components/staff/Loading";
import { createUserClient, UsersClientError } from "@/features/users/client";
import { useRolesList } from "@/features/roles/hooks/use-roles-list";
import {
  canSetAdminPowerType,
  getAssignableRoles,
  type PowerType,
} from "@/features/rbac/roles";
import { hasPermission } from "@/features/rbac/access";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { useStaffSessionContext } from "@/features/auth/client/staff-session-provider";
import { OTHER_JOB_TITLE_VALUE } from "@/features/users/constants/job-titles";
import { StaffPageHeader } from "@/components/staff/ui";

type PasswordState = {
  newPassword: string;
  confirmation: string;
};

export default function CreateUserPage() {
  const router = useRouter();
  const { user: authUser } = useStaffSessionContext();
  const { items: roles, isLoading: isLoadingRoles, error: rolesError } = useRolesList();

  const [personal, setPersonal] = useState<PersonalFormState>({
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
  const [passwords, setPasswords] = useState<PasswordState>({
    newPassword: "",
    confirmation: "",
  });
  const [powerType, setPowerType] = useState<PowerType>("STAFF");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate =
    !!authUser && hasPermission(authUser, PERMISSIONS.USERS_CREATE_BELOW_ROLE);

  const assignableRoles = useMemo(
    () => (authUser ? getAssignableRoles(authUser, roles) : []),
    [authUser, roles],
  );
  const canSetAdmin = authUser ? canSetAdminPowerType(authUser.powerType) : false;

  const handleToggleRole = (roleId: string) => {
    setSelectedRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((value) => value !== roleId)
        : [...current, roleId],
    );
  };

  const handleSubmit = async () => {
    setError(null);

    if (!canCreate) {
      setError("Accès refusé");
      return;
    }

    if (!personal.email.trim()) {
      setError("L'email est requis");
      return;
    }

    if (
      !passwords.newPassword ||
      passwords.newPassword !== passwords.confirmation
    ) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (
      personal.jobTitleSelect === OTHER_JOB_TITLE_VALUE &&
      !personal.jobTitleOther.trim()
    ) {
      setError("Veuillez renseigner le poste (Autres)");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await createUserClient({
        email: personal.email.trim().toLowerCase(),
        password: passwords.newPassword,
        powerType,
        roleIds: powerType === "STAFF" ? selectedRoleIds : [],
        profile: {
          firstName: personal.firstName.trim() || null,
          lastName: personal.lastName.trim() || null,
          jobTitle:
            personal.jobTitleSelect === OTHER_JOB_TITLE_VALUE
              ? personal.jobTitleOther.trim() || null
              : personal.jobTitleSelect || null,
          phone: personal.phone.trim() || null,
          birthDate: personal.birthDate.trim() || null,
          avatarMediaId: personal.avatarMediaId,
          bio: personal.bio.trim() || null,
        },
      });

      toast.success("Utilisateur créé.");
      router.replace(`/espace/staff/administration/membres/${user.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof UsersClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur lors de la création";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="max-w-md mx-auto rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-cobam-dark-blue mb-2">
          Accès refusé
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          Vous n&apos;avez pas l&apos;autorisation de créer des utilisateurs.
        </p>
        <Link
          href="/espace/staff/administration/membres"
          className="inline-flex items-center gap-2 rounded-xl bg-cobam-dark-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-cobam-water-blue transition-colors"
        >
          Retour
        </Link>
      </div>
    );
  }

  if (isLoadingRoles) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {rolesError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {rolesError}
        </div>
      ) : null}

      <StaffPageHeader
        eyebrow="Utilisateurs"
        title="Création de compte"
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <PersonalDetailsForm
            state={personal}
            onChange={(patch) => setPersonal((prev) => ({ ...prev, ...patch }))}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            title="Informations personnelles"
            pretitle="Profil"
            description="Renseignez les informations principales du compte."
            submitLabel="Créer l'utilisateur"
          />

          <SecurityForm
            state={{
              newPassword: passwords.newPassword,
              confirmation: passwords.confirmation,
            }}
            onChange={(patch) =>
              setPasswords((prev) => ({
                ...prev,
                ...(patch.newPassword !== undefined
                  ? { newPassword: patch.newPassword }
                  : {}),
                ...(patch.confirmation !== undefined
                  ? { confirmation: patch.confirmation }
                  : {}),
              }))
            }
            requireActualPassword={false}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Créer l'utilisateur"
            pretitle="Sécurité"
            title="Mot de passe initial"
            description="Définissez un mot de passe pour ce compte."
          />
        </div>

        <div className="flex flex-col gap-6">
          <RoleSelectionPanel
            powerType={powerType}
            canSetAdmin={canSetAdmin}
            options={assignableRoles}
            selectedRoleIds={selectedRoleIds}
            onPowerTypeChange={(value) => {
              setPowerType(value);
              if (value !== "STAFF") {
                setSelectedRoleIds([]);
              }
            }}
            onToggleRole={handleToggleRole}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Créer l'utilisateur"
          />

          <PersonalDetailsPreviewAndAvatar
            state={{
              avatarMediaId: personal.avatarMediaId,
              firstName: personal.firstName,
              lastName: personal.lastName,
              email: personal.email,
              jobTitle:
                personal.jobTitleSelect === OTHER_JOB_TITLE_VALUE
                  ? personal.jobTitleOther
                  : personal.jobTitleSelect,
              phone: personal.phone,
              birthDate: personal.birthDate,
            }}
            onAvatarMediaIdChange={(value) =>
              setPersonal((prev) => ({ ...prev, avatarMediaId: value }))
            }
          />
        </div>
      </div>
    </div>
  );
}
