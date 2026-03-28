"use client";

import { staffApiFetch } from "@/lib/api/auth/staff/api-fetch";
import type {
  BrandCreateInput,
  BrandDetailDto,
  BrandListResult,
  BrandUpdateInput,
} from "./types";

type ApiOk<T> = { ok: true } & T;
type ApiFail = { ok: false; message?: string };

type BrandListResponse = ApiOk<BrandListResult> | ApiFail;
type BrandDetailResponse = ApiOk<{ brand: BrandDetailDto }> | ApiFail;
type BrandDeleteResponse = ApiOk<Record<string, never>> | ApiFail;

export class BrandsClientError extends Error {
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

export async function listBrandsClient(params: {
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<BrandListResult> {
  const query = buildListParams(params);

  const res = await staffApiFetch(
    `/api/staff/brands${query ? `?${query}` : ""}`,
    { method: "GET", auth: true },
  );

  const data = await parseJsonSafe<BrandListResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new BrandsClientError(
      getErrorMessage(data) || "Erreur lors du chargement des marques",
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

export async function getBrandByIdClient(brandId: number): Promise<BrandDetailDto> {
  const res = await staffApiFetch(`/api/staff/brands/${brandId}`, {
    method: "GET",
    auth: true,
  });

  const data = await parseJsonSafe<BrandDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.brand) {
    throw new BrandsClientError(
      getErrorMessage(data) || "Erreur lors du chargement de la marque",
      res.status,
    );
  }

  return data.brand;
}

export async function createBrandClient(
  input: BrandCreateInput,
): Promise<BrandDetailDto> {
  const res = await staffApiFetch("/api/staff/brands", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<BrandDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.brand) {
    throw new BrandsClientError(
      getErrorMessage(data) || "Erreur lors de la création de la marque",
      res.status,
    );
  }

  return data.brand;
}

export async function updateBrandClient(
  brandId: number,
  input: BrandUpdateInput,
): Promise<BrandDetailDto> {
  const res = await staffApiFetch(`/api/staff/brands/${brandId}`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe<BrandDetailResponse>(res);

  if (!res.ok || !data?.ok || !data.brand) {
    throw new BrandsClientError(
      getErrorMessage(data) || "Erreur lors de la mise à jour de la marque",
      res.status,
    );
  }

  return data.brand;
}

export async function deleteBrandClient(brandId: number): Promise<void> {
  const res = await staffApiFetch(`/api/staff/brands/${brandId}`, {
    method: "DELETE",
    auth: true,
  });

  const data = await parseJsonSafe<BrandDeleteResponse>(res);

  if (!res.ok || !data?.ok) {
    throw new BrandsClientError(
      getErrorMessage(data) || "Erreur lors de la suppression de la marque",
      res.status,
    );
  }
}

