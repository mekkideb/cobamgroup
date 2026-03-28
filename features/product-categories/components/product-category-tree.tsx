"use client";

import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { StaffBadge } from "@/components/staff/ui";
import type { ProductCategoryListItemDto } from "../types";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";

export type ProductCategoryTreeNode = ProductCategoryListItemDto;

function ProductSubcategoryRow({
  pathname,
  category,
  subcategory,
}: {
  pathname: string;
  category: ProductCategoryTreeNode;
  subcategory: ProductCategoryTreeNode["subcategories"][number];
}) {
  const hasImage = subcategory.imageMediaId != null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 w-fit">
          <div className="flex items-center gap-4">
            <ChevronRight className="h-4 w-4" />
            <p className="truncate font-medium text-cobam-dark-blue">
              {subcategory.name}
            </p>
          </div>

        <div className="flex flex-wrap items-center gap-2">
          <StaffBadge
            size="sm"
            color={subcategory.isActive ? "green" : "default"}
          >
            {subcategory.isActive ? "Active" : "Inactive"}
          </StaffBadge>
          <StaffBadge size="sm" color="green" icon="package">
            {subcategory.productFamilyCount} famille
            {subcategory.productFamilyCount > 1 ? "s" : ""}
          </StaffBadge>
          <StaffBadge
            size="sm"
            color={hasImage ? "blue" : "default"}
            icon={hasImage ? "image" : "warning"}
          >
            {hasImage ? "Image" : "Sans image"}
          </StaffBadge>
        </div>
    </li>
  );
}

function ProductCategoryRow({
  pathname,
  node,
  isExpanded,
  onToggle,
}: {
  pathname: string;
  node: ProductCategoryTreeNode;
  isExpanded: boolean;
  onToggle: (categoryId: number) => void;
}) {
  const hasSubcategories = node.subcategories.length > 0;
  const hasImage = node.imageMediaId != null;

  return (
    <li className="space-y-3">
      <div className="flex flex-wrap justify-between items-center rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              disabled={!hasSubcategories}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-cobam-water-blue hover:text-cobam-water-blue disabled:cursor-default disabled:opacity-40"
              aria-label={
                hasSubcategories
                  ? isExpanded
                    ? `Replier ${node.name}`
                    : `Déplier ${node.name}`
                  : `Aucune sous-catégorie pour ${node.name}`
              }
            >
              {hasSubcategories ? (
                isExpanded ? (
                  <FolderOpen className="h-5 w-5" />
                ) : (
                  <Folder className="h-5 w-5" />
                )
              ) : (
                <div className="h-2 w-2 rounded-full bg-slate-300" />
              )}
            </button>

            <h1 className="truncate text-lg font-semibold text-cobam-dark-blue">
              {node.name}
            </h1>
          </div>
            <div className="flex flex-wrap items-center gap-2">
            <StaffBadge size="sm" color={node.isActive ? "green" : "default"}>
              {node.isActive ? "Active" : "Inactive"}
            </StaffBadge>
            <StaffBadge size="sm" color="secondary" icon="folder">
              {node.subcategoryCount} sous-catégorie
              {node.subcategoryCount > 1 ? "s" : ""}
            </StaffBadge>
            <StaffBadge size="sm" color="green" icon="package">
              {node.productFamilyCount} famille
              {node.productFamilyCount > 1 ? "s" : ""}
            </StaffBadge>
            <StaffBadge
              size="sm"
              color={hasImage ? "blue" : "default"}
              icon="image"
            >
              {hasImage ? "Image" : "Sans image"}
            </StaffBadge>
          <AnimatedUIButton variant="ghost" iconPosition="left" href={`${pathname}/edit?id=${node.id}`} icon="modify" >
            Modifier
          </AnimatedUIButton>
            </div>


      </div>

      {isExpanded && hasSubcategories ? (
        <ul className="space-y-2 pl-6">
          {node.subcategories.map((subcategory) => (
            <ProductSubcategoryRow
              pathname={pathname}
              key={subcategory.id}
              category={node}
              subcategory={subcategory}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function ProductCategoryTree({
  pathname,
  nodes,
  expandedIds,
  onToggle,
}: {
  pathname: string;
  nodes: ProductCategoryTreeNode[];
  expandedIds: ReadonlySet<number>;
  onToggle: (categoryId: number) => void;
}) {
  return (
    <ul className="space-y-4">
      {nodes.map((node) => (
        <ProductCategoryRow
          pathname={pathname}
          key={node.id}
          node={node}
          isExpanded={expandedIds.has(node.id)}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}
