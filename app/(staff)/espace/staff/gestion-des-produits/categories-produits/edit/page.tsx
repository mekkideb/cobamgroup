"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListTree } from "lucide-react";
import { toast } from "sonner";
import Loading from "@/components/staff/Loading";
import ProductCategoryEditorPanels from "@/components/staff/product-categories/ProductCategoryEditorPanels";
import {
  StaffNotice,
  StaffPageHeader,
  StaffStateCard,
  UnsavedChangesGuard,
} from "@/components/staff/ui";
import { useStaffSessionContext } from "@/features/auth/client/staff-session-provider";
import {
  canCreateProductCategories,
  canManageProductCategories,
} from "@/features/product-categories/access";
import {
  createProductCategoryClient,
  ProductCategoriesClientError,
} from "@/features/product-categories/client";
import {
  createEmptyProductCategoryEditorFormState,
  createEmptyProductSubcategoryEditorState,
  productCategoryEditorFormToPayload,
  reindexProductSubcategoryEditorStates,
  type ProductCategoryEditorFormState,
  type ProductSubcategoryEditorState,
} from "@/features/product-categories/form";
import { useProductCategoryDetail } from "@/features/product-categories/hooks/use-product-category-detail";
import { slugifyProductCategoryName } from "@/features/product-categories/slug";

type EditableField = keyof ProductCategoryEditorFormState;
type EditableSubcategoryField = keyof ProductSubcategoryEditorState;

export default function ProductCategoryEditPage() {
  return (
    <Suspense fallback={<ProductCategoryEditorLoading />}>
      <ProductCategoryEditPageContent />
    </Suspense>
  );
}

function ProductCategoryEditPageContent() {
  const searchParams = useSearchParams();
  const categoryId = useMemo(() => {
    const raw = searchParams.get("id");

    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  if (categoryId) {
    return <ExistingProductCategoryEditor categoryId={categoryId} />;
  }

  return <NewProductCategoryEditor />;
}

function NewProductCategoryEditor() {
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading } = useStaffSessionContext();
  const canCreateCategory = authUser
    ? canCreateProductCategories(authUser)
    : false;

  const [initialForm] = useState<ProductCategoryEditorFormState>(() =>
    createEmptyProductCategoryEditorFormState(),
  );
  const [form, setForm] = useState<ProductCategoryEditorFormState>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm],
  );

  const setField = useCallback(
    <K extends keyof ProductCategoryEditorFormState>(
      field: K,
      value: ProductCategoryEditorFormState[K],
    ) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const handleFieldChange = useCallback(
    <K extends EditableField>(
      field: K,
      value: ProductCategoryEditorFormState[K],
    ) => {
      if (field === "name") {
        const nextName = value as ProductCategoryEditorFormState["name"];
        setField("name", nextName);

        if (
          form.slug === "" ||
          form.slug === slugifyProductCategoryName(form.name)
        ) {
          setField("slug", slugifyProductCategoryName(nextName));
        }
        return;
      }

      setField(field, value);
    },
    [form.name, form.slug, setField],
  );

  const handleSubcategoryAdd = useCallback(() => {
    setForm((current) => ({
      ...current,
      subcategories: reindexProductSubcategoryEditorStates([
        createEmptyProductSubcategoryEditorState({
          sortOrder: "0",
        }),
        ...current.subcategories,
      ]),
    }));
  }, []);

  const handleSubcategoryRemove = useCallback((formKey: string) => {
    setForm((current) => ({
      ...current,
      subcategories: reindexProductSubcategoryEditorStates(
        current.subcategories.filter(
          (subcategory) => subcategory.formKey !== formKey,
        ),
      ),
    }));
  }, []);

  const handleSubcategoryChange = useCallback(
    <Field extends EditableSubcategoryField>(
      formKey: string,
      field: Field,
      value: ProductSubcategoryEditorState[Field],
    ) => {
      setForm((current) => ({
        ...current,
        subcategories: current.subcategories.map((subcategory) => {
          if (subcategory.formKey !== formKey) {
            return subcategory;
          }

          if (field === "name") {
            const nextName = value as ProductSubcategoryEditorState["name"];
            const shouldSyncSlug =
              subcategory.slug === "" ||
              subcategory.slug === slugifyProductCategoryName(subcategory.name);

            return {
              ...subcategory,
              name: nextName,
              slug: shouldSyncSlug
                ? slugifyProductCategoryName(nextName)
                : subcategory.slug,
            };
          }

          return {
            ...subcategory,
            [field]: value,
          };
        }),
      }));
    },
    [],
  );

  const handleSave = async () => {
    if (!canCreateCategory) {
      toast.error("Accès refusé.");
      return false;
    }

    const payload = productCategoryEditorFormToPayload(form);

    if (!payload.name || !payload.slug) {
      toast.error("Le nom et le slug sont requis.");
      return false;
    }

    setIsSaving(true);

    try {
      const category = await createProductCategoryClient(payload);
      toast.success("Catégorie produit créée.");
      router.replace(
        `/espace/staff/gestion-des-produits/categories-produits/edit?id=${category.id}`,
      );
      return true;
    } catch (error: unknown) {
      const message =
        error instanceof ProductCategoriesClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Erreur lors de la création de la catégorie produit.";
      toast.error(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading) {
    return <ProductCategoryEditorLoading />;
  }

  if (!canCreateCategory) {
    return (
      <StaffStateCard
        variant="forbidden"
        title="Accès refusé"
        description="Vous n'avez pas l'autorisation de créer une catégorie produit."
        actionHref="/espace/staff/gestion-des-produits/categories-produits"
        actionLabel="Retour aux catégories"
      />
    );
  }

  const payload = productCategoryEditorFormToPayload(form);

  return (
    <div className="space-y-6">
      <UnsavedChangesGuard isDirty={isDirty} onSaveAndContinue={handleSave} />

      <StaffPageHeader
        backHref="/espace/staff/gestion-des-produits/categories-produits"
        eyebrow="Catégories produit"
        title="Nouvelle catégorie"
        icon={ListTree}
      />

      <ProductCategoryEditorPanels
        mode="create"
        form={form}
        isSaving={isSaving}
        onFieldChange={handleFieldChange}
        onSubcategoryAdd={handleSubcategoryAdd}
        onSubcategoryRemove={handleSubcategoryRemove}
        onSubcategoryChange={handleSubcategoryChange}
        onSave={() => void handleSave()}
        disableSave={!payload.name || !payload.slug}
      />
    </div>
  );
}

function ExistingProductCategoryEditor({
  categoryId,
}: {
  categoryId: number;
}) {
  const router = useRouter();
  const { user: authUser } = useStaffSessionContext();
  const canDelete = !!authUser && canManageProductCategories(authUser);

  const {
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
  } = useProductCategoryDetail(categoryId);

  useEffect(() => {
    if (notice) {
      toast.success(notice);
    }
  }, [notice]);

  useEffect(() => {
    if (error && category) {
      toast.error(error);
    }
  }, [category, error]);

  const handleFieldChange = useCallback(
    <K extends EditableField>(
      field: K,
      value: ProductCategoryEditorFormState[K],
    ) => {
      if (field === "name") {
        const nextName = value as ProductCategoryEditorFormState["name"];
        setField("name", nextName);

        if (
          form.slug === "" ||
          form.slug === slugifyProductCategoryName(form.name)
        ) {
          setField("slug", slugifyProductCategoryName(nextName));
        }
        return;
      }

      setField(field, value);
    },
    [form.name, form.slug, setField],
  );

  const handleSubcategoryAdd = useCallback(() => {
    setField(
      "subcategories",
      reindexProductSubcategoryEditorStates([
        createEmptyProductSubcategoryEditorState({
          sortOrder: "0",
        }),
        ...form.subcategories,
      ]),
    );
  }, [form.subcategories, setField]);

  const handleSubcategoryRemove = useCallback(
    (formKey: string) => {
      setField(
        "subcategories",
        reindexProductSubcategoryEditorStates(
          form.subcategories.filter(
            (subcategory) => subcategory.formKey !== formKey,
          ),
        ),
      );
    },
    [form.subcategories, setField],
  );

  const handleSubcategoryChange = useCallback(
    <Field extends EditableSubcategoryField>(
      formKey: string,
      field: Field,
      value: ProductSubcategoryEditorState[Field],
    ) => {
      setField(
        "subcategories",
        form.subcategories.map((subcategory) => {
          if (subcategory.formKey !== formKey) {
            return subcategory;
          }

          if (field === "name") {
            const nextName = value as ProductSubcategoryEditorState["name"];
            const shouldSyncSlug =
              subcategory.slug === "" ||
              subcategory.slug === slugifyProductCategoryName(subcategory.name);

            return {
              ...subcategory,
              name: nextName,
              slug: shouldSyncSlug
                ? slugifyProductCategoryName(nextName)
                : subcategory.slug,
            };
          }

          return {
            ...subcategory,
            [field]: value,
          };
        }),
      );
    },
    [form.subcategories, setField],
  );

  const handleDelete = async () => {
    if (!category) {
      return;
    }

    const confirmed = window.confirm(
      `Supprimer la catégorie ${category.name} ?`,
    );

    if (!confirmed) {
      return;
    }

    const deleted = await remove();
    if (deleted) {
      toast.success("Catégorie produit supprimée.");
      router.replace("/espace/staff/gestion-des-produits/categories-produits");
    }
  };

  if (isLoading) {
    return <ProductCategoryEditorLoading />;
  }

  if (error && !category) {
    return (
      <StaffStateCard
        title="Erreur"
        description={error}
        actionHref="/espace/staff/gestion-des-produits/categories-produits"
        actionLabel="Retour aux catégories"
      />
    );
  }

  if (!category) {
    return null;
  }

  return (
    <div className="space-y-6">
      <UnsavedChangesGuard
        isDirty={isDirty}
        onSaveAndContinue={async () => Boolean(await save())}
      />

      <StaffPageHeader
        backHref="/espace/staff/gestion-des-produits/categories-produits"
        eyebrow="Catégories produit"
        title={category.name}
        icon={ListTree}
      />

      {error ? (
        <StaffNotice variant="error" title="Modification impossible">
          {error}
        </StaffNotice>
      ) : null}

      <ProductCategoryEditorPanels
        mode="edit"
        form={form}
        isSaving={isSaving}
        isDeleting={isDeleting}
        onFieldChange={handleFieldChange}
        onSubcategoryAdd={handleSubcategoryAdd}
        onSubcategoryRemove={handleSubcategoryRemove}
        onSubcategoryChange={handleSubcategoryChange}
        onSave={() => void save()}
        onDelete={canDelete ? () => void handleDelete() : undefined}
        summary={{
          subcategoryCount: category.subcategoryCount,
          productFamilyCount: category.productFamilyCount,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        }}
      />
    </div>
  );
}

function ProductCategoryEditorLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <Loading />
      </div>
    </div>
  );
}
