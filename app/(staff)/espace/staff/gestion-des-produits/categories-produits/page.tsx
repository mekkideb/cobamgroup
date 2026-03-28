"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ListTree } from "lucide-react";
import { usePathname } from "next/navigation";
import Loading from "@/components/staff/Loading";
import {
  StaffFilterBar,
  StaffNotice,
  StaffPageHeader,
} from "@/components/staff/ui";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { useStaffSessionContext } from "@/features/auth/client/staff-session-provider";
import { canCreateProductCategories } from "@/features/product-categories/access";
import {
  ProductCategoryTree,
  type ProductCategoryTreeNode,
} from "@/features/product-categories/components/product-category-tree";
import { useProductCategoriesTree } from "@/features/product-categories/hooks/use-product-categories-tree";
import type { ProductCategoryListItemDto } from "@/features/product-categories/types";

function sortCategories(
  left: ProductCategoryListItemDto,
  right: ProductCategoryListItemDto,
) {
  const sortOrderDelta = left.sortOrder - right.sortOrder;

  if (sortOrderDelta !== 0) {
    return sortOrderDelta;
  }

  return left.name.localeCompare(right.name, "fr-FR");
}

function sortSubcategories(
  left: ProductCategoryListItemDto["subcategories"][number],
  right: ProductCategoryListItemDto["subcategories"][number],
) {
  const sortOrderDelta = left.sortOrder - right.sortOrder;

  if (sortOrderDelta !== 0) {
    return sortOrderDelta;
  }

  return left.name.localeCompare(right.name, "fr-FR");
}

function buildCategoryTree(
  items: ProductCategoryListItemDto[],
): ProductCategoryTreeNode[] {
  return [...items]
    .sort(sortCategories)
    .map((item) => ({
      ...item,
      subcategories: [...item.subcategories].sort(sortSubcategories),
    }));
}

function collectExpandableIds(nodes: ProductCategoryTreeNode[]): number[] {
  return nodes
    .filter((node) => node.subcategories.length > 0)
    .map((node) => node.id);
}

const PRODUCT_CATEGORY_TREE_COLLAPSE_STORAGE_KEY =
  "staff:product-categories:tree:collapsed-ids";

function parseStoredCollapsedCategoryIds(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return Array.from(
      new Set(
        parsedValue.filter(
          (item): item is number =>
            typeof item === "number" &&
            Number.isInteger(item) &&
            item > 0,
        ),
      ),
    );
  } catch {
    return [];
  }
}

export default function ProductCategoriesListPage() {
  const pathname = usePathname();
  const { user: authUser } = useStaffSessionContext();
  const canCreateCategory = authUser
    ? canCreateProductCategories(authUser)
    : false;

  const {
    items,
    search,
    isLoading,
    error,
    setSearch,
    submitSearch,
  } = useProductCategoriesTree();

  const tree = useMemo(() => buildCategoryTree(items), [items]);
  const expandableIds = useMemo(() => collectExpandableIds(tree), [tree]);
  const [collapsedIds, setCollapsedIds] = useState<number[]>([]);
  const [hasHydratedCollapsedIds, setHasHydratedCollapsedIds] = useState(false);

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(() => {
      const nextCollapsedIds = parseStoredCollapsedCategoryIds(
        window.localStorage.getItem(PRODUCT_CATEGORY_TREE_COLLAPSE_STORAGE_KEY),
      );

      setCollapsedIds(nextCollapsedIds);
      setHasHydratedCollapsedIds(true);
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedCollapsedIds) {
      return;
    }

    try {
      window.localStorage.setItem(
        PRODUCT_CATEGORY_TREE_COLLAPSE_STORAGE_KEY,
        JSON.stringify(collapsedIds),
      );
    } catch {
      // Ignore localStorage persistence failures.
    }
  }, [collapsedIds, hasHydratedCollapsedIds]);

  const expandedIdSet = useMemo(() => {
    const collapsedIdSet = new Set(collapsedIds);

    return new Set(
      expandableIds.filter((categoryId) => !collapsedIdSet.has(categoryId)),
    );
  }, [collapsedIds, expandableIds]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitSearch();
  };

  const toggleNode = (categoryId: number) => {
    setCollapsedIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  };

  return (
    <div className="space-y-6">
      <StaffPageHeader
        eyebrow="Catégories produit"
        title="Structure catalogue"
        icon={ListTree}
        actions={
          canCreateCategory ? (
            <AnimatedUIButton
              href={`${pathname}/edit`}
              variant="secondary"
              icon="plus"
            >
              Créer une catégorie
            </AnimatedUIButton>
          ) : null
        }
      />

      <form onSubmit={handleSubmit}>
        <StaffFilterBar
          searchValue={search}
          searchPlaceholder="Rechercher une catégorie ou une sous-catégorie..."
          onSearchChange={setSearch}
        />
      </form>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8">
          <Loading />
        </div>
      ) : null}

      {!isLoading && error ? (
        <StaffNotice variant="error" title="Chargement impossible">
          {error}
        </StaffNotice>
      ) : null}

      {!isLoading && !error && tree.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          Aucune catégorie ne correspond à ces critères.
        </div>
      ) : null}

      {!isLoading && !error && tree.length > 0 ? (
        <ProductCategoryTree
          pathname={pathname}
          nodes={tree}
          expandedIds={expandedIdSet}
          onToggle={toggleNode}
        />
      ) : null}
    </div>
  );
}
