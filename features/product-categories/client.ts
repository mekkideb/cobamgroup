"use client";

import { staffApiFetch } from "@/lib/api/auth/staff/api-fetch";
import type {
  ProductCategoryCreateInput,
  ProductCategoryDetailDto,
  ProductCategoryListResult,
  ProductCategoryUpdateInput,
} from "./types";

type ApiOk<T> = { ok: true } & T;
type ApiFail = { ok: false; message?: string };

type ProductCategoryListResponse = ApiOk<ProductCategoryListResult> | ApiFail;
type ProductCategoryDetailResponse =
  | ApiOk<{ category: ProductCategoryDetailDto }>
  | ApiFail;
type ProductCategoryDeleteResponse = ApiOk<Record<string, never>> | ApiFail;

export class ProductCategoriesClientError extends Error {
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
  tree?: boolean;
}) {
  const search = new URLSearchParams();

  if (params.page != null) search.set("page", String(params.page));
  if (params.pageSize != null) search.set("pageSize", String(params.pageSize));
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.tree) search.set("tree", "1");

  return search.toString();
}

export async function listProductCategoriesClient(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  tree?: boolean;
}): Promise<ProductCategoryListResult> {
  const query = buildListParams(params);

  const res = await staffApiFetch(
    `/api/staff/product-categories${query ? `?${query}` : ""}`,
    { method: "GET", auth: true },
  );

  const data = await parseJsonSafe<ProductCategoryListResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new ProductCategoriesClientError(
      getErrorMessage(data) ||
        "Erreur lors du chargement des catégories produit",
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

export async function getProductCategoryByIdClient(
  categoryId: number,
): Promise<ProductCategoryDetailDto> {
  const res = await staffApiFetch(`/api/staff/product-categories/${categoryId}`, {
    method: "GET",
    auth: true,
  });

  const data = await parseJsonSafe<ProductCategoryDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.category) {
    throw new ProductCategoriesClientError(
      getErrorMessage(data) ||
        "Erreur lors du chargement de la catégorie produit",
      res.status,
    );
  }

  return data.category;
}

export async function createProductCategoryClient(
  input: ProductCategoryCreateInput,
): Promise<ProductCategoryDetailDto> {
  const res = await staffApiFetch("/api/staff/product-categories", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<ProductCategoryDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.category) {
    throw new ProductCategoriesClientError(
      getErrorMessage(data) ||
        "Erreur lors de la création de la catégorie produit",
      res.status,
    );
  }

  return data.category;
}

export async function updateProductCategoryClient(
  categoryId: number,
  input: ProductCategoryUpdateInput,
): Promise<ProductCategoryDetailDto> {
  const res = await staffApiFetch(`/api/staff/product-categories/${categoryId}`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<ProductCategoryDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.category) {
    throw new ProductCategoriesClientError(
      getErrorMessage(data) ||
        "Erreur lors de la mise à jour de la catégorie produit",
      res.status,
    );
  }

  return data.category;
}

export async function deleteProductCategoryClient(
  categoryId: number,
): Promise<void> {
  const res = await staffApiFetch(`/api/staff/product-categories/${categoryId}`, {
    method: "DELETE",
    auth: true,
  });

  const data = await parseJsonSafe<ProductCategoryDeleteResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new ProductCategoriesClientError(
      getErrorMessage(data) ||
        "Erreur lors de la suppression de la catégorie produit",
      res.status,
    );
  }
}
