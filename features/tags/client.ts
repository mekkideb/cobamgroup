"use client";

import { staffApiFetch } from "@/lib/api/auth/staff/api-fetch";
import type {
  TagCreateInput,
  TagDetailDto,
  TagListResult,
  TagSuggestionResult,
  TagUpdateInput,
} from "./types";

type ApiOk<T> = { ok: true } & T;
type ApiFail = { ok: false; message?: string };

type TagListResponse = ApiOk<TagListResult> | ApiFail;
type TagDetailResponse = ApiOk<{ tag: TagDetailDto }> | ApiFail;
type TagSuggestionsResponse = ApiOk<TagSuggestionResult> | ApiFail;
type TagDeleteResponse = ApiOk<Record<string, never>> | ApiFail;

export class TagsClientError extends Error {
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
}) {
  const search = new URLSearchParams();

  if (params.page != null) {
    search.set("page", String(params.page));
  }
  if (params.pageSize != null) {
    search.set("pageSize", String(params.pageSize));
  }
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  return search.toString();
}

export async function listTagsClient(params: {
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<TagListResult> {
  const query = buildListParams(params);

  const res = await staffApiFetch(`/api/staff/tags${query ? `?${query}` : ""}`, {
    method: "GET",
    auth: true,
  });

  const data = await parseJsonSafe<TagListResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new TagsClientError(
      getErrorMessage(data) || "Erreur lors du chargement des tags",
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

export async function listTagSuggestionsClient(params: {
  q?: string;
  limit?: number;
}): Promise<TagSuggestionResult> {
  const search = new URLSearchParams();

  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  if (params.limit != null) {
    search.set("limit", String(params.limit));
  }

  const res = await staffApiFetch(
    `/api/staff/tags/suggest${search.toString() ? `?${search.toString()}` : ""}`,
    {
      method: "GET",
      auth: true,
    },
  );

  const data = await parseJsonSafe<TagSuggestionsResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new TagsClientError(
      getErrorMessage(data) ||
        "Erreur lors du chargement des suggestions de tags",
      res.status,
    );
  }

  return {
    items: data.items,
  };
}

export async function getTagByIdClient(tagId: number): Promise<TagDetailDto> {
  const res = await staffApiFetch(`/api/staff/tags/${tagId}`, {
    method: "GET",
    auth: true,
  });

  const data = await parseJsonSafe<TagDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.tag) {
    throw new TagsClientError(
      getErrorMessage(data) || "Erreur lors du chargement du tag",
      res.status,
    );
  }

  return data.tag;
}

export async function createTagClient(
  input: TagCreateInput,
): Promise<TagDetailDto> {
  const res = await staffApiFetch("/api/staff/tags", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<TagDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.tag) {
    throw new TagsClientError(
      getErrorMessage(data) || "Erreur lors de la création du tag",
      res.status,
    );
  }

  return data.tag;
}

export async function updateTagClient(
  tagId: number,
  input: TagUpdateInput,
): Promise<TagDetailDto> {
  const res = await staffApiFetch(`/api/staff/tags/${tagId}`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<TagDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.tag) {
    throw new TagsClientError(
      getErrorMessage(data) || "Erreur lors de la mise à jour du tag",
      res.status,
    );
  }

  return data.tag;
}

export async function deleteTagClient(tagId: number): Promise<void> {
  const res = await staffApiFetch(`/api/staff/tags/${tagId}`, {
    method: "DELETE",
    auth: true,
  });

  const data = await parseJsonSafe<TagDeleteResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new TagsClientError(
      getErrorMessage(data) || "Erreur lors de la suppression du tag",
      res.status,
    );
  }
}
