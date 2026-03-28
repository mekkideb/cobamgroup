import type { StaffSession } from "@/features/auth/types";
import { findImageMediaById } from "@/features/media/repository";
import { hasAnyPermission, hasPermission } from "@/features/rbac/access";
import { PERMISSIONS } from "@/features/rbac/permissions";
import {
  canAffectTargetUser,
  canAssignRole,
  canSetAdminPowerType,
  getRoleLabel,
  isTargetBelowActor,
} from "@/features/rbac/roles";
import { hashPassword } from "@/lib/api/auth/shared/password";
import { buildBanSummary, serializeBanDetails } from "./ban-details";
import {
  mapUserToDetailDto,
  mapUserToListItemDto,
  toUserAuditSnapshot,
} from "./mappers";
import {
  countArticlesByAuthor,
  countUsers,
  createUser,
  createUserAuditLog,
  deleteUserWithAudit,
  findRolesByIds,
  findUserByEmail,
  findUserById,
  listUsers,
  listUsersForScope,
  updateUserAccess,
  updateUserBanState,
  updateUserCredentials,
  upsertUserProfile,
} from "./repository";
import type {
  CreateStaffUserInput,
  StaffUsersListQuery,
  StaffUsersListResult,
  UpdateStaffUserAccessInput,
  UpdateStaffUserBanInput,
  UpdateStaffUserCredentialsInput,
  UpdateStaffUserProfileInput,
} from "./types";

export class UserServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function canViewNonBannedUsersAll(session: StaffSession) {
  return hasPermission(session, PERMISSIONS.USERS_VIEW_NON_BANNED_ALL);
}

function canViewNonBannedUsersBelowRole(session: StaffSession) {
  return hasPermission(session, PERMISSIONS.USERS_VIEW_NON_BANNED_BELOW_ROLE);
}

function canViewBannedUsersAll(session: StaffSession) {
  return hasPermission(session, PERMISSIONS.USERS_VIEW_BANNED_ALL);
}

function canViewBannedUsersBelowRole(session: StaffSession) {
  return hasPermission(session, PERMISSIONS.USERS_VIEW_BANNED_BELOW_ROLE);
}

function canViewUsers(session: StaffSession) {
  return hasAnyPermission(session, [
    PERMISSIONS.USERS_VIEW_NON_BANNED_ALL,
    PERMISSIONS.USERS_VIEW_NON_BANNED_BELOW_ROLE,
    PERMISSIONS.USERS_VIEW_BANNED_ALL,
    PERMISSIONS.USERS_VIEW_BANNED_BELOW_ROLE,
  ]);
}

function canViewUser(session: StaffSession, target: ReturnType<typeof mapUserToDetailDto>) {
  if (session.id === target.id) {
    return true;
  }

  if (target.status === "BANNED") {
    return (
      canViewBannedUsersAll(session) ||
      (canViewBannedUsersBelowRole(session) && isTargetBelowActor(session, target))
    );
  }

  return (
    canViewNonBannedUsersAll(session) ||
    (canViewNonBannedUsersBelowRole(session) && isTargetBelowActor(session, target))
  );
}

function canUpdateOwnProfile(session: StaffSession, targetUserId: string) {
  return (
    session.id === targetUserId &&
    hasPermission(session, PERMISSIONS.ACCOUNT_UPDATE_SELF)
  );
}

function canUpdateOwnCredentials(session: StaffSession, targetUserId: string) {
  return (
    session.id === targetUserId &&
    hasPermission(session, PERMISSIONS.ACCOUNT_CREDENTIALS_UPDATE_SELF)
  );
}

function canManageOtherProfile(
  session: StaffSession,
  target: ReturnType<typeof mapUserToDetailDto>,
) {
  return (
    hasPermission(session, PERMISSIONS.USERS_UPDATE_PROFILE_ALL) ||
    (hasPermission(session, PERMISSIONS.USERS_UPDATE_PROFILE_BELOW_ROLE) &&
      canAffectTargetUser(session, target))
  );
}

function canManageOtherCredentials(
  session: StaffSession,
  target: ReturnType<typeof mapUserToDetailDto>,
) {
  return (
    hasPermission(session, PERMISSIONS.USERS_UPDATE_CREDENTIALS_ALL) ||
    (hasPermission(session, PERMISSIONS.USERS_UPDATE_CREDENTIALS_BELOW_ROLE) &&
      canAffectTargetUser(session, target))
  );
}

async function validateRoleAssignment(
  session: StaffSession,
  powerType: UpdateStaffUserAccessInput["powerType"] | CreateStaffUserInput["powerType"],
  roleIds: string[],
) {
  if (powerType === "ROOT") {
    throw new UserServiceError(
      "Le statut Root ne peut pas être attribué depuis l'interface.",
      400,
    );
  }

  if (powerType === "ADMIN" && !canSetAdminPowerType(session.powerType)) {
    throw new UserServiceError("Seul Root peut attribuer le statut Admin.", 403);
  }

  if (powerType === "ADMIN" && roleIds.length > 0) {
    throw new UserServiceError(
      "Les comptes Admin n'utilisent pas de rôles dynamiques.",
      400,
    );
  }

  if (roleIds.length > 0 && !hasPermission(session, PERMISSIONS.ROLES_ASSIGN_BELOW_ROLE)) {
    throw new UserServiceError("Vous ne pouvez pas attribuer de rôles.", 403);
  }

  const roles = await findRolesByIds(roleIds);
  if (roles.length !== [...new Set(roleIds)].length) {
    throw new UserServiceError("Au moins un rôle est introuvable ou inactif.", 400);
  }

  for (const role of roles) {
    if (
      !canAssignRole(session, {
        id: String(role.id),
        key: role.key,
        name: role.name,
        color: role.color,
        priorityIndex: role.priorityIndex,
        description: role.description,
        isActive: role.isActive,
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
      })
    ) {
      throw new UserServiceError(
        "Vous ne pouvez attribuer qu'un rôle situé sous votre rôle effectif.",
        403,
      );
    }
  }

  return roles;
}

async function assertValidAvatarMedia(avatarMediaId: number | null | undefined) {
  if (avatarMediaId == null) {
    return;
  }

  const media = await findImageMediaById(avatarMediaId);
  if (!media) {
    throw new UserServiceError("L'avatar sélectionné est introuvable ou invalide.", 400);
  }
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export async function listUsersService(
  session: StaffSession,
  query: StaffUsersListQuery,
): Promise<StaffUsersListResult> {
  if (!canViewUsers(session)) {
    throw new UserServiceError("Forbidden", 403);
  }

  const includeBanned =
    canViewBannedUsersAll(session) || canViewBannedUsersBelowRole(session);
  const canViewAll =
    canViewNonBannedUsersAll(session) || canViewBannedUsersAll(session);

  if (canViewAll) {
    const [items, total] = await Promise.all([
      listUsers(query, { includeBanned }),
      countUsers(query, { includeBanned }),
    ]);
    return {
      items: items.map(mapUserToListItemDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  const scopedUsers = await listUsersForScope(
    { ...query, page: 1, pageSize: 50 },
    { includeBanned },
  );

  const filtered = scopedUsers
    .map(mapUserToListItemDto)
    .filter((target) => {
      if (target.status === "BANNED") {
        return (
          canViewBannedUsersBelowRole(session) &&
          isTargetBelowActor(session, target)
        );
      }

      return (
        canViewNonBannedUsersBelowRole(session) &&
        isTargetBelowActor(session, target)
      );
    });

  return {
    items: paginate(filtered, query.page, query.pageSize),
    total: filtered.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getUserByIdService(
  session: StaffSession,
  userId: string,
) {
  const user = await findUserById(userId);
  if (!user) {
    throw new UserServiceError("Utilisateur introuvable", 404);
  }

  const mappedUser = mapUserToDetailDto(user);

  if (!canViewUser(session, mappedUser)) {
    throw new UserServiceError("Forbidden", 403);
  }

  return mappedUser;
}

export async function updateUserProfileService(
  session: StaffSession,
  userId: string,
  input: UpdateStaffUserProfileInput,
) {
  const before = await findUserById(userId);
  if (!before) {
    throw new UserServiceError("Utilisateur introuvable", 404);
  }

  const mappedBefore = mapUserToDetailDto(before);
  const isSelf = canUpdateOwnProfile(session, userId);
  const canManageOther = canManageOtherProfile(session, mappedBefore);

  if (!isSelf && !canManageOther) {
    throw new UserServiceError("Forbidden", 403);
  }

  await assertValidAvatarMedia(input.avatarMediaId);

  const after = await upsertUserProfile(userId, input);
  if (!after) {
    throw new UserServiceError("Utilisateur introuvable", 404);
  }

  await createUserAuditLog({
    actorUserId: session.id,
    entityId: after.id,
    targetLabel: after.email,
    summary: isSelf
      ? "Mise à jour du profil personnel"
      : "Mise à jour du profil utilisateur",
    beforeSnapshotJson: toUserAuditSnapshot(before),
    afterSnapshotJson: toUserAuditSnapshot(after),
  });

  return mapUserToDetailDto(after);
}

export async function updateUserCredentialsService(
  session: StaffSession,
  userId: string,
  input: UpdateStaffUserCredentialsInput,
) {
  const before = await findUserById(userId);
  if (!before) {
    throw new UserServiceError("Utilisateur introuvable", 404);
  }

  const mappedBefore = mapUserToDetailDto(before);
  const isSelf = canUpdateOwnCredentials(session, userId);
  const canManageOther = canManageOtherCredentials(session, mappedBefore);

  if (!isSelf && !canManageOther) {
    throw new UserServiceError("Forbidden", 403);
  }

  if (input.email) {
    const existing = await findUserByEmail(input.email);
    if (existing && existing.id !== userId) {
      throw new UserServiceError("Email déjà utilisé", 400);
    }
  }

  const passwordHash = input.password
    ? await hashPassword(input.password)
    : undefined;

  const after = await updateUserCredentials({
    userId,
    email: input.email,
    passwordHash,
  });

  await createUserAuditLog({
    actorUserId: session.id,
    entityId: after.id,
    targetLabel: after.email,
    summary:
      input.email && input.password
        ? "Mise à jour des identifiants (email + mot de passe)"
        : input.email
          ? "Mise à jour de l'email"
          : "Mise à jour du mot de passe",
    beforeSnapshotJson: toUserAuditSnapshot(before),
    afterSnapshotJson: toUserAuditSnapshot(after),
  });

  return mapUserToDetailDto(after);
}

export async function createUserService(
  session: StaffSession,
  input: CreateStaffUserInput,
) {
  if (!hasPermission(session, PERMISSIONS.USERS_CREATE_BELOW_ROLE)) {
    throw new UserServiceError("Forbidden", 403);
  }

  await validateRoleAssignment(session, input.powerType ?? "STAFF", input.roleIds);
  await assertValidAvatarMedia(input.profile?.avatarMediaId);

  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new UserServiceError("Email déjà utilisé", 400);
  }

  const passwordHash = await hashPassword(input.password);

  const created = await createUser({
    email: input.email,
    passwordHash,
    powerType: input.powerType ?? "STAFF",
    roleIds: input.roleIds,
    profile: {
      firstName: input.profile?.firstName ?? null,
      lastName: input.profile?.lastName ?? null,
      jobTitle: input.profile?.jobTitle ?? null,
      phone: input.profile?.phone ?? null,
      birthDate: input.profile?.birthDate ?? null,
      avatarMediaId: input.profile?.avatarMediaId ?? null,
      bio: input.profile?.bio ?? null,
    },
  });

  const createdDto = mapUserToDetailDto(created);

  await createUserAuditLog({
    actorUserId: session.id,
    entityId: created.id,
    targetLabel: created.email,
    summary: `Création d'utilisateur (${createdDto.roleLabel})`,
    actionType: "CREATE",
    afterSnapshotJson: toUserAuditSnapshot(created),
  });

  return createdDto;
}

export async function updateUserAccessService(
  session: StaffSession,
  userId: string,
  input: UpdateStaffUserAccessInput,
) {
  if (session.id === userId) {
    throw new UserServiceError(
      "Vous ne pouvez pas modifier vos propres accès.",
      400,
    );
  }

  const before = await findUserById(userId);
  if (!before) {
    throw new UserServiceError("Utilisateur introuvable", 404);
  }

  const beforeDto = mapUserToDetailDto(before);

  if (
    !hasPermission(session, PERMISSIONS.ROLES_ASSIGN_BELOW_ROLE) &&
    !(input.powerType === "ADMIN" && canSetAdminPowerType(session.powerType))
  ) {
    throw new UserServiceError("Forbidden", 403);
  }

  if (!canAffectTargetUser(session, beforeDto)) {
    throw new UserServiceError("Forbidden", 403);
  }

  await validateRoleAssignment(session, input.powerType, input.roleIds);

  const after = await updateUserAccess({
    actorUserId: session.id,
    userId,
    powerType: input.powerType,
    roleIds: input.roleIds,
  });

  const afterDto = mapUserToDetailDto(after);

  await createUserAuditLog({
    actorUserId: session.id,
    entityId: after.id,
    targetLabel: after.email,
    summary: `Mise à jour des accès: ${beforeDto.roleLabel} -> ${afterDto.roleLabel}`,
    beforeSnapshotJson: toUserAuditSnapshot(before),
    afterSnapshotJson: toUserAuditSnapshot(after),
  });

  return afterDto;
}

export async function deleteUserService(
  session: StaffSession,
  userId: string,
) {
  const before = await findUserById(userId);
  if (!before) {
    throw new UserServiceError("Utilisateur introuvable", 404);
  }

  const beforeDto = mapUserToDetailDto(before);
  const isSelf = session.id === userId;

  if (isSelf) {
    throw new UserServiceError(
      "Vous ne pouvez pas supprimer votre propre compte",
      400,
    );
  }

  if (!hasPermission(session, PERMISSIONS.USERS_DELETE_BELOW_ROLE)) {
    throw new UserServiceError("Forbidden", 403);
  }

  if (!canAffectTargetUser(session, beforeDto)) {
    throw new UserServiceError("Forbidden", 403);
  }

  const authoredArticlesCount = await countArticlesByAuthor(userId);
  if (authoredArticlesCount > 0) {
    throw new UserServiceError(
      "Impossible de supprimer ce compte car il possède des articles.",
      400,
    );
  }

  await deleteUserWithAudit({
    actorUserId: session.id,
    userId,
    targetLabel: before.email,
    summary: `Suppression d'utilisateur (${getRoleLabel(beforeDto)})`,
    beforeSnapshotJson: toUserAuditSnapshot(before),
  });
}

export async function updateUserBanService(
  session: StaffSession,
  userId: string,
  input: UpdateStaffUserBanInput,
) {
  const before = await findUserById(userId);
  if (!before) {
    throw new UserServiceError("Utilisateur introuvable", 404);
  }

  const beforeDto = mapUserToDetailDto(before);
  const isSelf = session.id === userId;
  if (isSelf) {
    throw new UserServiceError(
      "Vous ne pouvez pas modifier le statut de votre propre compte",
      400,
    );
  }

  const moderationPermission = input.banned
    ? PERMISSIONS.USERS_BAN_BELOW_ROLE
    : PERMISSIONS.USERS_UNBAN_BELOW_ROLE;

  if (!hasPermission(session, moderationPermission)) {
    throw new UserServiceError("Forbidden", 403);
  }

  if (!canAffectTargetUser(session, beforeDto)) {
    throw new UserServiceError("Forbidden", 403);
  }

  const banSummary = buildBanSummary({
    presetReasonIds: input.presetReasonIds,
    otherReason: input.otherReason,
  });

  if (input.banned && !banSummary) {
    throw new UserServiceError(
      "Veuillez sélectionner au moins un motif de bannissement.",
      400,
    );
  }

  const after = await updateUserBanState({
    userId,
    banned: input.banned,
    reasonJson: input.banned
      ? serializeBanDetails({
          presetReasonIds: input.presetReasonIds,
          otherReason: input.otherReason,
          description: input.description,
        })
      : null,
  });

  await createUserAuditLog({
    actorUserId: session.id,
    entityId: after.id,
    targetLabel: after.email,
    summary: input.banned
      ? `Bannissement du compte (${beforeDto.roleLabel}) - ${banSummary || "Motif non renseigné"}`
      : `Réactivation du compte (${beforeDto.roleLabel})`,
    actionType: input.banned ? "BAN" : "UNBAN",
    beforeSnapshotJson: toUserAuditSnapshot(before),
    afterSnapshotJson: toUserAuditSnapshot(after),
  });

  return mapUserToDetailDto(after);
}
