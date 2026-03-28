"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteTagClient,
  getTagByIdClient,
  TagsClientError,
  updateTagClient,
} from "../client";
import type { TagDetailDto, TagUpdateInput } from "../types";

type TagFormState = {
  name: string;
  slug: string;
};

function toFormState(tag: TagDetailDto | null): TagFormState {
  return {
    name: tag?.name ?? "",
    slug: tag?.slug ?? "",
  };
}

function toPayload(state: TagFormState): TagUpdateInput {
  return {
    name: state.name.trim(),
    slug: state.slug.trim(),
  };
}

export function useTagDetail(tagId: number | null) {
  const [tag, setTag] = useState<TagDetailDto | null>(null);
  const [form, setForm] = useState<TagFormState>(toFormState(null));
  const [isLoading, setIsLoading] = useState(Boolean(tagId));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tagId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetched = await getTagByIdClient(tagId);
      setTag(fetched);
      setForm(toFormState(fetched));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors du chargement du tag";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [tagId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = useCallback(
    <K extends keyof TagFormState>(key: K, value: TagFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const save = useCallback(async () => {
    if (!tagId) {
      return null;
    }

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const updated = await updateTagClient(tagId, toPayload(form));
      setTag(updated);
      setForm(toFormState(updated));
      setNotice("Tag mis à jour.");
      return updated;
    } catch (err: unknown) {
      const message =
        err instanceof TagsClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur lors de la mise à jour du tag";
      setError(message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [form, tagId]);

  const remove = useCallback(async () => {
    if (!tagId) {
      return false;
    }

    setIsDeleting(true);
    setError(null);
    setNotice(null);

    try {
      await deleteTagClient(tagId);
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof TagsClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur lors de la suppression du tag";
      setError(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [tagId]);

  return {
    tag,
    form,
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
