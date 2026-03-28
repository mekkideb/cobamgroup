"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { toast } from "sonner";
import Panel from "@/components/staff/ui/Panel";
import UserBanDialog from "@/components/staff/ui/UserBanDialog";
import Loading from "@/components/staff/Loading";
import PersonalDetailsForm, {
  type PersonalFormState,
} from "@/components/staff/ui/PersonalDetailsForm";
import SecurityForm from "@/components/staff/ui/SecurityForm";
import PersonalDetailsPreviewAndAvatar from "@/components/staff/ui/PersonalDetailsPreviewAndAvatar";
import RoleSelectionPanel from "@/components/staff/roles/RoleSelectionPanel";
import {
  StaffBadge,
  StaffNotice,
  StaffPageHeader,
  StaffStateCard,
} from "@/components/staff/ui";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { useUserDetail } from "@/features/users/hooks/use-user-detail";
import { useRolesList } from "@/features/roles/hooks/use-roles-list";
import {
  canAffectTargetUser,
  canSetAdminPowerType,
  getAssignableRoles,
} from "@/features/rbac/roles";
import { hasPermission } from "@/features/rbac/access";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { findKnownJobTitle, OTHER_JOB_TITLE_VALUE } from "@/features/users/constants/job-titles";
import { useStaffSessionContext } from "@/features/auth/client/staff-session-provider";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params?.id || null;
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);

  const { user: authUser } = useStaffSessionContext();
  const { items: roles } = useRolesList();
  const {
    user,
    profile,
    credentials,
    access,
    isLoading,
    isSavingProfile,
    isSavingAccess,
    isSavingCredentials,
    isSavingBan,
    isDeleting,
    error,
    notice,
    setField,
    setCredentialField,
    setAccess,
    saveProfile,
    saveAccess,
    saveCredentials,
    saveBan,
    deleteUser,
  } = useUserDetail(userId);

  const baseUrl = "/espace/staff/administration/membres";

  const knownJobTitle = findKnownJobTitle(profile.jobTitle);
  const personalState: PersonalFormState | null = user
    ? {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: credentials.email || user.email,
        jobTitleSelect: knownJobTitle
          ? knownJobTitle
          : profile.jobTitle
            ? OTHER_JOB_TITLE_VALUE
            : "",
        jobTitleOther: knownJobTitle ? "" : profile.jobTitle,
        phone: profile.phone,
        birthDate: profile.birthDate,
        avatarMediaId: profile.avatarMediaId,
        bio: profile.bio,
      }
    : null;

  const assignableRoles = useMemo(
    () => (authUser ? getAssignableRoles(authUser, roles) : []),
    [authUser, roles],
  );
  const canSetAdmin = authUser ? canSetAdminPowerType(authUser.powerType) : false;

  const canEditProfile =
    !!authUser &&
    !!user &&
    (
      authUser.id === user.id ||
      ((hasPermission(authUser, PERMISSIONS.USERS_UPDATE_PROFILE_ALL) ||
        hasPermission(authUser, PERMISSIONS.USERS_UPDATE_PROFILE_BELOW_ROLE)) &&
        canAffectTargetUser(authUser, user))
    );
  const canEditCredentials =
    !!authUser &&
    !!user &&
    (
      authUser.id === user.id ||
      ((hasPermission(authUser, PERMISSIONS.USERS_UPDATE_CREDENTIALS_ALL) ||
        hasPermission(authUser, PERMISSIONS.USERS_UPDATE_CREDENTIALS_BELOW_ROLE)) &&
        canAffectTargetUser(authUser, user))
    );
  const canEditAccess =
    !!authUser &&
    !!user &&
    authUser.id !== user.id &&
    hasPermission(authUser, PERMISSIONS.ROLES_ASSIGN_BELOW_ROLE) &&
    canAffectTargetUser(authUser, user);
  const canBan =
    !!authUser &&
    !!user &&
    (hasPermission(authUser, PERMISSIONS.USERS_BAN_BELOW_ROLE) ||
      hasPermission(authUser, PERMISSIONS.USERS_UNBAN_BELOW_ROLE)) &&
    canAffectTargetUser(authUser, user);
  const canDelete =
    !!authUser &&
    !!user &&
    hasPermission(authUser, PERMISSIONS.USERS_DELETE_BELOW_ROLE) &&
    canAffectTargetUser(authUser, user);
  const emailChanged =
    !!user &&
    credentials.email.trim().toLowerCase() !== user.email.trim().toLowerCase();
  const isBanned = user?.status === "BANNED";
  const statusLabel = user
    ? {
        ACTIVE: "Actif",
        BANNED: "Banni",
        SUSPENDED: "Suspendu",
        CLOSED: "Clos",
      }[user.status]
    : "";
  useEffect(() => {
    if (notice) {
      toast.success(notice);
    }
  }, [notice]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handlePersonalChange = (patch: Partial<PersonalFormState>) => {
    if (patch.firstName !== undefined) setField("firstName", patch.firstName);
    if (patch.lastName !== undefined) setField("lastName", patch.lastName);
    if (patch.email !== undefined) setCredentialField("email", patch.email);
    if (patch.phone !== undefined) setField("phone", patch.phone);
    if (patch.birthDate !== undefined) setField("birthDate", patch.birthDate);
    if (patch.avatarMediaId !== undefined) {
      setField("avatarMediaId", patch.avatarMediaId);
    }
    if (patch.bio !== undefined) setField("bio", patch.bio);

    if (patch.jobTitleSelect !== undefined) {
      if (patch.jobTitleSelect === OTHER_JOB_TITLE_VALUE) {
        setField("jobTitle", personalState?.jobTitleOther || "");
      } else {
        setField("jobTitle", patch.jobTitleSelect);
      }
    }

    if (patch.jobTitleOther !== undefined) {
      setField("jobTitle", patch.jobTitleOther);
    }
  };

  const handleSavePersonal = async () => {
    const savedProfile = await saveProfile();
    if (!savedProfile) return;

    if (canEditCredentials && emailChanged && !credentials.password) {
      await saveCredentials();
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      `Supprimer définitivement le compte ${user.email} ?`,
    );
    if (!confirmed) return;

    const deleted = await deleteUser();
    if (deleted) {
      toast.success("Compte supprimé.");
      router.replace(baseUrl);
    }
  };

  const handleBanToggle = async () => {
    if (!user) return;

    if (!isBanned) {
      setIsBanDialogOpen(true);
      return;
    }

    const confirmed = window.confirm(`Réautoriser le compte ${user.email} ?`);
    if (!confirmed) return;

    await saveBan({ banned: false });
  };

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loading />
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <StaffStateCard
        title="Erreur"
        description={error}
        actionHref={baseUrl}
        actionLabel="Retour aux utilisateurs"
      />
    );
  }

  if (!user || !personalState) return null;

  return (
    <div className="space-y-6">
      <StaffPageHeader
        backHref={baseUrl}
        eyebrow="Utilisateurs"
        title={user.email}
        icon={Users}
        status={
          <StaffBadge
            size="md"
            color={
              isBanned
                ? "amber"
                : user?.status === "ACTIVE"
                  ? "green"
                  : "default"
            }
            icon={
              isBanned
                ? "warning"
                : user?.status === "ACTIVE"
                  ? "check-circle"
                  : "pause"
            }
          >
            {statusLabel}
          </StaffBadge>
        }
      />

      {error ? (
        <StaffNotice variant="error" title="Modification impossible">
          {error}
        </StaffNotice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <PersonalDetailsForm
            state={personalState}
            onChange={handlePersonalChange}
            onSubmit={canEditProfile ? handleSavePersonal : undefined}
            isSubmitting={isSavingProfile || isSavingCredentials}
            disableEmail={!canEditCredentials}
            title="Informations personnelles"
            pretitle="Profil"
            description="Mettez à jour les informations principales du compte."
            submitLabel="Enregistrer le profil"
          />

          {canEditCredentials ? (
            <SecurityForm
              state={{
                currentPassword: undefined,
                newPassword: credentials.password,
                confirmation: credentials.passwordConfirm,
              }}
              onChange={(patch) => {
                if (patch.newPassword !== undefined) {
                  setCredentialField("password", patch.newPassword);
                }
                if (patch.confirmation !== undefined) {
                  setCredentialField("passwordConfirm", patch.confirmation);
                }
              }}
              requireActualPassword={false}
              onSubmit={async () => {
                await saveCredentials();
              }}
              isSubmitting={isSavingCredentials}
              submitLabel="Mettre à jour les identifiants"
              pretitle="Sécurité"
              title="Mot de passe"
              description="Définissez un nouveau mot de passe pour ce compte."
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <RoleSelectionPanel
            powerType={access.powerType}
            canSetAdmin={canSetAdmin}
            options={assignableRoles}
            selectedRoleIds={access.roleIds}
            onPowerTypeChange={(value) =>
              setAccess((current) => ({
                ...current,
                powerType: value,
                roleIds: value === "STAFF" ? current.roleIds : [],
              }))
            }
            onToggleRole={(roleId) =>
              setAccess((current) => ({
                ...current,
                roleIds: current.roleIds.includes(roleId)
                  ? current.roleIds.filter((value) => value !== roleId)
                  : [...current.roleIds, roleId],
              }))
            }
            onSubmit={
              canEditAccess
                ? async () => {
                    await saveAccess();
                  }
                : undefined
            }
            isSubmitting={isSavingAccess}
            disabled={!canEditAccess}
            currentRoleLabel={user.roleLabel}
            submitLabel="Mettre à jour les accès"
          />

          <PersonalDetailsPreviewAndAvatar
            state={{
              avatarMediaId: profile.avatarMediaId,
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: credentials.email || user.email,
              jobTitle: profile.jobTitle,
              phone: profile.phone,
              birthDate: profile.birthDate,
            }}
            onAvatarMediaIdChange={(value) =>
              setField("avatarMediaId", value)
            }
          />

          {canBan ? (
            <Panel
              pretitle="Moderation"
              title={isBanned ? "Reactivation" : "Bannissement"}
              description={
                isBanned
                  ? "Réautorisez ce compte pour qu'il retrouve l'accès au portail."
                  : "Bloquez ce compte pour lui retirer l'accès au portail."
              }
            >
              <p className="text-sm leading-6 text-slate-500">
                Statut actuel :{" "}
                <span className="font-semibold text-slate-700">
                  {statusLabel}
                </span>
              </p>

              {isBanned && user.banDetails?.summary ? (
                <p className="text-sm leading-6 text-slate-500">
                  Motif principal :{" "}
                  <span className="font-semibold text-slate-700">
                    {user.banDetails.summary}
                  </span>
                </p>
              ) : null}

              <AnimatedUIButton
                type="button"
                onClick={() => void handleBanToggle()}
                loading={isSavingBan}
                loadingText="Enregistrement..."
                variant="light"
                icon={isBanned ? "badge-check" : "warning"}
                iconPosition="left"
                className={`w-full ${
                  isBanned
                    ? "border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100"
                    : "border-amber-200 bg-amber-50 hover:border-amber-300 hover:bg-amber-100"
                }`}
                textClassName={isBanned ? "text-emerald-700" : "text-amber-700"}
              >
                {isBanned ? "Réautoriser le compte" : "Bannir le compte"}
              </AnimatedUIButton>
            </Panel>
          ) : null}

          {canDelete ? (
            <Panel
              pretitle="Danger"
              title="Suppression du compte"
              description="Cette action est définitive et ne peut pas être annulée."
            >
              <p className="text-sm leading-6 text-slate-500">
                Supprimez ce compte uniquement si vous êtes certain qu&apos;il ne doit plus exister dans le portail staff.
              </p>

              <AnimatedUIButton
                type="button"
                onClick={() => void handleDelete()}
                loading={isDeleting}
                loadingText="Suppression..."
                variant="light"
                icon="delete"
                iconPosition="left"
                className="w-full border-red-200 bg-red-50 hover:border-red-300 hover:bg-red-100"
                textClassName="text-red-700"
              >
                Supprimer le compte
              </AnimatedUIButton>
            </Panel>
          ) : null}
        </div>
      </div>

      {user ? (
        <UserBanDialog
          key={`${user.id}:${user.bannedAt ?? "draft"}:${isBanDialogOpen ? "open" : "closed"}`}
          open={isBanDialogOpen}
          email={user.email}
          isSubmitting={isSavingBan}
          initialDetails={user.banDetails}
          onClose={() => setIsBanDialogOpen(false)}
          onConfirm={async (input) => {
            const updated = await saveBan(input);
            if (updated) {
              setIsBanDialogOpen(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}
