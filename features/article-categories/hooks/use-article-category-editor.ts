"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArticleCategoriesClientError,
  createArticleCategoryClient,
  deleteArticleCategoryClient,
  getArticleCategoryByIdClient,
  updateArticleCategoryClient,
} from "../client";
import { slugifyArticleCategoryName } from "../slug";
import type {
  ArticleCategoryDeleteResult,
  ArticleCategoryDetailDto,
  ArticleCategoryMutationInput,
} from "../types";

export type ArticleCategoryFormState = {
  name: string;
  slug: string;
  color: string;
};

function normalizeColor(value: string) {
  const normalized = value.trim().toLowerCase();

  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/.test(normalized)) {
    return normalized;
  }

  return "#0a8dc1";
}

function toFormState(
  category: ArticleCategoryDetailDto | null,
): ArticleCategoryFormState {
  return {
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    color: category?.color ?? "#0a8dc1",
  };
}

function toPayload(state: ArticleCategoryFormState): ArticleCategoryMutationInput {
  return {
    name: state.name.trim(),
    slug: state.slug.trim() || slugifyArticleCategoryName(state.name),
    color: normalizeColor(state.color),
  };
}

export function useArticleCategoryEditor(categoryId: number | null) {
  const [category, setCategory] = useState<ArticleCategoryDetailDto | null>(null);
  const [form, setForm] = useState<ArticleCategoryFormState>(toFormState(null));
  const [savedForm, setSavedForm] = useState<ArticleCategoryFormState>(
    toFormState(null),
  );
  const [isLoading, setIsLoading] = useState(Boolean(categoryId));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!categoryId) {
      const emptyForm = toFormState(null);
      setCategory(null);
      setForm(emptyForm);
      setSavedForm(emptyForm);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetched = await getArticleCategoryByIdClient(categoryId);
      const nextForm = toFormState(fetched);
      setCategory(fetched);
      setForm(nextForm);
      setSavedForm(nextForm);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement de la categorie d'articles";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = useCallback(
    <K extends keyof ArticleCategoryFormState>(
      key: K,
      value: ArticleCategoryFormState[K],
    ) => {
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
      const saved = categoryId
        ? await updateArticleCategoryClient(categoryId, payload)
        : await createArticleCategoryClient(payload);

      const nextForm = toFormState(saved);
      setCategory(saved);
      setForm(nextForm);
      setSavedForm(nextForm);
      setNotice(
        categoryId
          ? "Catégorie d'articles mise à jour."
          : "Catégorie d'articles créée.",
      );
      return saved;
    } catch (err: unknown) {
      const message =
        err instanceof ArticleCategoriesClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : categoryId
              ? "Erreur lors de la mise à jour de la catégorie d'articles"
              : "Erreur lors de la création de la catégorie d'articles";
      setError(message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [categoryId, form]);

  const remove = useCallback(
    async (
      options: { force?: boolean } = {},
    ): Promise<ArticleCategoryDeleteResult | null> => {
      if (!categoryId) return null;

      setIsDeleting(true);
      setError(null);
      setNotice(null);

      try {
        return await deleteArticleCategoryClient(categoryId, options);
      } catch (err: unknown) {
        const message =
          err instanceof ArticleCategoriesClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Erreur lors de la suppression de la categorie d'articles";
        setError(message);
        return null;
      } finally {
        setIsDeleting(false);
      }
    },
    [categoryId],
  );

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
