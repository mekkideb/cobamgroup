import { PERMISSION_DEFINITIONS, type PermissionKey } from "@/features/rbac/permissions";
import type { RoleMutationInput } from "./types";

export class RoleValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function slugifyRoleKey(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
}

const permissionKeys = new Set<PermissionKey>(
  PERMISSION_DEFINITIONS.map((definition) => definition.key),
);

function parsePermissions(value: unknown): PermissionKey[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(
    value.filter(
      (item): item is PermissionKey =>
        typeof item === "string" && permissionKeys.has(item as PermissionKey),
    ),
  )];
}

export function parseRoleIdParam(idParam: string): string {
  const id = String(idParam ?? "").trim();
  if (!id) {
    throw new RoleValidationError("Invalid role id");
  }
  return id;
}

export function parseRoleMutationInput(raw: unknown): RoleMutationInput {
  if (!isRecord(raw)) {
    throw new RoleValidationError("Invalid request body");
  }

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) {
    throw new RoleValidationError("Le nom du rôle est requis.");
  }

  const rawKey = typeof raw.key === "string" && raw.key.trim() ? raw.key : name;
  const key = slugifyRoleKey(rawKey);
  if (!key) {
    throw new RoleValidationError("La clé du rôle est invalide.");
  }

  const color = typeof raw.color === "string" ? raw.color.trim() : "";
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new RoleValidationError("La couleur doit être au format hex (#RRGGBB).");
  }

  const priorityIndex = Number(raw.priorityIndex);
  if (!Number.isInteger(priorityIndex) || priorityIndex < 0) {
    throw new RoleValidationError("L'ordre de priorité est invalide.");
  }

  const permissions = parsePermissions(raw.permissions);
  if (permissions.length === 0) {
    throw new RoleValidationError("Veuillez sélectionner au moins une permission.");
  }

  return {
    key,
    name,
    color: color.toLowerCase(),
    priorityIndex,
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description.trim()
        : null,
    permissions,
    isActive: typeof raw.isActive === "boolean" ? raw.isActive : true,
  };
}

export function parseRoleReorderInput(raw: unknown): string[] {
  if (!isRecord(raw)) {
    throw new RoleValidationError("Invalid request body");
  }

  const orderedRoleIds = Array.isArray(raw.orderedRoleIds)
    ? raw.orderedRoleIds
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

  if (orderedRoleIds.length === 0) {
    throw new RoleValidationError("L'ordre des rôles est invalide.");
  }

  if (new Set(orderedRoleIds).size !== orderedRoleIds.length) {
    throw new RoleValidationError("L'ordre des rôles contient des doublons.");
  }

  return orderedRoleIds;
}
