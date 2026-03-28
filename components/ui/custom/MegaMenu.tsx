"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { PublicMegaMenuProductCategory } from "@/features/product-categories/public-types";

interface MegaMenuProps {
  menuLabel: string;
  data: PublicMegaMenuProductCategory[];
}

export default function MegaMenu({ menuLabel, data }: MegaMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredSubCategory, setHoveredSubCategory] =
    useState<PublicMegaMenuProductCategory | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const contentId = useId();

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimeout();

    if (!isOpen) {
      setActiveIndex(0);
      setHoveredSubCategory(null);
    }

    setIsOpen(true);
  };

  const scheduleCloseMenu = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setHoveredSubCategory(null);
    }, 120);
  };

  const closeMenu = () => {
    clearCloseTimeout();
    setIsOpen(false);
    setHoveredSubCategory(null);
  };

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, []);

  if (data.length === 0) {
    return null;
  }

  const getCategoryPath = (slug: string | null): string =>
    data.find((category) => category.slug === slug)?.href ?? "#";

  const rootCategories = data.filter((item) => item.parent === null);

  if (rootCategories.length === 0) {
    return null;
  }

  const getSubcategories = (parentSlug: string) =>
    data.filter((item) => item.parent === parentSlug);

  const activeCategory = rootCategories[activeIndex] || rootCategories[0];
  const previewItem = hoveredSubCategory || activeCategory;
  const isPreviewingCategory = !hoveredSubCategory;
  const activeCategorySubcategories = getSubcategories(activeCategory.slug);

  return (
    <div
      className="static"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleCloseMenu}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onMouseEnter={openMenu}
        onFocus={openMenu}
        onClick={() => {
          if (isOpen) {
            closeMenu();
            return;
          }

          openMenu();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            closeMenu();
          }
        }}
        className="flex items-center gap-1 bg-transparent px-0 py-0 font-semibold text-sm text-cobam-dark-blue transition-colors outline-none hover:text-cobam-water-blue focus:text-cobam-water-blue"
      >
        <span className="pointer-events-none">{menuLabel}</span>
        <ChevronDown
          size={13}
          className={`pointer-events-none transition-transform duration-200 ${
            isOpen ? "rotate-180 text-cobam-water-blue" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div
          id={contentId}
          role="menu"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleCloseMenu}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeMenu();
            }
          }}
          className="absolute left-1/2 top-12 z-50 flex w-full -translate-x-1/2 justify-center px-4 pt-3"
        >
          <div className="relative w-max max-w-[95vw] overflow-hidden rounded-3xl border border-black/5 bg-white shadow-xl 2xl:max-w-[1400px]">
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none lg:hidden">
              {previewItem.imageUrl ? (
                <Image
                  src={previewItem.imageUrl}
                  alt="Aperçu de catégorie"
                  fill
                  className="object-cover opacity-[0.08] grayscale transition-opacity duration-500"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100" />
              )}
              <div className="absolute inset-0 bg-white/90 backdrop-blur-xl" />
            </div>

            <div className="relative z-10 flex flex-col gap-6 p-4 lg:flex-row lg:gap-8 lg:p-6">
              <div className="hidden w-[320px] shrink-0 flex-col lg:flex xl:w-[360px]">
                <Link
                  href={getCategoryPath(previewItem.slug)}
                  onClick={closeMenu}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-cobam-water-blue/15 bg-white transition-all duration-300 hover:border-cobam-water-blue/30 hover:shadow-xl hover:shadow-cobam-water-blue/5"
                >
                  <div className="relative h-56 w-full shrink-0 overflow-hidden bg-gray-50/50">
                    {previewItem.imageUrl ? (
                      <>
                        <Image
                          src={previewItem.imageUrl}
                          alt={previewItem.title || "Image de catégorie"}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          sizes="(max-width: 1024px) 100vw, 380px"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-cobam-water-blue/5 to-gray-100" />
                    )}

                    <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white drop-shadow-md">
                        {isPreviewingCategory ? "À la une" : "Sous-catégorie"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-grow flex-col bg-gradient-to-br from-white to-gray-50/30 p-6">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="text-xl font-bold leading-tight text-cobam-dark-blue">
                        {previewItem.title || "En savoir plus"}
                      </h3>
                      <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 -translate-x-2 translate-y-2 text-cobam-water-blue opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
                    </div>

                    {previewItem.subtitle ? (
                      <span className="mb-3 block text-xs font-semibold uppercase tracking-wider text-cobam-water-blue">
                        {previewItem.subtitle}
                      </span>
                    ) : null}

                    {previewItem.descriptionSEO ? (
                      <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-cobam-carbon-grey">
                        {previewItem.descriptionSEO}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm italic leading-relaxed text-gray-400">
                        Découvrez notre sélection exclusive pour cette gamme.
                      </p>
                    )}

                    {isPreviewingCategory &&
                    activeCategorySubcategories.length > 0 ? (
                      <div className="mt-auto pt-5">
                        <div className="flex flex-wrap gap-2">
                          {activeCategorySubcategories
                            .slice(0, 5)
                            .map((subcategory, index) => (
                              <div
                                key={`badge-${subcategory.slug}-${index}`}
                                className="rounded-lg border border-cobam-water-blue/20 bg-cobam-water-blue/5 px-2.5 py-1.5 transition-colors group-hover:border-cobam-water-blue/40 group-hover:bg-cobam-water-blue/10"
                              >
                                <span className="text-[11px] font-semibold leading-none text-cobam-dark-blue">
                                  {subcategory.title}
                                </span>
                              </div>
                            ))}
                          {activeCategorySubcategories.length > 5 ? (
                            <div className="flex items-center rounded-lg border border-transparent px-1 py-1.5">
                              <span className="text-[11px] font-semibold leading-none text-cobam-carbon-grey">
                                +{activeCategorySubcategories.length - 5}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Link>
              </div>

              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {rootCategories.map((category, index) => {
                    const isCategoryActive = index === activeIndex;
                    const subcategories = getSubcategories(category.slug);

                    return (
                      <div
                        key={category.slug}
                        onMouseEnter={() => {
                          setActiveIndex(index);
                          setHoveredSubCategory(null);
                        }}
                        className={`flex w-56 flex-col rounded-2xl border p-4 transition-all duration-300 lg:w-60 xl:w-[260px] ${
                          isCategoryActive
                            ? "border-cobam-water-blue/20 bg-cobam-water-blue/5"
                            : "border-transparent hover:bg-gray-50/80"
                        }`}
                      >
                        <Link
                          href={getCategoryPath(category.slug)}
                          onClick={closeMenu}
                          className="group/link mb-4 block outline-none"
                        >
                          <h4
                            className={`text-sm font-bold uppercase tracking-[0.1em] transition-colors ${
                              isCategoryActive
                                ? "text-cobam-water-blue"
                                : "text-cobam-dark-blue group-hover/link:text-cobam-water-blue"
                            }`}
                          >
                            {category.title || "Catégorie"}
                          </h4>
                          {category.subtitle ? (
                            <span className="mt-0.5 block text-xs text-cobam-carbon-grey/70">
                              {category.subtitle}
                            </span>
                          ) : null}
                        </Link>

                        <div className="flex flex-col">
                          {subcategories.map((subCategory) => {
                            const isSubActive =
                              hoveredSubCategory?.slug === subCategory.slug;

                            return (
                              <Link
                                key={subCategory.slug}
                                href={getCategoryPath(subCategory.slug)}
                                onClick={closeMenu}
                                onMouseEnter={() =>
                                  setHoveredSubCategory(subCategory)
                                }
                                onMouseLeave={() =>
                                  setHoveredSubCategory(null)
                                }
                                className={`group/item relative rounded-xl px-3 py-2 outline-none transition-all duration-200 ${
                                  isSubActive
                                    ? "bg-white ring-1 ring-black/5"
                                    : isCategoryActive
                                      ? "hover:bg-white/60"
                                      : "hover:bg-transparent"
                                }`}
                              >
                                <div
                                  className={`text-[13px] font-medium transition-colors ${
                                    isSubActive
                                      ? "text-cobam-water-blue"
                                      : "text-cobam-carbon-grey group-hover/item:text-cobam-dark-blue"
                                  }`}
                                >
                                  {subCategory.title || "Sous-catégorie"}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
