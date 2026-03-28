"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteProductCategoryClient,
  getProductCategoryByIdClient,
  ProductCategoriesClientError,
  updateProductCategoryClient,
} from "../client";
import {
  createEmptyProductCategoryEditorFormState,
  productCategoryDetailToFormState,
  productCategoryEditorFormToPayload,
  type ProductCategoryEditorFormState,
} from "../form";
import type { ProductCategoryDetailDto } from "../types";

export function useProductCategoryDetail(categoryId: number | null) {
  const [category, setCategory] = useState<ProductCategoryDetailDto | null>(null);
  const [form, setForm] = useState<ProductCategoryEditorFormState>(
    createEmptyProductCategoryEditorFormState(),
  );
  const [savedForm, setSavedForm] = useState<ProductCategoryEditorFormState>(
    createEmptyProductCategoryEditorFormState(),
  );
  const [isLoading, setIsLoading] = useState(Boolean(categoryId));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!categoryId) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetchedCategory = await getProductCategoryByIdClient(categoryId);
      const nextForm = productCategoryDetailToFormState(fetchedCategory);
      setCategory(fetchedCategory);
      setForm(nextForm);
      setSavedForm(nextForm);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement de la catégorie produit";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = useCallback(
    <K extends keyof ProductCategoryEditorFormState>(
      key: K,
      value: ProductCategoryEditorFormState[K],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const save = useCallback(async () => {
    if (!categoryId) return null;

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const updated = await updateProductCategoryClient(
        categoryId,
        productCategoryEditorFormToPayload(form),
      );
      const nextForm = productCategoryDetailToFormState(updated);
      setCategory(updated);
      setForm(nextForm);
      setSavedForm(nextForm);
      setNotice("Catégorie produit mise à jour.");
      return updated;
    } catch (err: unknown) {
      const message =
        err instanceof ProductCategoriesClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur lors de la mise à jour de la catégorie produit";
      setError(message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [categoryId, form]);

  const remove = useCallback(async () => {
    if (!categoryId) return false;

    setIsDeleting(true);
    setError(null);
    setNotice(null);

    try {
      await deleteProductCategoryClient(categoryId);
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof ProductCategoriesClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur lors de la suppression de la catégorie produit";
      setError(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [categoryId]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm],
  );

  return {
    category,
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
