import type { StaffSession } from "@/features/auth/types";
import { canAccessTags, canCreateTags, canManageTags } from "./access";
import {
  countTags,
  createTag,
  createTagAuditLog,
  deleteTag,
  findTagById,
  findTagByName,
  findTagBySlug,
  listTags,
  listTagSuggestions,
  updateTag,
} from "./repository";
import { mapTagToDetailDto, mapTagToListItemDto, toTagAuditSnapshot } from "./mappers";
import type {
  TagCreateInput,
  TagListQuery,
  TagListResult,
  TagSuggestionResult,
  TagUpdateInput,
} from "./types";

export class TagServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function assertUniqueTagInput(
  input: { name: string; slug: string },
  options?: { excludeTagId?: number },
) {
  const [sameSlug, sameName] = await Promise.all([
    findTagBySlug(input.slug),
    findTagByName(input.name),
  ]);

  if (sameSlug && Number(sameSlug.id) !== (options?.excludeTagId ?? -1)) {
    throw new TagServiceError("Un tag avec ce slug existe déjà.", 400);
  }

  if (sameName && Number(sameName.id) !== (options?.excludeTagId ?? -1)) {
    throw new TagServiceError("Un tag avec ce nom existe déjà.", 400);
  }
}

export async function listTagsService(
  session: StaffSession,
  query: TagListQuery,
): Promise<TagListResult> {
  if (!canAccessTags(session)) {
    throw new TagServiceError("Accès refusé.", 403);
  }

  const [items, total] = await Promise.all([
    listTags(query),
    countTags(query),
  ]);

  return {
    items: items.map(mapTagToListItemDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getTagByIdService(session: StaffSession, tagId: number) {
  if (!canAccessTags(session)) {
    throw new TagServiceError("Accès refusé.", 403);
  }

  const tag = await findTagById(tagId);
  if (!tag) {
    throw new TagServiceError("Tag introuvable.", 404);
  }

  return mapTagToDetailDto(tag);
}

export async function listTagSuggestionsService(
  session: StaffSession,
  query: { q?: string; limit: number },
): Promise<TagSuggestionResult> {
  if (session.status === "BANNED") {
    throw new TagServiceError("Accès refusé.", 403);
  }

  const items = await listTagSuggestions(query);

  return {
    items: items.map((item) => ({
      id: Number(item.id),
      name: item.name,
      slug: item.slug,
    })),
  };
}

export async function createTagService(
  session: StaffSession,
  input: TagCreateInput,
) {
  if (!canCreateTags(session)) {
    throw new TagServiceError("Accès refusé.", 403);
  }

  await assertUniqueTagInput(input);

  const tag = await createTag(input);

  await createTagAuditLog({
    actorUserId: session.id,
    actionType: "CREATE",
    entityId: String(tag.id),
    targetLabel: tag.name,
    summary: "Création d'un nouveau tag",
    afterSnapshotJson: toTagAuditSnapshot(tag),
  });

  return mapTagToDetailDto(tag);
}

export async function updateTagService(
  session: StaffSession,
  tagId: number,
  input: TagUpdateInput,
) {
  if (!canManageTags(session)) {
    throw new TagServiceError("Accès refusé.", 403);
  }

  const before = await findTagById(tagId);
  if (!before) {
    throw new TagServiceError("Tag introuvable.", 404);
  }

  await assertUniqueTagInput(input, { excludeTagId: tagId });

  const tag = await updateTag(tagId, input);

  await createTagAuditLog({
    actorUserId: session.id,
    actionType: "UPDATE",
    entityId: String(tag.id),
    targetLabel: tag.name,
    summary: "Mise à jour d'un tag",
    beforeSnapshotJson: toTagAuditSnapshot(before),
    afterSnapshotJson: toTagAuditSnapshot(tag),
  });

  return mapTagToDetailDto(tag);
}

export async function deleteTagService(session: StaffSession, tagId: number) {
  if (!canManageTags(session)) {
    throw new TagServiceError("Accès refusé.", 403);
  }

  const before = await findTagById(tagId);
  if (!before) {
    throw new TagServiceError("Tag introuvable.", 404);
  }

  await deleteTag(tagId);

  await createTagAuditLog({
    actorUserId: session.id,
    actionType: "DELETE",
    entityId: String(before.id),
    targetLabel: before.name,
    summary: "Suppression d'un tag",
    beforeSnapshotJson: toTagAuditSnapshot(before),
  });
}

