"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BrandsClientError,
  createBrandClient,
  deleteBrandClient,
  getBrandByIdClient,
  updateBrandClient,
} from "../client";
import { slugifyBrandName } from "../slug";
import type {
  BrandCreateInput,
  BrandDetailDto,
  BrandShowcasePlacement,
  BrandUpdateInput,
} from "../types";

export type BrandFormState = {
  name: string;
  slug: string;
  description: string;
  logoMediaId: number | null;
  showcasePlacement: BrandShowcasePlacement;
  isProductBrand: boolean;
};

function toFormState(brand: BrandDetailDto | null): BrandFormState {
  return {
    name: brand?.name ?? "",
    slug: brand?.slug ?? "",
    description: brand?.description ?? "",
    logoMediaId: brand?.logoMediaId ?? null,
    showcasePlacement: brand?.showcasePlacement ?? "NONE",
    isProductBrand: brand?.isProductBrand ?? true,
  };
}

function toPayload(state: BrandFormState): BrandCreateInput | BrandUpdateInput {
  return {
    name: state.name.trim(),
    slug: state.slug.trim() || slugifyBrandName(state.name),
    description: state.description.trim() || null,
    logoMediaId: state.logoMediaId,
    showcasePlacement: state.showcasePlacement,
    isProductBrand: state.isProductBrand,
  };
}

export function useBrandEditor(brandId: number | null) {
  const [brand, setBrand] = useState<BrandDetailDto | null>(null);
  const [form, setForm] = useState<BrandFormState>(toFormState(null));
  const [savedForm, setSavedForm] = useState<BrandFormState>(toFormState(null));
  const [isLoading, setIsLoading] = useState(Boolean(brandId));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!brandId) {
      const emptyForm = toFormState(null);
      setBrand(null);
      setForm(emptyForm);
      setSavedForm(emptyForm);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetched = await getBrandByIdClient(brandId);
      const nextForm = toFormState(fetched);
      setBrand(fetched);
      setForm(nextForm);
      setSavedForm(nextForm);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement de la marque";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = useCallback(
    <K extends keyof BrandFormState>(key: K, value: BrandFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const payload = toPayload(form);
      const saved = brandId
        ? await updateBrandClient(brandId, payload)
        : await createBrandClient(payload);

      const nextForm = toFormState(saved);
      setBrand(saved);
      setForm(nextForm);
      setSavedForm(nextForm);
      setNotice(brandId ? "Marque mise à jour." : "Marque créée.");
      return saved;
    } catch (err: unknown) {
      const message =
        err instanceof BrandsClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : brandId
              ? "Erreur lors de la mise à jour de la marque"
              : "Erreur lors de la création de la marque";
      setError(message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [brandId, form]);

  const remove = useCallback(async () => {
    if (!brandId) return false;

    setIsDeleting(true);
    setError(null);
    setNotice(null);

    try {
      await deleteBrandClient(brandId);
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof BrandsClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur lors de la suppression de la marque";
      setError(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [brandId]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm],
  );

  return {
    brand,
    form,
    isDirty,
    isLoading,
    isSaving,
    isDeleting,
    error,
    notice,
    setField,
    save,
    remove,
    reload: load,
  };
}
