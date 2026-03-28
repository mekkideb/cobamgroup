"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package } from "lucide-react";
import { toast } from "sonner";
import ProductEditorPanels from "@/components/staff/products/ProductEditorPanels";
import Loading from "@/components/staff/Loading";
import Panel from "@/components/staff/ui/Panel";
import {
  StaffNotice,
  StaffPageHeader,
  StaffStateCard,
  UnsavedChangesGuard,
} from "@/components/staff/ui";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { useStaffSessionContext } from "@/features/auth/client/staff-session-provider";
import { canCreateProducts, canManageProducts } from "@/features/products/access";
import {
  createProductClient,
  getProductFormOptionsClient,
  ProductsClientError,
} from "@/features/products/client";
import {
  createEmptyProductAttributeEditorState,
  createEmptyProductVariantEditorState,
  createEmptyProductEditorFormState,
  duplicateProductVariantEditorState,
  moveProductVariantEditorStates,
  productEditorFormToPayload,
  syncVariantAttributeValueEditorStates,
  type ProductEditorFormState,
} from "@/features/products/form";
import { useProductDetail } from "@/features/products/hooks/use-product-detail";
import {
  EMPTY_PRODUCT_FORM_OPTIONS,
  type ProductFormOptionsDto,
} from "@/features/products/types";

type EditableField = keyof ProductEditorFormState;
type EditableAttributeField = keyof ProductEditorFormState["attributes"][number];

export default function ProductEditPage() {
  return (
    <Suspense fallback={<ProductEditorLoading />}>
      <ProductEditPageContent />
    </Suspense>
  );
}

function ProductEditPageContent() {
  const searchParams = useSearchParams();

  const productId = useMemo(() => {
    const raw = searchParams.get("id");

    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  if (productId) {
    return <ExistingProductEditor productId={productId} />;
  }

  return <NewProductEditor />;
}

function NewProductEditor() {
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading } = useStaffSessionContext();
  const canCreateProduct = authUser ? canCreateProducts(authUser) : false;

  const [initialForm] = useState<ProductEditorFormState>(() =>
    createEmptyProductEditorFormState(),
  );
  const [form, setForm] = useState<ProductEditorFormState>(initialForm);
  const [options, setOptions] = useState<ProductFormOptionsDto>(
    EMPTY_PRODUCT_FORM_OPTIONS,
  );
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm],
  );

  useEffect(() => {
    if (isAuthLoading || !canCreateProduct) {
      if (!isAuthLoading) {
        setIsLoadingOptions(false);
      }
      return;
    }

    let cancelled = false;
    setIsLoadingOptions(true);

    void (async () => {
      try {
        const nextOptions = await getProductFormOptionsClient();
        if (!cancelled) {
          setOptions(nextOptions);
        }
      } catch (err: unknown) {
        const message =
          err instanceof ProductsClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Erreur lors du chargement des options produit";
        if (!cancelled) {
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOptions(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canCreateProduct, isAuthLoading]);

  const setField = (
    field: EditableField,
    value: ProductEditorFormState[EditableField],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleVariantAdd = () => {
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
  };

  const handleAttributeAdd = () => {
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
  };

  const handleAttributeRemove = (formKey: string) => {
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
  };

  const handleAttributeChange = <Field extends EditableAttributeField>(
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
  };

  const handleVariantRemove = (formKey: string) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((variant) => variant.formKey !== formKey),
    }));
  };

  const handleVariantDuplicate = (formKey: string) => {
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
  };

  const handleVariantMove = (formKey: string, direction: "up" | "down") => {
    setForm((prev) => ({
      ...prev,
      variants: moveProductVariantEditorStates(prev.variants, formKey, direction),
    }));
  };

  const handleVariantAttributeValueChange = (
    formKey: string,
    attributeFormKey: string,
    value: string,
  ) => {
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
  };

  const handleVariantChange = <
    Field extends keyof ProductEditorFormState["variants"][number],
  >(
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
  };

  const handleSave = async () => {
    if (!canCreateProduct) {
      toast.error("Accès refusé");
      return false;
    }

    setIsSaving(true);

    try {
      const product = await createProductClient(productEditorFormToPayload(form));
      toast.success("Famille produit créée.");
      router.replace(
        `/espace/staff/gestion-des-produits/produits/edit?id=${product.id}`,
      );
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof ProductsClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur lors de la création de la famille produit";
      toast.error(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isLoadingOptions) {
    return <ProductEditorLoading />;
  }

  if (!canCreateProduct) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-cobam-dark-blue">
          Accès refusé
        </h1>
        <p className="mb-4 text-sm text-slate-600">
          Vous n&apos;avez pas l&apos;autorisation de créer une famille produit.
        </p>
        <Link
          href="/espace/staff/gestion-des-produits/produits"
          className="inline-flex items-center gap-2 rounded-xl bg-cobam-dark-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cobam-water-blue"
        >
          Retour
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UnsavedChangesGuard isDirty={isDirty} onSaveAndContinue={handleSave} />

      <StaffPageHeader
        backHref="/espace/staff/gestion-des-produits/produits"
        eyebrow="Produits"
        title="Création d'une famille produit"
        icon={Package}
      />

      <ProductEditorPanels
        mode="create"
        form={form}
        options={options}
        isSaving={isSaving}
        onFieldChange={setField}
        onAttributeAdd={handleAttributeAdd}
        onAttributeRemove={handleAttributeRemove}
        onAttributeChange={handleAttributeChange}
        onVariantAdd={handleVariantAdd}
        onVariantRemove={handleVariantRemove}
        onVariantDuplicate={handleVariantDuplicate}
        onVariantMove={handleVariantMove}
        onVariantChange={handleVariantChange}
        onVariantAttributeValueChange={handleVariantAttributeValueChange}
        onSave={() => void handleSave()}
        disableSave={isLoadingOptions}
      />
    </div>
  );
}

function ExistingProductEditor({ productId }: { productId: number }) {
  const router = useRouter();
  const { user: authUser } = useStaffSessionContext();
  const canDelete = !!authUser && canManageProducts(authUser);

  const {
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
  } = useProductDetail(productId);

  useEffect(() => {
    if (notice) {
      toast.success(notice);
    }
  }, [notice]);

  useEffect(() => {
    if (error && product) {
      toast.error(error);
    }
  }, [error, product]);

  const handleDelete = async () => {
    if (!product) return;

    const confirmed = window.confirm(
      `Supprimer la famille produit ${product.name} ? Toutes ses variantes seront supprimées en même temps.`,
    );
    if (!confirmed) return;

    const deleted = await remove();
    if (deleted) {
      toast.success("Famille produit supprimée.");
      router.replace("/espace/staff/gestion-des-produits/produits");
    }
  };

  if (isLoading) {
    return <ProductEditorLoading />;
  }

  if (error && !product) {
    return (
      <StaffStateCard
        title="Erreur"
        description={error}
        actionHref="/espace/staff/gestion-des-produits/produits"
        actionLabel="Retour aux produits"
      />
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="space-y-6">
      <UnsavedChangesGuard
        isDirty={isDirty}
        onSaveAndContinue={async () => Boolean(await save())}
      />

      <StaffPageHeader
        backHref="/espace/staff/gestion-des-produits/produits"
        eyebrow="Produits"
        title={product.name}
        icon={Package}
      />

      {error ? (
        <StaffNotice variant="error" title="Modification impossible">
          {error}
        </StaffNotice>
      ) : null}

      <ProductEditorPanels
        mode="edit"
        form={form}
        options={options}
        isSaving={isSaving}
        isDeleting={isDeleting}
        onFieldChange={
          setField as (
            field: EditableField,
            value: ProductEditorFormState[EditableField],
          ) => void
        }
        onAttributeAdd={addAttribute}
        onAttributeRemove={removeAttribute}
        onAttributeChange={setAttributeField}
        onVariantAdd={addVariant}
        onVariantRemove={removeVariant}
        onVariantDuplicate={duplicateVariant}
        onVariantMove={moveVariant}
        onVariantChange={setVariantField}
        onVariantAttributeValueChange={setVariantAttributeValue}
        onSave={() => void save()}
        onDelete={canDelete ? () => void handleDelete() : undefined}
        summary={{
          variantCount: form.variants.length,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        }}
        sidebarFooter={
          canDelete ? (
            <Panel
              pretitle="Danger"
              title="Suppression"
              description="Supprimer la famille retire aussi toutes les variantes qui lui sont rattachées."
            >
              <AnimatedUIButton
                type="button"
                onClick={() => void handleDelete()}
                loading={isDeleting}
                loadingText="Suppression..."
                variant="light"
                icon="delete"
                iconPosition="left"
                className="w-full border-red-200 bg-red-50 hover:border-red-300 hover:bg-red-100"
                textClassName="text-red-700"
                iconClassName="text-red-700"
              >
                Supprimer
              </AnimatedUIButton>
            </Panel>
          ) : null
        }
      />
    </div>
  );
}

function ProductEditorLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <Loading />
      </div>
    </div>
  );
}
