"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteProductClient,
  getProductByIdClient,
  getProductFormOptionsClient,
  ProductsClientError,
  updateProductClient,
} from "../client";
import {
  createEmptyProductAttributeEditorState,
  createEmptyProductVariantEditorState,
  createEmptyProductEditorFormState,
  duplicateProductVariantEditorState,
  moveProductVariantEditorStates,
  productDetailToFormState,
  productEditorFormToPayload,
  syncVariantAttributeValueEditorStates,
  type ProductEditorFormState,
} from "../form";
import {
  EMPTY_PRODUCT_FORM_OPTIONS,
  type ProductDetailDto,
  type ProductFormOptionsDto,
} from "../types";

type EditableField = keyof ProductEditorFormState;

export function useProductDetail(productId: number | null) {
  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [form, setForm] = useState<ProductEditorFormState>(
    createEmptyProductEditorFormState(),
  );
  const [savedForm, setSavedForm] = useState<ProductEditorFormState>(
    createEmptyProductEditorFormState(),
  );
  const [options, setOptions] = useState<ProductFormOptionsDto>(
    EMPTY_PRODUCT_FORM_OPTIONS,
  );
  const [isLoading, setIsLoading] = useState(Boolean(productId));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [fetchedProduct, fetchedOptions] = await Promise.all([
        getProductByIdClient(productId),
        getProductFormOptionsClient(),
      ]);

      const normalizedOptions =
        fetchedProduct.brand == null ||
        fetchedOptions.brands.some(
          (brand) => brand.id === fetchedProduct.brand?.id,
        )
        ? fetchedOptions
        : {
            ...fetchedOptions,
            brands: [...fetchedOptions.brands, fetchedProduct.brand].sort(
              (left, right) => left.name.localeCompare(right.name, "fr"),
            ),
          };

      const missingProductSubcategories = fetchedProduct.productSubcategories.filter(
        (subcategory) =>
          !normalizedOptions.productSubcategories.some(
            (option) => option.id === subcategory.id,
          ),
      );

      const normalizedProductSubcategories =
        missingProductSubcategories.length === 0
          ? normalizedOptions.productSubcategories
          : [
              ...normalizedOptions.productSubcategories,
              ...missingProductSubcategories,
            ].sort((left, right) => {
              const categoryDelta = left.categoryName.localeCompare(
                right.categoryName,
                "fr",
              );

              if (categoryDelta !== 0) {
                return categoryDelta;
              }

              return left.name.localeCompare(right.name, "fr");
            });

      const nextForm = productDetailToFormState(fetchedProduct);
      setProduct(fetchedProduct);
      setForm(nextForm);
      setSavedForm(nextForm);
      setOptions({
        ...normalizedOptions,
        productSubcategories: normalizedProductSubcategories,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors du chargement du produit";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = useCallback(
    (field: EditableField, value: ProductEditorFormState[EditableField]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const save = useCallback(async () => {
    if (!productId) return null;

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const updated = await updateProductClient(
        productId,
        productEditorFormToPayload(form),
      );
      const nextForm = productDetailToFormState(updated);
      setProduct(updated);
      setForm(nextForm);
      setSavedForm(nextForm);
      setNotice("Famille produit mise à jour.");
      return updated;
    } catch (err: unknown) {
      const message =
        err instanceof ProductsClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur lors de la mise à jour de la famille produit";
      setError(message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [form, productId]);

  const remove = useCallback(async () => {
    if (!productId) return false;

    setIsDeleting(true);
    setError(null);
    setNotice(null);

    try {
      await deleteProductClient(productId);
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof ProductsClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur lors de la suppression de la famille produit";
      setError(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [productId]);

  const addVariant = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        createEmptyProductVariantEditorState({
          lifecycleStatus: prev.lifecycleStatus,
          visibility: prev.visibility,
          attributeValues: syncVariantAttributeValueEditorStates(
            prev.attributes,
            [],
          ),
        }),
      ],
    }));
  }, []);

  const addAttribute = useCallback(() => {
    setForm((prev) => {
      const nextAttributes = [
        ...prev.attributes,
        createEmptyProductAttributeEditorState({
          sortOrder: String(prev.attributes.length),
        }),
      ];

      return {
        ...prev,
        attributes: nextAttributes,
        variants: prev.variants.map((variant) => ({
          ...variant,
          attributeValues: syncVariantAttributeValueEditorStates(
            nextAttributes,
            variant.attributeValues,
          ),
        })),
      };
    });
  }, []);

  const removeAttribute = useCallback((formKey: string) => {
    setForm((prev) => {
      const nextAttributes = prev.attributes.filter(
        (attribute) => attribute.formKey !== formKey,
      );

      return {
        ...prev,
        attributes: nextAttributes,
        variants: prev.variants.map((variant) => ({
          ...variant,
          attributeValues: syncVariantAttributeValueEditorStates(
            nextAttributes,
            variant.attributeValues,
          ),
        })),
      };
    });
  }, []);

  const setAttributeField = useCallback(
    <Field extends keyof ProductEditorFormState["attributes"][number]>(
      formKey: string,
      field: Field,
      value: ProductEditorFormState["attributes"][number][Field],
    ) => {
      setForm((prev) => {
        const nextAttributes = prev.attributes.map((attribute) =>
          attribute.formKey === formKey
            ? { ...attribute, [field]: value }
            : attribute,
        );

        return {
          ...prev,
          attributes: nextAttributes,
          variants:
            field === "dataType"
              ? prev.variants.map((variant) => ({
                  ...variant,
                  attributeValues: syncVariantAttributeValueEditorStates(
                    nextAttributes,
                    variant.attributeValues.map((attributeValue) =>
                      attributeValue.attributeFormKey === formKey
                        ? { ...attributeValue, value: "" }
                        : attributeValue,
                    ),
                  ),
                }))
              : prev.variants.map((variant) => ({
                  ...variant,
                  attributeValues: syncVariantAttributeValueEditorStates(
                    nextAttributes,
                    variant.attributeValues,
                  ),
                })),
        };
      });
    },
    [],
  );

  const removeVariant = useCallback((formKey: string) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((variant) => variant.formKey !== formKey),
    }));
  }, []);

  const duplicateVariant = useCallback((formKey: string) => {
    setForm((prev) => {
      const sourceVariant = prev.variants.find(
        (variant) => variant.formKey === formKey,
      );

      if (!sourceVariant) {
        return prev;
      }

      const insertIndex = prev.variants.findIndex(
        (variant) => variant.formKey === formKey,
      );
      const duplicatedVariant = duplicateProductVariantEditorState(sourceVariant);
      const nextVariants = [...prev.variants];
      nextVariants.splice(insertIndex + 1, 0, duplicatedVariant);

      return {
        ...prev,
        variants: nextVariants,
      };
    });
  }, []);

  const moveVariant = useCallback((formKey: string, direction: "up" | "down") => {
    setForm((prev) => ({
      ...prev,
      variants: moveProductVariantEditorStates(prev.variants, formKey, direction),
    }));
  }, []);

  const setVariantField = useCallback(
    <Field extends keyof ProductEditorFormState["variants"][number]>(
      formKey: string,
      field: Field,
      value: ProductEditorFormState["variants"][number][Field],
    ) => {
      setForm((prev) => ({
        ...prev,
        variants: prev.variants.map((variant) =>
          variant.formKey === formKey ? { ...variant, [field]: value } : variant,
        ),
      }));
    },
    [],
  );

  const setVariantAttributeValue = useCallback(
    (formKey: string, attributeFormKey: string, value: string) => {
      setForm((prev) => ({
        ...prev,
        variants: prev.variants.map((variant) =>
          variant.formKey === formKey
            ? {
                ...variant,
                attributeValues: variant.attributeValues.map((attributeValue) =>
                  attributeValue.attributeFormKey === attributeFormKey
                    ? { ...attributeValue, value }
                    : attributeValue,
                ),
              }
            : variant,
        ),
      }));
    },
    [],
  );

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm],
  );

  return {
    product,
    form,
    isDirty,
    options,
    isLoading,
    isSaving,
    isDeleting,
    error,
    notice,
    setField,
    addAttribute,
    removeAttribute,
    setAttributeField,
    addVariant,
    removeVariant,
    duplicateVariant,
    moveVariant,
    setVariantField,
    setVariantAttributeValue,
    save,
    remove,
    reload: load,
  };
}
