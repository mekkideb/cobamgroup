"use client";

import { staffApiFetch } from "@/lib/api/auth/staff/api-fetch";
import type {
  CreateStaffUserInput,
  StaffUserDetailDto,
  StaffUsersListResult,
  UpdateStaffUserAccessInput,
  UpdateStaffUserBanInput,
  UpdateStaffUserCredentialsInput,
  UpdateStaffUserProfileInput,
} from "./types";

type ApiOk<T> = { ok: true } & T;
type ApiFail = { ok: false; message?: string };

type UsersListResponse = ApiOk<StaffUsersListResult> | ApiFail;
type UserDetailResponse = ApiOk<{ user: StaffUserDetailDto }> | ApiFail;
type UserCreateResponse = ApiOk<{ user: StaffUserDetailDto }> | ApiFail;
type UserDeleteResponse = ApiOk<Record<string, never>> | ApiFail;

export class UsersClientError extends Error {
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

function buildListParams(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  roleKey?: string;
  powerType?: string;
}) {
  const search = new URLSearchParams();

  if (params.page != null) search.set("page", String(params.page));
  if (params.pageSize != null) search.set("pageSize", String(params.pageSize));
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.roleKey) search.set("roleKey", params.roleKey);
  if (params.powerType) search.set("powerType", params.powerType);

  return search.toString();
}

export async function listUsersClient(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  roleKey?: string;
  powerType?: string;
}): Promise<StaffUsersListResult> {
  const query = buildListParams(params);

  const res = await staffApiFetch(
    `/api/staff/users${query ? `?${query}` : ""}`,
    { method: "GET", auth: true },
  );

  const data = await parseJsonSafe<UsersListResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new UsersClientError(
      getErrorMessage(data) || "Erreur lors du chargement des utilisateurs",
      res.status,
    );
  }

  return {
    items: data.items,
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
  };
}

export async function getUserByIdClient(
  userId: string,
): Promise<StaffUserDetailDto> {
  const res = await staffApiFetch(`/api/staff/users/${userId}`, {
    method: "GET",
    auth: true,
  });

  const data = await parseJsonSafe<UserDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.user) {
    throw new UsersClientError(
      getErrorMessage(data) || "Erreur lors du chargement de l'utilisateur",
      res.status,
    );
  }

  return data.user;
}

export async function updateUserProfileClient(
  userId: string,
  input: UpdateStaffUserProfileInput,
): Promise<StaffUserDetailDto> {
  const res = await staffApiFetch(`/api/staff/users/${userId}`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<UserDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.user) {
    throw new UsersClientError(
      getErrorMessage(data) || "Erreur lors de la mise à jour du profil",
      res.status,
    );
  }

  return data.user;
}

export async function updateUserAccessClient(
  userId: string,
  input: UpdateStaffUserAccessInput,
): Promise<StaffUserDetailDto> {
  const res = await staffApiFetch(`/api/staff/users/${userId}/role`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<UserDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.user) {
    throw new UsersClientError(
      getErrorMessage(data) || "Erreur lors de la mise à jour des accès",
      res.status,
    );
  }

  return data.user;
}

export async function updateUserCredentialsClient(
  userId: string,
  input: UpdateStaffUserCredentialsInput,
): Promise<StaffUserDetailDto> {
  const res = await staffApiFetch(`/api/staff/users/${userId}/credentials`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<UserDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.user) {
    throw new UsersClientError(
      getErrorMessage(data) || "Erreur lors de la mise à jour des identifiants",
      res.status,
    );
  }

  return data.user;
}

export async function createUserClient(
  input: CreateStaffUserInput,
): Promise<StaffUserDetailDto> {
  const res = await staffApiFetch(`/api/staff/users`, {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<UserCreateResponse>(res);

  if (!res.ok || !data?.ok || !data.user) {
    throw new UsersClientError(
      getErrorMessage(data) || "Erreur lors de la création de l'utilisateur",
      res.status,
    );
  }

  return data.user;
}

export async function deleteUserClient(userId: string): Promise<void> {
  const res = await staffApiFetch(`/api/staff/users/${userId}`, {
    method: "DELETE",
    auth: true,
  });

  const data = await parseJsonSafe<UserDeleteResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new UsersClientError(
      getErrorMessage(data) || "Erreur lors de la suppression de l'utilisateur",
      res.status,
    );
  }
}

export async function updateUserBanClient(
  userId: string,
  input: UpdateStaffUserBanInput,
): Promise<StaffUserDetailDto> {
  const res = await staffApiFetch(`/api/staff/users/${userId}/ban`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<UserDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.user) {
    throw new UsersClientError(
      getErrorMessage(data) || "Erreur lors de la mise à jour du statut",
      res.status,
    );
  }

  return data.user;
}
