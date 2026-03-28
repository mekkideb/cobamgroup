"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicProductListResult } from "@/features/products/public";
import PublicProductCard from "./public-product-card";

type PublicProductGridProps = {
  categorySlug: string;
  subcategorySlug: string;
  initialResult: PublicProductListResult;
};

function PublicProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[4/3] animate-pulse bg-slate-200" />
      <div className="space-y-3 p-6">
        <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
        <div className="h-8 w-3/4 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

export default function PublicProductGrid({
  categorySlug,
  subcategorySlug,
  initialResult,
}: PublicProductGridProps) {
  const [items, setItems] = useState(initialResult.items);
  const [page, setPage] = useState(initialResult.page);
  const [total, setTotal] = useState(initialResult.total);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestInFlightRef = useRef(false);

  const hasMore = items.length < total;

  useEffect(() => {
    setItems(initialResult.items);
    setPage(initialResult.page);
    setTotal(initialResult.total);
    setErrorMessage(null);
    requestInFlightRef.current = false;
  }, [initialResult, categorySlug, subcategorySlug]);

  const loadMore = useCallback(async () => {
    if (!hasMore || requestInFlightRef.current) {
      return;
    }

    requestInFlightRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextPage = page + 1;
      const searchParams = new URLSearchParams({
        category: categorySlug,
        subcategory: subcategorySlug,
        page: String(nextPage),
        pageSize: String(initialResult.pageSize),
      });
      const response = await fetch(`/api/public/products?${searchParams.toString()}`, {
        method: "GET",
      });
      const payload = (await response.json()) as
        | (PublicProductListResult & { ok: true })
        | { ok: false; message?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "Impossible de charger plus de produits.",
        );
      }

      setItems((currentItems) => {
        const seenIds = new Set(currentItems.map((item) => item.id));
        const nextItems = payload.items.filter((item) => !seenIds.has(item.id));
        return [...currentItems, ...nextItems];
      });
      setPage(payload.page);
      setTotal(payload.total);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger plus de produits.",
      );
    } finally {
      requestInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [
    categorySlug,
    hasMore,
    initialResult.pageSize,
    page,
    subcategorySlug,
  ]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMore || errorMessage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (entry?.isIntersecting) {
          void loadMore();
        }
      },
      {
        rootMargin: "320px 0px",
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [
    categorySlug,
    errorMessage,
    hasMore,
    initialResult.pageSize,
    loadMore,
    page,
    subcategorySlug,
    total,
  ]);

  if (items.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-14 text-center text-slate-500">
        Aucun produit public n&apos;est disponible pour le moment dans cette sous-catégorie.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">
          {total} produit{total > 1 ? "s" : ""} dans cette sous-catégorie
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((product) => (
          <PublicProductCard key={product.id} product={product} />
        ))}

        {isLoading
          ? Array.from({ length: Math.min(initialResult.pageSize, 3) }).map((_, index) => (
              <PublicProductCardSkeleton key={`skeleton-${index}`} />
            ))
          : null}
      </div>

      <div ref={sentinelRef} className="flex min-h-12 items-center justify-center">
        {errorMessage ? (
          <div className="flex flex-col items-center gap-3 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-center text-sm text-rose-700">
            <span>{errorMessage}</span>
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 bg-white text-rose-700 hover:bg-rose-100"
              onClick={() => void loadMore()}
            >
              Réessayer
            </Button>
          </div>
        ) : hasMore ? (
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm">
            <Loader2 className={`h-4 w-4 text-cobam-water-blue ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Chargement d'autres produits..." : "Chargement automatique..."}
          </div>
        ) : (
          <p className="text-sm font-medium text-slate-400">
            Tous les produits visibles de cette sous-catégorie sont affichés.
          </p>
        )}
      </div>
    </div>
  );
}
