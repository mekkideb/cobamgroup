"use client";

import { staffApiFetch } from "@/lib/api/auth/staff/api-fetch";
import type { RoleDetailDto, RoleMutationInput, RolesListResult } from "./types";

type ApiOk<T> = { ok: true } & T;
type ApiFail = { ok: false; message?: string };

export class RolesClientError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function getErrorMessage(data: ApiFail | ApiOk<unknown> | null | undefined) {
  return data && "message" in data ? data.message : undefined;
}

export async function listRolesClient(): Promise<RolesListResult> {
  const res = await staffApiFetch("/api/staff/roles", {
    method: "GET",
    auth: true,
  });
  const data = await parseJsonSafe<ApiOk<RolesListResult> | ApiFail>(res);

  if (!res.ok || !data?.ok) {
    throw new RolesClientError(
      getErrorMessage(data) || "Erreur lors du chargement des rôles",
      res.status,
    );
  }

  return { items: data.items, total: data.total };
}

export async function getRoleByIdClient(roleId: string): Promise<RoleDetailDto> {
  const res = await staffApiFetch(`/api/staff/roles/${roleId}`, {
    method: "GET",
    auth: true,
  });
  const data = await parseJsonSafe<ApiOk<{ role: RoleDetailDto }> | ApiFail>(
    res,
  );

  if (!res.ok || !data?.ok || !data.role) {
    throw new RolesClientError(
      getErrorMessage(data) || "Erreur lors du chargement du rôle",
      res.status,
    );
  }

  return data.role;
}

export async function createRoleClient(
  input: RoleMutationInput,
): Promise<RoleDetailDto> {
  const res = await staffApiFetch("/api/staff/roles", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonSafe<ApiOk<{ role: RoleDetailDto }> | ApiFail>(
    res,
  );

  if (!res.ok || !data?.ok || !data.role) {
    throw new RolesClientError(
      getErrorMessage(data) || "Erreur lors de la création du rôle",
      res.status,
    );
  }

  return data.role;
}

export async function updateRoleClient(
  roleId: string,
  input: RoleMutationInput,
): Promise<RoleDetailDto> {
  const res = await staffApiFetch(`/api/staff/roles/${roleId}`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonSafe<ApiOk<{ role: RoleDetailDto }> | ApiFail>(
    res,
  );

  if (!res.ok || !data?.ok || !data.role) {
    throw new RolesClientError(
      getErrorMessage(data) || "Erreur lors de la mise à jour du rôle",
      res.status,
    );
  }

  return data.role;
}

export async function deleteRoleClient(roleId: string): Promise<void> {
  const res = await staffApiFetch(`/api/staff/roles/${roleId}`, {
    method: "DELETE",
    auth: true,
  });
  const data = await parseJsonSafe<ApiOk<Record<string, never>> | ApiFail>(res);

  if (!res.ok || !data?.ok) {
    throw new RolesClientError(
      getErrorMessage(data) || "Erreur lors de la suppression du rôle",
      res.status,
    );
  }
}

export async function reorderRolesClient(
  orderedRoleIds: string[],
): Promise<RolesListResult> {
  const res = await staffApiFetch("/api/staff/roles/reorder", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedRoleIds }),
  });
  const data = await parseJsonSafe<ApiOk<RolesListResult> | ApiFail>(res);

  if (!res.ok || !data?.ok) {
    throw new RolesClientError(
      getErrorMessage(data) || "Erreur lors du réordonnancement des rôles",
      res.status,
    );
  }

  return { items: data.items, total: data.total };
}
