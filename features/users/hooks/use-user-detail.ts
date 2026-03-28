"use client";

import { useCallback, useEffect, useState } from "react";
import type { PowerType } from "@/features/rbac/roles";
import {
  deleteUserClient,
  getUserByIdClient,
  updateUserAccessClient,
  updateUserBanClient,
  updateUserCredentialsClient,
  updateUserProfileClient,
  UsersClientError,
} from "../client";
import type {
  StaffUserDetailDto,
  UpdateStaffUserBanInput,
  UpdateStaffUserProfileInput,
} from "../types";

type ProfileState = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  birthDate: string;
  avatarMediaId: number | null;
  bio: string;
};

type CredentialsState = {
  email: string;
  password: string;
  passwordConfirm: string;
};

type AccessState = {
  powerType: PowerType;
  roleIds: string[];
};

function toProfileState(user: StaffUserDetailDto | null): ProfileState {
  const profile = user?.profile;
  return {
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    jobTitle: profile?.jobTitle ?? "",
    phone: profile?.phone ?? "",
    birthDate: profile?.birthDate ? profile.birthDate.slice(0, 10) : "",
    avatarMediaId: profile?.avatarMediaId ?? null,
    bio: profile?.bio ?? "",
  };
}

function toProfilePayload(state: ProfileState): UpdateStaffUserProfileInput {
  return {
    firstName: state.firstName.trim() || null,
    lastName: state.lastName.trim() || null,
    jobTitle: state.jobTitle.trim() || null,
    phone: state.phone.trim() || null,
    birthDate: state.birthDate.trim() || null,
    avatarMediaId: state.avatarMediaId,
    bio: state.bio.trim() || null,
  };
}

function toAccessState(user: StaffUserDetailDto | null): AccessState {
  return {
    powerType: user?.powerType ?? "STAFF",
    roleIds: user?.assignedRoles.map((role) => role.id) ?? [],
  };
}

export function useUserDetail(userId: string | null) {
  const [user, setUser] = useState<StaffUserDetailDto | null>(null);
  const [profile, setProfile] = useState<ProfileState>(toProfileState(null));
  const [credentials, setCredentials] = useState<CredentialsState>({
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [access, setAccess] = useState<AccessState>(toAccessState(null));

  const [isLoading, setIsLoading] = useState(!!userId);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [isSavingBan, setIsSavingBan] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetched = await getUserByIdClient(userId);
      setUser(fetched);
      setProfile(toProfileState(fetched));
      setAccess(toAccessState(fetched));
      setCredentials({
        email: fetched.email,
        password: "",
        passwordConfirm: "",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement de l'utilisateur";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = useCallback(
    <K extends keyof ProfileState>(key: K, value: ProfileState[K]) => {
      setProfile((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setCredentialField = useCallback(
    <K extends keyof CredentialsState>(key: K, value: CredentialsState[K]) => {
      setCredentials((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const saveProfile = useCallback(async () => {
    if (!userId) return null;

    setIsSavingProfile(true);
    setError(null);
    setNotice(null);

    try {
      const updated = await updateUserProfileClient(
        userId,
        toProfilePayload(profile),
      );
      setUser(updated);
      setProfile(toProfileState(updated));
      setAccess(toAccessState(updated));
      setNotice("Profil mis à jour.");
      return updated;
    } catch (err: unknown) {
      const message =
        err instanceof UsersClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur lors de la mise à jour du profil";
      setError(message);
      return null;
    } finally {
      setIsSavingProfile(false);
    }
  }, [profile, userId]);

  const saveAccess = useCallback(async () => {
    if (!userId) return null;

    setIsSavingAccess(true);
    setError(null);
    setNotice(null);

    try {
      const updated = await updateUserAccessClient(userId, access);
      setUser(updated);
      setProfile(toProfileState(updated));
      setAccess(toAccessState(updated));
      setNotice("Accès mis à jour.");
      return updated;
    } catch (err: unknown) {
      const message =
        err instanceof UsersClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur lors de la mise à jour des accès";
      setError(message);
      return null;
    } finally {
      setIsSavingAccess(false);
    }
  }, [access, userId]);

  const saveCredentials = useCallback(async () => {
    if (!userId) return null;

    if (credentials.password && credentials.password !== credentials.passwordConfirm) {
      setError("Les mots de passe ne correspondent pas");
      return null;
    }

    if (!credentials.email && !credentials.password) {
      setError("Aucune modification à enregistrer");
      return null;
    }

    setIsSavingCredentials(true);
    setError(null);
    setNotice(null);

    try {
      const payload: { email?: string; password?: string } = {};

      if (credentials.email && credentials.email !== user?.email) {
        payload.email = credentials.email.trim().toLowerCase();
      }

      if (credentials.password) {
        payload.password = credentials.password;
      }

      const updated = await updateUserCredentialsClient(userId, payload);
      setUser(updated);
      setProfile(toProfileState(updated));
      setAccess(toAccessState(updated));
      setCredentials({
        email: updated.email,
        password: "",
        passwordConfirm: "",
      });
      setNotice("Identifiants mis à jour.");
      return updated;
    } catch (err: unknown) {
      const message =
        err instanceof UsersClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur lors de la mise à jour des identifiants";
      setError(message);
      return null;
    } finally {
      setIsSavingCredentials(false);
    }
  }, [credentials, user?.email, userId]);

  const saveBan = useCallback(
    async (input: UpdateStaffUserBanInput) => {
      if (!userId) return null;

      setIsSavingBan(true);
      setError(null);
      setNotice(null);

      try {
        const updated = await updateUserBanClient(userId, input);
        setUser(updated);
        setProfile(toProfileState(updated));
        setAccess(toAccessState(updated));
        setCredentials((prev) => ({ ...prev, email: updated.email }));
        setNotice(input.banned ? "Compte banni." : "Compte réactivé.");
        return updated;
      } catch (err: unknown) {
        const message =
          err instanceof UsersClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Erreur lors de la mise à jour du statut";
        setError(message);
        return null;
      } finally {
        setIsSavingBan(false);
      }
    },
    [userId],
  );

  const deleteUser = useCallback(async () => {
    if (!userId) return false;

    setIsDeleting(true);
    setError(null);
    setNotice(null);

    try {
      await deleteUserClient(userId);
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof UsersClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur lors de la suppression de l'utilisateur";
      setError(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [userId]);

  return {
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
    reload: load,
    saveProfile,
    saveAccess,
    saveCredentials,
    saveBan,
    deleteUser,
  };
}
