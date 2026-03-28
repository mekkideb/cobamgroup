"use client";

import { staffApiFetch } from "@/lib/api/auth/staff/api-fetch";
import type {
  ArticleCategoryDeleteResult,
  ArticleCategoryDetailDto,
  ArticleCategoryListResult,
  ArticleCategoryMutationInput,
  ArticleCategoryOptionDto,
} from "./types";

type ApiOk<T> = { ok: true } & T;
type ApiFail = { ok: false; message?: string };

type ArticleCategoryListResponse = ApiOk<ArticleCategoryListResult> | ApiFail;
type ArticleCategoryDetailResponse =
  | ApiOk<{ category: ArticleCategoryDetailDto }>
  | ApiFail;
type ArticleCategoryDeleteResponse =
  | ApiOk<ArticleCategoryDeleteResult>
  | ApiFail;
type ArticleCategoryOptionsResponse =
  | ApiOk<{ items: ArticleCategoryOptionDto[] }>
  | ApiFail;

export class ArticleCategoriesClientError extends Error {
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

  if (params.page != null) search.set("page", String(params.page));
  if (params.pageSize != null) search.set("pageSize", String(params.pageSize));
  if (params.q?.trim()) search.set("q", params.q.trim());

  return search.toString();
}

export async function listArticleCategoriesClient(params: {
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<ArticleCategoryListResult> {
  const query = buildListParams(params);
  const res = await staffApiFetch(
    `/api/staff/article-categories${query ? `?${query}` : ""}`,
    {
      method: "GET",
      auth: true,
    },
  );

  const data = await parseJsonSafe<ArticleCategoryListResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new ArticleCategoriesClientError(
      getErrorMessage(data) ||
        "Erreur lors du chargement des categories d'articles",
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

export async function getArticleCategoryByIdClient(
  categoryId: number,
): Promise<ArticleCategoryDetailDto> {
  const res = await staffApiFetch(`/api/staff/article-categories/${categoryId}`, {
    method: "GET",
    auth: true,
  });

  const data = await parseJsonSafe<ArticleCategoryDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.category) {
    throw new ArticleCategoriesClientError(
      getErrorMessage(data) ||
        "Erreur lors du chargement de la categorie d'articles",
      res.status,
    );
  }

  return data.category;
}

export async function createArticleCategoryClient(
  input: ArticleCategoryMutationInput,
): Promise<ArticleCategoryDetailDto> {
  const res = await staffApiFetch("/api/staff/article-categories", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<ArticleCategoryDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.category) {
    throw new ArticleCategoriesClientError(
      getErrorMessage(data) ||
        "Erreur lors de la création de la catégorie d'articles",
      res.status,
    );
  }

  return data.category;
}

export async function updateArticleCategoryClient(
  categoryId: number,
  input: ArticleCategoryMutationInput,
): Promise<ArticleCategoryDetailDto> {
  const res = await staffApiFetch(`/api/staff/article-categories/${categoryId}`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<ArticleCategoryDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.category) {
    throw new ArticleCategoriesClientError(
      getErrorMessage(data) ||
        "Erreur lors de la mise à jour de la catégorie d'articles",
      res.status,
    );
  }

  return data.category;
}

export async function deleteArticleCategoryClient(
  categoryId: number,
  options: { force?: boolean } = {},
): Promise<ArticleCategoryDeleteResult> {
  const search = new URLSearchParams();

  if (options.force) {
    search.set("force", "true");
  }

  const res = await staffApiFetch(
    `/api/staff/article-categories/${categoryId}${search.toString() ? `?${search.toString()}` : ""}`,
    {
      method: "DELETE",
      auth: true,
    },
  );

  const data = await parseJsonSafe<ArticleCategoryDeleteResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new ArticleCategoriesClientError(
      getErrorMessage(data) ||
        "Erreur lors de la suppression de la categorie d'articles",
      res.status,
    );
  }

  return {
    detachedArticlesCount: data.detachedArticlesCount,
  };
}

export async function listArticleCategoryOptionsClient(): Promise<
  ArticleCategoryOptionDto[]
> {
  const res = await staffApiFetch("/api/staff/article-categories/options", {
    method: "GET",
    auth: true,
  });

  const data = await parseJsonSafe<ArticleCategoryOptionsResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new ArticleCategoriesClientError(
      getErrorMessage(data) ||
        "Erreur lors du chargement des options de categories d'articles",
      res.status,
    );
  }

  return data.items;
}
