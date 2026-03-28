export const TAG_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type TagPageSize = (typeof TAG_PAGE_SIZE_OPTIONS)[number];

export type TagListQuery = {
  page: number;
  pageSize: TagPageSize;
  q?: string;
};

export type TagCreateInput = {
  name: string;
  slug: string;
};

export type TagUpdateInput = TagCreateInput;

export type TagSuggestionQuery = {
  q?: string;
  limit: number;
};

export type TagListItemDto = {
  id: number;
  name: string;
  slug: string;
  articleCount: number;
  productFamilyCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TagDetailDto = TagListItemDto;

export type TagSuggestionDto = {
  id: number;
  name: string;
  slug: string;
};

export type TagListResult = {
  items: TagListItemDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type TagSuggestionResult = {
  items: TagSuggestionDto[];
};
