import { formatStoredProductAttributeValue } from "./attribute-values";
import type {
  ProductAttributeDto,
  ProductBrandOptionDto,
  ProductDetailDto,
  ProductListItemDto,
  ProductMediaDto,
  ProductSubcategoryOptionDto,
  ProductTagOptionDto,
  ProductVariantDto,
  ProductVariantAttributeValueDto,
} from "./types";

type ProductFamilyListRecord = {
  id: bigint;
  name: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  description: string | null;
  lifecycleStatus: "DRAFT" | "ACTIVE" | "ARCHIVED";
  visibility: "HIDDEN" | "PUBLIC";
  isPromoted: boolean;
  createdAt: Date;
  updatedAt: Date;
  brand: {
    id: bigint;
    name: string;
    slug: string;
  } | null;
  subcategories: Array<{
    id: bigint;
    categoryId: bigint;
    category: {
      name: string;
      slug: string;
    };
    name: string;
    slug: string;
  }>;
  _count: {
    variants: number;
    tagLinks: number;
  };
};

type ProductFamilyDetailRecord = ProductFamilyListRecord & {
  descriptionSeo: string | null;
  mediaLinks: Array<{
    media: {
      id: bigint;
      kind: ProductMediaDto["kind"];
      title: string | null;
      originalFilename: string | null;
      altText: string | null;
      mimeType: string | null;
      extension: string | null;
      widthPx: number | null;
      heightPx: number | null;
      sizeBytes: bigint | number | null;
    };
  }>;
  defaultVariant: {
    id: bigint;
    sku: string;
    title: string;
    slug: string;
  } | null;
  tagLinks: Array<{
    tag: {
      id: bigint;
      name: string;
      slug: string;
    };
  }>;
  attributeValues: Array<{
    attribute: {
      id: bigint;
      key: string;
      name: string;
      slug: string;
      dataType: ProductAttributeDto["dataType"];
      unit: string | null;
      sortOrder: number;
    };
  }>;
  variants: Array<{
    id: bigint;
    sku: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    lifecycleStatus: "DRAFT" | "ACTIVE" | "ARCHIVED";
    visibility: "HIDDEN" | "PUBLIC";
    commercialMode: "REFERENCE_ONLY" | "QUOTE_ONLY" | "SELLABLE";
    priceVisibility: "HIDDEN" | "VISIBLE";
    isPromoted: boolean;
    currencyCode: string;
    basePriceAmount: { toString(): string } | number | null;
    currentPriceAmount: { toString(): string } | number | null;
    sortOrder: number;
    mediaLinks: Array<{
      media: {
        id: bigint;
        kind: ProductMediaDto["kind"];
        title: string | null;
        originalFilename: string | null;
        altText: string | null;
        mimeType: string | null;
        extension: string | null;
        widthPx: number | null;
        heightPx: number | null;
        sizeBytes: bigint | number | null;
      };
    }>;
    attributeValues: Array<{
      attributeId: bigint;
      valueText: string | null;
      valueNumber: { toString(): string } | number | null;
      valueBoolean: boolean | null;
      valueJson: unknown | null;
      attribute: {
        dataType: ProductAttributeDto["dataType"];
      };
    }>;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

function mapProductMediaToDto(media: {
  id: bigint;
  kind: ProductMediaDto["kind"];
  title: string | null;
  originalFilename: string | null;
  altText: string | null;
  mimeType: string | null;
  extension: string | null;
  widthPx: number | null;
  heightPx: number | null;
  sizeBytes: bigint | number | null;
}): ProductMediaDto {
  return {
    id: Number(media.id),
    kind: media.kind,
    title: media.title,
    originalFilename: media.originalFilename,
    altText: media.altText,
    mimeType: media.mimeType,
    extension: media.extension,
    widthPx: media.widthPx,
    heightPx: media.heightPx,
    sizeBytes:
      typeof media.sizeBytes === "bigint"
        ? Number(media.sizeBytes)
        : media.sizeBytes,
  };
}

function mapProductAttributeToDto(
  attributeLink: ProductFamilyDetailRecord["attributeValues"][number],
): ProductAttributeDto {
  return {
    id: Number(attributeLink.attribute.id),
    key: attributeLink.attribute.key,
    name: attributeLink.attribute.name,
    slug: attributeLink.attribute.slug,
    dataType: attributeLink.attribute.dataType,
    unit: attributeLink.attribute.unit,
    sortOrder: attributeLink.attribute.sortOrder,
  };
}

function mapProductVariantAttributeValueToDto(
  value: ProductFamilyDetailRecord["variants"][number]["attributeValues"][number],
): ProductVariantAttributeValueDto {
  return {
    attributeId: Number(value.attributeId),
    value: formatStoredProductAttributeValue({
      dataType: value.attribute.dataType,
      valueText: value.valueText,
      valueNumber: value.valueNumber,
      valueBoolean: value.valueBoolean,
      valueJson: value.valueJson,
    }),
  };
}

function mapProductVariantToDto(variant: ProductFamilyDetailRecord["variants"][number]): ProductVariantDto {
  return {
    id: Number(variant.id),
    sku: variant.sku,
    slug: variant.slug,
    title: variant.title,
    subtitle: variant.subtitle,
    description: variant.description,
    lifecycleStatus: variant.lifecycleStatus,
    visibility: variant.visibility,
    commercialMode: variant.commercialMode,
    priceVisibility: variant.priceVisibility,
    isPromoted: variant.isPromoted,
    currencyCode: variant.currencyCode,
    basePriceAmount:
      variant.basePriceAmount != null ? String(variant.basePriceAmount) : null,
    currentPriceAmount:
      variant.currentPriceAmount != null
        ? String(variant.currentPriceAmount)
        : null,
    effectivePriceAmount:
      variant.currentPriceAmount != null
        ? String(variant.currentPriceAmount)
        : variant.basePriceAmount != null
          ? String(variant.basePriceAmount)
          : null,
    sortOrder: variant.sortOrder,
    media: variant.mediaLinks.map((link) => mapProductMediaToDto(link.media)),
    attributeValues: variant.attributeValues.map(
      mapProductVariantAttributeValueToDto,
    ),
    createdAt: variant.createdAt.toISOString(),
    updatedAt: variant.updatedAt.toISOString(),
  };
}

export function mapProductBrandOptionDto(
  brand: { id: bigint; name: string; slug: string },
): ProductBrandOptionDto {
  return {
    id: Number(brand.id),
    name: brand.name,
    slug: brand.slug,
  };
}

export function mapProductSubcategoryOptionDto(
  subcategory: {
    id: bigint;
    categoryId: bigint;
    name: string;
    slug: string;
    category: {
      name: string;
      slug: string;
    };
  },
): ProductSubcategoryOptionDto {
  return {
    id: Number(subcategory.id),
    name: subcategory.name,
    slug: subcategory.slug,
    categoryId: Number(subcategory.categoryId),
    categoryName: subcategory.category.name,
    categorySlug: subcategory.category.slug,
  };
}

export function mapProductTagOptionDto(
  tag: { id: bigint; name: string; slug: string },
): ProductTagOptionDto {
  return {
    id: Number(tag.id),
    name: tag.name,
    slug: tag.slug,
  };
}

export function mapProductToListItemDto(
  product: ProductFamilyListRecord,
): ProductListItemDto {
  return {
    id: Number(product.id),
    name: product.name,
    slug: product.slug,
    subtitle: product.subtitle,
    excerpt: product.excerpt,
    description: product.description,
    lifecycleStatus: product.lifecycleStatus,
    visibility: product.visibility,
    isPromoted: product.isPromoted,
    brand:
      product.brand != null ? mapProductBrandOptionDto(product.brand) : null,
    productSubcategories: product.subcategories.map(
      mapProductSubcategoryOptionDto,
    ),
    tagCount: product._count.tagLinks,
    variantCount: product._count.variants,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function mapProductToDetailDto(
  product: ProductFamilyDetailRecord,
): ProductDetailDto {
  const base = mapProductToListItemDto(product);

  return {
    ...base,
    descriptionSeo: product.descriptionSeo,
    mainImage:
      product.mediaLinks[0] != null
        ? mapProductMediaToDto(product.mediaLinks[0].media)
        : null,
    attributes: product.attributeValues.map(mapProductAttributeToDto),
    defaultVariantId:
      product.defaultVariant != null ? Number(product.defaultVariant.id) : null,
    tags: product.tagLinks.map((item) => mapProductTagOptionDto(item.tag)),
    variants: product.variants.map(mapProductVariantToDto),
  };
}

export function toProductAuditSnapshot(value: unknown): unknown {
  if (value == null) return value;

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(toProductAuditSnapshot);
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = toProductAuditSnapshot(item);
    }
    return result;
  }

  return value;
}
