import type { StaffSession } from "@/features/auth/types";
import { hasAnyPermission, hasPermission } from "@/features/rbac/access";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { getAssignableRoles } from "@/features/rbac/roles";
import { createUserAuditLog } from "@/features/users/repository";
import {
  countUsersWithRole,
  createRole,
  deleteRole,
  findRoleById,
  findRoleByKey,
  listRoles,
  reorderRoles,
  updateRole,
} from "./repository";
import type {
  RoleDetailDto,
  RoleMutationInput,
  RolesListResult,
} from "./types";

const RESERVED_ROLE_KEYS = new Set(["ROOT", "ADMIN", "STAFF"]);

export class RoleServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function mapRole(
  role: Awaited<ReturnType<typeof findRoleById>> extends infer T
    ? NonNullable<T>
    : never,
): RoleDetailDto {
  return {
    id: String(role.id),
    key: role.key,
    name: role.name,
    color: role.color,
    priorityIndex: role.priorityIndex,
    description: role.description,
    isActive: role.isActive,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
    permissions: role.permissionLinks.map((link) => link.permission.key),
  };
}

function assertCanCreateRole(session: StaffSession) {
  if (!hasPermission(session, PERMISSIONS.ROLES_CREATE_ALL)) {
    throw new RoleServiceError("Forbidden", 403);
  }
}

function assertCanUpdateRole(session: StaffSession) {
  if (!hasPermission(session, PERMISSIONS.ROLES_UPDATE_ALL)) {
    throw new RoleServiceError("Forbidden", 403);
  }
}

function assertCanDeleteRole(session: StaffSession) {
  if (!hasPermission(session, PERMISSIONS.ROLES_DELETE_ALL)) {
    throw new RoleServiceError("Forbidden", 403);
  }
}

function assertValidRoleKey(key: string) {
  if (RESERVED_ROLE_KEYS.has(key)) {
    throw new RoleServiceError(
      "Cette clé de rôle est réservée au système.",
      400,
    );
  }
}

export async function listRolesService(
  session: StaffSession,
): Promise<RolesListResult> {
  const roles = await listRoles();

  if (hasPermission(session, PERMISSIONS.ROLES_VIEW_ALL)) {
    return {
      items: roles.map((role) => mapRole(role)),
      total: roles.length,
    };
  }

  if (
    hasAnyPermission(session, [
      PERMISSIONS.ROLES_VIEW_BELOW_ROLE,
      PERMISSIONS.ROLES_ASSIGN_BELOW_ROLE,
      PERMISSIONS.USERS_CREATE_BELOW_ROLE,
    ])
  ) {
    const filtered = getAssignableRoles(
      session,
      roles.map((role) => mapRole(role)),
    ).map((role) => ({
      ...role,
      permissions: role.permissions ?? [],
    }));

    return {
      items: filtered,
      total: filtered.length,
    };
  }

  throw new RoleServiceError("Forbidden", 403);
}

export async function getRoleByIdService(
  session: StaffSession,
  roleId: string,
) {
  if (!hasPermission(session, PERMISSIONS.ROLES_VIEW_ALL)) {
    throw new RoleServiceError("Forbidden", 403);
  }

  const role = await findRoleById(roleId);
  if (!role) {
    throw new RoleServiceError("Rôle introuvable.", 404);
  }

  return mapRole(role);
}

export async function createRoleService(
  session: StaffSession,
  input: RoleMutationInput,
) {
  assertCanCreateRole(session);
  assertValidRoleKey(input.key);

  const existing = await findRoleByKey(input.key);
  if (existing) {
    throw new RoleServiceError("Un rôle avec cette clé existe déjà.", 400);
  }

  const role = await createRole({
    ...input,
    description: input.description ?? null,
    isActive: input.isActive ?? true,
  });

  await createUserAuditLog({
    actorUserId: session.id,
    entityId: String(role.id),
    targetLabel: role.name,
    summary: "Création d'un rôle dynamique",
    actionType: "CREATE",
    afterSnapshotJson: mapRole(role),
  });

  return mapRole(role);
}

export async function updateRoleService(
  session: StaffSession,
  roleId: string,
  input: RoleMutationInput,
) {
  assertCanUpdateRole(session);
  assertValidRoleKey(input.key);

  const before = await findRoleById(roleId);
  if (!before) {
    throw new RoleServiceError("Rôle introuvable.", 404);
  }

  const existing = await findRoleByKey(input.key);
  if (existing && String(existing.id) !== roleId) {
    throw new RoleServiceError("Un rôle avec cette clé existe déjà.", 400);
  }

  const role = await updateRole({
    roleId,
    ...input,
    description: input.description ?? null,
    isActive: input.isActive ?? true,
  });

  await createUserAuditLog({
    actorUserId: session.id,
    entityId: String(role.id),
    targetLabel: role.name,
    summary: "Mise à jour d'un rôle dynamique",
    beforeSnapshotJson: mapRole(before),
    afterSnapshotJson: mapRole(role),
  });

  return mapRole(role);
}

export async function reorderRolesService(
  session: StaffSession,
  orderedRoleIds: string[],
) {
  assertCanUpdateRole(session);

  const existingRoles = await listRoles();
  const existingRoleIds = existingRoles.map((role) => String(role.id));

  if (orderedRoleIds.length !== existingRoleIds.length) {
    throw new RoleServiceError("L'ordre des rôles est incomplet.", 400);
  }

  const expectedIds = new Set(existingRoleIds);
  if (orderedRoleIds.some((roleId) => !expectedIds.has(roleId))) {
    throw new RoleServiceError(
      "L'ordre des rôles contient un rôle inconnu.",
      400,
    );
  }

  const reorderedRoles = await reorderRoles(orderedRoleIds);

  return {
    items: reorderedRoles.map((role) => mapRole(role)),
    total: reorderedRoles.length,
  };
}

export async function deleteRoleService(
  session: StaffSession,
  roleId: string,
) {
  assertCanDeleteRole(session);

  const before = await findRoleById(roleId);
  if (!before) {
    throw new RoleServiceError("Rôle introuvable.", 404);
  }

  const affectedUsers = await countUsersWithRole(roleId);
  const deleted = await deleteRole(roleId);

  await createUserAuditLog({
    actorUserId: session.id,
    entityId: String(deleted.id),
    targetLabel: deleted.name,
    summary: `Suppression d'un rôle dynamique (${affectedUsers} utilisateur(s) impacté(s))`,
    actionType: "DELETE",
    beforeSnapshotJson: mapRole(before),
  });
}
