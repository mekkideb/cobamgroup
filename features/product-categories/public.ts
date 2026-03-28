import { Prisma } from "@prisma/client";
import { makeMediaPublicMany } from "@/features/media/repository";
import { prisma } from "@/lib/server/db/prisma";
import type {
  PublicMegaMenuProductCategory,
  PublicProductCategoryPageData,
  PublicProductSubcategoryCardData,
} from "./public-types";

type PublicImageRelation = {
  id: bigint;
  isActive: boolean;
  deletedAt: Date | null;
} | null;

type PublicProductCategoryRecord = {
  id: bigint;
  name: string;
  subtitle: string | null;
  slug: string;
  description: string | null;
  descriptionSeo: string | null;
  imageMediaId: bigint | null;
  imageMedia: PublicImageRelation;
  subcategories: Array<{
    id: bigint;
    categoryId: bigint;
    name: string;
    subtitle: string | null;
    slug: string;
    description: string | null;
    descriptionSeo: string | null;
    imageMediaId: bigint | null;
    imageMedia: PublicImageRelation;
  }>;
};

type PublicProductSubcategoryRecord = {
  id: bigint;
  categoryId: bigint;
  name: string;
  subtitle: string | null;
  slug: string;
  description: string | null;
  descriptionSeo: string | null;
  imageMediaId: bigint | null;
  imageMedia: PublicImageRelation;
  category: {
    id: bigint;
    name: string;
    slug: string;
  };
};

const publicCategorySelect = {
  id: true,
  name: true,
  subtitle: true,
  slug: true,
  description: true,
  descriptionSeo: true,
  imageMediaId: true,
  imageMedia: {
    select: {
      id: true,
      isActive: true,
      deletedAt: true,
    },
  },
  subcategories: {
    where: {
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      categoryId: true,
      name: true,
      subtitle: true,
      slug: true,
      description: true,
      descriptionSeo: true,
      imageMediaId: true,
      imageMedia: {
        select: {
          id: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  },
} satisfies Prisma.ProductCategorySelect;

const publicSubcategorySelect = {
  id: true,
  categoryId: true,
  name: true,
  subtitle: true,
  slug: true,
  description: true,
  descriptionSeo: true,
  imageMediaId: true,
  imageMedia: {
    select: {
      id: true,
      isActive: true,
      deletedAt: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.ProductSubcategorySelect;

function buildPublicMediaUrl(
  mediaId: bigint | number,
  variant: "original" | "thumbnail" = "original",
) {
  const query = variant === "thumbnail" ? "?variant=thumbnail" : "";
  return `/api/media/${mediaId.toString()}/file${query}`;
}

function getPublicImageUrls(input: {
  imageMediaId: bigint | null;
  imageMedia: PublicImageRelation;
}) {
  const hasImage =
    input.imageMediaId != null &&
    input.imageMedia != null &&
    input.imageMedia.isActive &&
    input.imageMedia.deletedAt == null;

  if (!hasImage || input.imageMediaId == null) {
    return {
      imageUrl: "",
      imageUrlHD: "",
      imageThumbnailUrl: null,
      imageOriginalUrl: null,
    };
  }

  return {
    imageUrl: buildPublicMediaUrl(input.imageMediaId, "thumbnail"),
    imageUrlHD: buildPublicMediaUrl(input.imageMediaId, "original"),
    imageThumbnailUrl: buildPublicMediaUrl(input.imageMediaId, "thumbnail"),
    imageOriginalUrl: buildPublicMediaUrl(input.imageMediaId, "original"),
  };
}

async function ensurePublicCategoryImages(records: PublicProductCategoryRecord[]) {
  const mediaIds = records.flatMap((category) => {
    const rootMediaIds =
      category.imageMediaId != null &&
      category.imageMedia != null &&
      category.imageMedia.isActive &&
      category.imageMedia.deletedAt == null
        ? [Number(category.imageMediaId)]
        : [];

    const subcategoryMediaIds = category.subcategories.flatMap((subcategory) =>
      subcategory.imageMediaId != null &&
      subcategory.imageMedia != null &&
      subcategory.imageMedia.isActive &&
      subcategory.imageMedia.deletedAt == null
        ? [Number(subcategory.imageMediaId)]
        : [],
    );

    return [...rootMediaIds, ...subcategoryMediaIds];
  });

  await makeMediaPublicMany(mediaIds);
}

async function ensurePublicSubcategoryImage(record: PublicProductSubcategoryRecord) {
  const mediaIds =
    record.imageMediaId != null &&
    record.imageMedia != null &&
    record.imageMedia.isActive &&
    record.imageMedia.deletedAt == null
      ? [Number(record.imageMediaId)]
      : [];

  await makeMediaPublicMany(mediaIds);
}

function mapRootCategoryToMenuItem(
  category: PublicProductCategoryRecord,
): PublicMegaMenuProductCategory {
  const images = getPublicImageUrls(category);

  return {
    id: Number(category.id),
    href: `/produits/${category.slug}`,
    title: category.name,
    subtitle: category.subtitle?.trim() ?? "",
    descriptionSEO:
      category.descriptionSeo?.trim() ?? category.description?.trim() ?? "",
    imageUrl: images.imageUrl,
    imageUrlHD: images.imageUrlHD,
    slug: category.slug,
    parent: null,
  };
}

function mapSubcategoryToMenuItem(
  category: Pick<PublicProductCategoryRecord, "slug">,
  subcategory: PublicProductCategoryRecord["subcategories"][number],
): PublicMegaMenuProductCategory {
  const images = getPublicImageUrls(subcategory);

  return {
    id: Number(subcategory.id),
    href: `/produits/${category.slug}/${subcategory.slug}`,
    title: subcategory.name,
    subtitle: subcategory.subtitle?.trim() ?? "",
    descriptionSEO:
      subcategory.descriptionSeo?.trim() ??
      subcategory.description?.trim() ??
      "",
    imageUrl: images.imageUrl,
    imageUrlHD: images.imageUrlHD,
    slug: subcategory.slug,
    parent: category.slug,
  };
}

function mapCategoryToPageData(
  category: PublicProductCategoryRecord,
): PublicProductCategoryPageData {
  const images = getPublicImageUrls(category);

  return {
    id: Number(category.id),
    name: category.name,
    subtitle: category.subtitle?.trim() ?? "",
    slug: category.slug,
    description: category.description?.trim() ?? "",
    descriptionSEO:
      category.descriptionSeo?.trim() ?? category.description?.trim() ?? "",
    href: `/produits/${category.slug}`,
    parentSlug: null,
    parentName: null,
    imageUrl: images.imageOriginalUrl,
    imageThumbnailUrl: images.imageThumbnailUrl,
  };
}

function mapSubcategoryToPageData(
  subcategory: PublicProductSubcategoryRecord,
): PublicProductCategoryPageData {
  const images = getPublicImageUrls(subcategory);

  return {
    id: Number(subcategory.id),
    name: subcategory.name,
    subtitle: subcategory.subtitle?.trim() ?? "",
    slug: subcategory.slug,
    description: subcategory.description?.trim() ?? "",
    descriptionSEO:
      subcategory.descriptionSeo?.trim() ?? subcategory.description?.trim() ?? "",
    href: `/produits/${subcategory.category.slug}/${subcategory.slug}`,
    parentSlug: subcategory.category.slug,
    parentName: subcategory.category.name,
    imageUrl: images.imageOriginalUrl,
    imageThumbnailUrl: images.imageThumbnailUrl,
  };
}

function mapSubcategoryToCardData(
  category: Pick<PublicProductCategoryRecord, "slug">,
  subcategory: PublicProductCategoryRecord["subcategories"][number] & {
    productFamilies?: Array<{ id: bigint }>;
  },
): PublicProductSubcategoryCardData {
  const images = getPublicImageUrls(subcategory);

  return {
    id: Number(subcategory.id),
    name: subcategory.name,
    subtitle: subcategory.subtitle?.trim() ?? "",
    description:
      subcategory.descriptionSeo?.trim() ??
      subcategory.description?.trim() ??
      "",
    href: `/produits/${category.slug}/${subcategory.slug}`,
    imageUrl: images.imageOriginalUrl,
    imageThumbnailUrl: images.imageThumbnailUrl,
    productCount: subcategory.productFamilies?.length ?? 0,
  };
}

export async function listPublicMegaMenuProductCategories(): Promise<
  PublicMegaMenuProductCategory[]
> {
  const categories = await prisma.productCategory.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    select: publicCategorySelect,
  });

  await ensurePublicCategoryImages(categories);

  return categories.flatMap((category) => [
    mapRootCategoryToMenuItem(category),
    ...category.subcategories.map((subcategory) =>
      mapSubcategoryToMenuItem(category, subcategory),
    ),
  ]);
}

export async function findPublicRootProductCategoryBySlug(
  slug: string,
): Promise<PublicProductCategoryPageData | null> {
  const category = await prisma.productCategory.findFirst({
    where: {
      isActive: true,
      slug,
    },
    select: publicCategorySelect,
  });

  if (!category) {
    return null;
  }

  await ensurePublicCategoryImages([category]);
  return mapCategoryToPageData(category);
}

export async function findPublicProductSubcategoryBySlugs(input: {
  categorySlug: string;
  subcategorySlug: string;
}): Promise<PublicProductCategoryPageData | null> {
  const subcategory = await prisma.productSubcategory.findFirst({
    where: {
      isActive: true,
      slug: input.subcategorySlug,
      category: {
        isActive: true,
        slug: input.categorySlug,
      },
    },
    select: publicSubcategorySelect,
  });

  if (!subcategory) {
    return null;
  }

  await ensurePublicSubcategoryImage(subcategory);
  return mapSubcategoryToPageData(subcategory);
}

export async function listPublicProductSubcategoryCardsByCategorySlug(
  categorySlug: string,
): Promise<PublicProductSubcategoryCardData[]> {
  const category = await prisma.productCategory.findFirst({
    where: {
      isActive: true,
      slug: categorySlug,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      subtitle: true,
      slug: true,
      description: true,
      descriptionSeo: true,
      imageMediaId: true,
      imageMedia: {
        select: {
          id: true,
          isActive: true,
          deletedAt: true,
        },
      },
      subcategories: {
        where: {
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
        select: {
          id: true,
          categoryId: true,
          name: true,
          subtitle: true,
          slug: true,
          description: true,
          descriptionSeo: true,
          imageMediaId: true,
          imageMedia: {
            select: {
              id: true,
              isActive: true,
              deletedAt: true,
            },
          },
          productFamilies: {
            where: {
              lifecycleStatus: "ACTIVE",
              visibility: "PUBLIC",
              brand: {
                deletedAt: null,
              },
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!category) {
    return [];
  }

  await ensurePublicCategoryImages([category]);

  return category.subcategories.map((subcategory) =>
    mapSubcategoryToCardData(category, subcategory),
  );
}
