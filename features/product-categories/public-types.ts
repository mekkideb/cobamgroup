export type PublicMegaMenuProductCategory = {
  id: number;
  href: string;
  title: string;
  subtitle: string;
  descriptionSEO: string;
  imageUrl: string;
  imageUrlHD: string;
  slug: string;
  parent: string | null;
};

export type PublicProductCategoryPageData = {
  id: number;
  name: string;
  subtitle: string;
  slug: string;
  description: string;
  descriptionSEO: string;
  href: string;
  parentSlug: string | null;
  parentName: string | null;
  imageUrl: string | null;
  imageThumbnailUrl: string | null;
};

export type PublicProductSubcategoryCardData = {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  href: string;
  imageUrl: string | null;
  imageThumbnailUrl: string | null;
  productCount: number;
};
