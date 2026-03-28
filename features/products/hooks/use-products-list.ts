"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getProductFormOptionsClient,
  listProductsClient,
  ProductsClientError,
} from "../client";
import {
  EMPTY_PRODUCT_FORM_OPTIONS,
  type ProductFormOptionsDto,
  type ProductListItemDto,
  type ProductPageSize,
} from "../types";
import { usePersistentPageSize } from "@/lib/client/use-persistent-page-size";

const PAGE_SIZE_OPTIONS: ProductPageSize[] = [10, 20, 50];

export function useProductsList(initialPageSize: ProductPageSize = 20) {
  const [items, setItems] = useState<ProductListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistentPageSize(
    "staff:products:list:page-size",
    initialPageSize,
    PAGE_SIZE_OPTIONS,
  );
  const [search, setSearch] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productSubcategoryId, setProductSubcategoryId] = useState("");
  const [options, setOptions] = useState<ProductFormOptionsDto>(
    EMPTY_PRODUCT_FORM_OPTIONS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);
  const searchRef = useRef(search);
  const brandIdRef = useRef(brandId);
  const productSubcategoryIdRef = useRef(productSubcategoryId);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  useEffect(() => {
    brandIdRef.current = brandId;
  }, [brandId]);

  useEffect(() => {
    productSubcategoryIdRef.current = productSubcategoryId;
  }, [productSubcategoryId]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [pageSize, total],
  );

  const fetchProducts = useCallback(
    async (override?: {
      page?: number;
      pageSize?: ProductPageSize;
      search?: string;
      brandId?: string;
      productSubcategoryId?: string;
    }) => {
      const nextPage = override?.page ?? pageRef.current;
      const nextPageSize = override?.pageSize ?? pageSizeRef.current;
      const nextSearch = override?.search ?? searchRef.current;
      const nextBrandId = override?.brandId ?? brandIdRef.current;
      const nextProductSubcategoryId =
        override?.productSubcategoryId ?? productSubcategoryIdRef.current;

      setIsLoading(true);
      setError(null);

      try {
        const result = await listProductsClient({
          page: nextPage,
          pageSize: nextPageSize,
          q: nextSearch,
          brandId: nextBrandId ? Number(nextBrandId) : undefined,
          productSubcategoryId: nextProductSubcategoryId
            ? Number(nextProductSubcategoryId)
            : undefined,
        });

        setItems(result.items);
        setTotal(result.total);
        setPage(result.page);
        setPageSize(result.pageSize as ProductPageSize);
      } catch (err: unknown) {
        const message =
          err instanceof ProductsClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Erreur inconnue";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [setPageSize],
  );

  useEffect(() => {
    void fetchProducts({ page: 1, pageSize });
  }, [fetchProducts, pageSize]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const nextOptions = await getProductFormOptionsClient();
        if (!cancelled) {
          setOptions(nextOptions);
        }
      } catch (err) {
        console.error("PRODUCT_OPTIONS_LOAD_ERROR:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const submitFilters = useCallback(async () => {
    await fetchProducts({
      page: 1,
      pageSize,
      search,
      brandId,
      productSubcategoryId,
    });
  }, [brandId, fetchProducts, pageSize, productSubcategoryId, search]);

  const updatePageSize = useCallback(
    async (value: ProductPageSize) => {
      const safeValue = PAGE_SIZE_OPTIONS.includes(value) ? value : 20;
      setPageSize(safeValue);
      await fetchProducts({ page: 1, pageSize: safeValue });
    },
    [fetchProducts, setPageSize],
  );

  const goPrev = useCallback(async () => {
    if (page <= 1) return;
    await fetchProducts({ page: page - 1 });
  }, [fetchProducts, page]);

  const goNext = useCallback(async () => {
    if (page >= totalPages) return;
    await fetchProducts({ page: page + 1 });
  }, [fetchProducts, page, totalPages]);

  return {
    items,
    total,
    page,
    pageSize,
    search,
    brandId,
    productSubcategoryId,
    options,
    isLoading,
    error,
    totalPages,
    canPrev: page > 1,
    canNext: page < totalPages,
    setSearch,
    setBrandId,
    setProductSubcategoryId,
    fetchProducts,
    submitFilters,
    updatePageSize,
    goPrev,
    goNext,
  };
}
