"use client";

import { staffApiFetch } from "@/lib/api/auth/staff/api-fetch";
import type {
  ProductCreateInput,
  ProductDetailDto,
  ProductFormOptionsDto,
  ProductListResult,
  ProductUpdateInput,
} from "./types";

type ApiOk<T> = { ok: true } & T;
type ApiFail = { ok: false; message?: string };

type ProductListResponse = ApiOk<ProductListResult> | ApiFail;
type ProductDetailResponse = ApiOk<{ product: ProductDetailDto }> | ApiFail;
type ProductOptionsResponse =
  | ApiOk<{ options: ProductFormOptionsDto }>
  | ApiFail;
type ProductDeleteResponse = ApiOk<Record<string, never>> | ApiFail;

export class ProductsClientError extends Error {
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

function getApiErrorMessage(data: unknown): string | undefined {
  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message;
  }

  return undefined;
}

function buildListParams(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  brandId?: number;
  productSubcategoryId?: number;
}) {
  const search = new URLSearchParams();

  if (params.page != null) search.set("page", String(params.page));
  if (params.pageSize != null) search.set("pageSize", String(params.pageSize));
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.brandId != null) search.set("brandId", String(params.brandId));
  if (params.productSubcategoryId != null) {
    search.set("productSubcategoryId", String(params.productSubcategoryId));
  }

  return search.toString();
}

export async function listProductsClient(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  brandId?: number;
  productSubcategoryId?: number;
}): Promise<ProductListResult> {
  const query = buildListParams(params);

  const res = await staffApiFetch(
    `/api/staff/products${query ? `?${query}` : ""}`,
    { method: "GET", auth: true },
  );

  const data = await parseJsonSafe<ProductListResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new ProductsClientError(
      getApiErrorMessage(data) || "Erreur lors du chargement des produits",
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

export async function getProductFormOptionsClient(): Promise<ProductFormOptionsDto> {
  const res = await staffApiFetch("/api/staff/products/options", {
    method: "GET",
    auth: true,
  });

  const data = await parseJsonSafe<ProductOptionsResponse>(res);

  if (!res.ok || !data?.ok || !data.options) {
    throw new ProductsClientError(
      getApiErrorMessage(data) || "Erreur lors du chargement des options produit",
      res.status,
    );
  }

  return data.options;
}

export async function getProductByIdClient(
  productId: number,
): Promise<ProductDetailDto> {
  const res = await staffApiFetch(`/api/staff/products/${productId}`, {
    method: "GET",
    auth: true,
  });

  const data = await parseJsonSafe<ProductDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.product) {
    throw new ProductsClientError(
      getApiErrorMessage(data) || "Erreur lors du chargement du produit",
      res.status,
    );
  }

  return data.product;
}

export async function createProductClient(
  input: ProductCreateInput,
): Promise<ProductDetailDto> {
  const res = await staffApiFetch("/api/staff/products", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<ProductDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.product) {
    throw new ProductsClientError(
      getApiErrorMessage(data) || "Erreur lors de la création du produit",
      res.status,
    );
  }

  return data.product;
}

export async function updateProductClient(
  productId: number,
  input: ProductUpdateInput,
): Promise<ProductDetailDto> {
  const res = await staffApiFetch(`/api/staff/products/${productId}`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<ProductDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.product) {
    throw new ProductsClientError(
      getApiErrorMessage(data) || "Erreur lors de la mise à jour du produit",
      res.status,
    );
  }

  return data.product;
}

export async function deleteProductClient(productId: number): Promise<void> {
  const res = await staffApiFetch(`/api/staff/products/${productId}`, {
    method: "DELETE",
    auth: true,
  });

  const data = await parseJsonSafe<ProductDeleteResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new ProductsClientError(
      getApiErrorMessage(data) || "Erreur lors de la suppression du produit",
      res.status,
    );
  }
}
