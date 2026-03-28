import { NextResponse } from "next/server";
import {
  listPublicProductsBySubcategory,
  PUBLIC_PRODUCTS_PAGE_SIZE,
} from "@/features/products/public";

class PublicProductsValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function parseRequiredSlug(
  value: string | null,
  fieldName: string,
) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new PublicProductsValidationError(
      `Paramètre "${fieldName}" manquant.`,
      400,
    );
  }

  return normalizedValue;
}

function parsePositiveInteger(
  value: string | null,
  fallback: number,
) {
  const parsedValue = value == null ? fallback : Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export async function GET(req: Request) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const categorySlug = parseRequiredSlug(searchParams.get("category"), "category");
    const subcategorySlug = parseRequiredSlug(
      searchParams.get("subcategory"),
      "subcategory",
    );
    const page = parsePositiveInteger(searchParams.get("page"), 1);
    const pageSize = parsePositiveInteger(
      searchParams.get("pageSize"),
      PUBLIC_PRODUCTS_PAGE_SIZE,
    );
    const result = await listPublicProductsBySubcategory({
      categorySlug,
      subcategorySlug,
      page,
      pageSize,
    });

    return NextResponse.json(
      {
        ok: true,
        items: result.items,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof PublicProductsValidationError) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status },
      );
    }

    console.error("PUBLIC_PRODUCTS_LIST_ERROR:", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
