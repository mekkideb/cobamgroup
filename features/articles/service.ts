import { ArticleStatus } from "@prisma/client";
import type { StaffSession } from "@/features/auth/types";
import { canAccessArticles, canCreateArticles } from "@/features/articles/access";
import { extractArticleMediaIds } from "@/features/articles/document";
import {
  mapArticleToDetailDto,
  mapArticleToListItemDto,
  mapAuthorRecordToAssignableDto,
  toAuditSnapshot,
} from "@/features/articles/mappers";
import { findImageMediaById, makeMediaPublicMany } from "@/features/media/repository";
import { hasPermission } from "@/features/rbac/access";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { canAffectTargetUser } from "@/features/rbac/roles";
import { resolveAccessFromAssignments } from "@/features/rbac/user-access";
import { resolveOrCreateTagsByNames } from "@/features/tags/repository";
import type {
  ArticleAuthorOptionsQuery,
  ArticleAuthorOptionsResult,
  ArticleCreateInput,
  ArticleDetailDto,
  ArticleListQuery,
  ArticleListResult,
  ArticleUpdateInput,
} from "./types";
import {
  createArticle,
  createArticleAuditLog,
  deleteArticle,
  findArticleAuthorCandidatesByIds,
  findExistingArticleCategoryIds,
  findArticleById,
  listArticleAuthorOptions,
  listArticles,
  updateArticle,
  updateArticleStatus,
} from "./repository";

export class ArticleServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type ArticleRecord = NonNullable<Awaited<ReturnType<typeof findArticleById>>>;

type ScopedPermissionSet = {
  all: string;
  belowRole: string;
  own: string;
};

const UPDATE_PERMISSIONS: ScopedPermissionSet = {
  all: PERMISSIONS.ARTICLES_UPDATE_ALL,
  belowRole: PERMISSIONS.ARTICLES_UPDATE_BELOW_ROLE,
  own: PERMISSIONS.ARTICLES_UPDATE_OWN,
};

const AUTHORS_UPDATE_PERMISSIONS: ScopedPermissionSet = {
  all: PERMISSIONS.ARTICLES_AUTHORS_UPDATE_ALL,
  belowRole: PERMISSIONS.ARTICLES_AUTHORS_UPDATE_BELOW_ROLE,
  own: PERMISSIONS.ARTICLES_AUTHORS_UPDATE_OWN,
};

const DELETE_PERMISSIONS: ScopedPermissionSet = {
  all: PERMISSIONS.ARTICLES_DELETE_ALL,
  belowRole: PERMISSIONS.ARTICLES_DELETE_BELOW_ROLE,
  own: PERMISSIONS.ARTICLES_DELETE_OWN,
};

const PUBLISH_PERMISSIONS: ScopedPermissionSet = {
  all: PERMISSIONS.ARTICLES_PUBLISH_ALL,
  belowRole: PERMISSIONS.ARTICLES_PUBLISH_BELOW_ROLE,
  own: PERMISSIONS.ARTICLES_PUBLISH_OWN,
};

const UNPUBLISH_PERMISSIONS: ScopedPermissionSet = {
  all: PERMISSIONS.ARTICLES_UNPUBLISH_ALL,
  belowRole: PERMISSIONS.ARTICLES_UNPUBLISH_BELOW_ROLE,
  own: PERMISSIONS.ARTICLES_UNPUBLISH_OWN,
};

function isArticleAuthor(article: ArticleRecord, userId: string) {
  return (
    article.authorId === userId ||
    article.authorLinks.some((link) => link.userId === userId)
  );
}

function getOriginalAuthorAccess(article: ArticleRecord) {
  return resolveAccessFromAssignments({
    powerType: article.author.powerType,
    status: article.author.status,
    assignments: article.author.receivedRoleAssignments,
  });
}

function isOriginalAuthorBelowActor(
  session: StaffSession,
  article: ArticleRecord,
) {
  const authorAccess = getOriginalAuthorAccess(article);

  return canAffectTargetUser(session, {
    id: article.author.id,
    powerType: article.author.powerType,
    effectiveRole: authorAccess.effectiveRole,
  });
}

function canActOnArticle(
  session: StaffSession,
  article: ArticleRecord,
  permissions: ScopedPermissionSet,
) {
  if (hasPermission(session, permissions.all)) {
    return true;
  }

  if (
    hasPermission(session, permissions.belowRole) &&
    isOriginalAuthorBelowActor(session, article)
  ) {
    return true;
  }

  return hasPermission(session, permissions.own) && isArticleAuthor(article, session.id);
}

function canViewArticle(session: StaffSession, article: ArticleRecord) {
  return (
    hasPermission(session, PERMISSIONS.ARTICLES_VIEW_ALL) ||
    (hasPermission(session, PERMISSIONS.ARTICLES_VIEW_OWN) &&
      isArticleAuthor(article, session.id)) ||
    canActOnArticle(session, article, UPDATE_PERMISSIONS) ||
    canActOnArticle(session, article, AUTHORS_UPDATE_PERMISSIONS) ||
    canActOnArticle(session, article, DELETE_PERMISSIONS) ||
    canActOnArticle(session, article, PUBLISH_PERMISSIONS) ||
    canActOnArticle(session, article, UNPUBLISH_PERMISSIONS)
  );
}

function canManageAuthorsOnNewArticle(session: StaffSession) {
  return (
    hasPermission(session, AUTHORS_UPDATE_PERMISSIONS.all) ||
    hasPermission(session, AUTHORS_UPDATE_PERMISSIONS.own)
  );
}

function getArticleAbilities(session: StaffSession, article: ArticleRecord) {
  return {
    canEdit: canActOnArticle(session, article, UPDATE_PERMISSIONS),
    canManageAuthors: canActOnArticle(session, article, AUTHORS_UPDATE_PERMISSIONS),
    canPublish:
      article.status === ArticleStatus.PUBLISHED
        ? canActOnArticle(session, article, UNPUBLISH_PERMISSIONS)
        : canActOnArticle(session, article, PUBLISH_PERMISSIONS),
    canDelete: canActOnArticle(session, article, DELETE_PERMISSIONS),
  };
}

function normalizeArticleAuthorIds(
  authorId: string,
  authorIds: readonly string[],
) {
  return [...new Set(authorIds.map((candidate) => candidate.trim()).filter(Boolean))].filter(
    (candidate) => candidate !== authorId,
  );
}

function haveSameStringSets(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSet = new Set(left);
  return right.every((value) => leftSet.has(value));
}

function hasArticleContentChanges(article: ArticleRecord, input: ArticleUpdateInput) {
  const currentCategoryAssignments = article.categoryLinks.map((link) => ({
    categoryId: Number(link.categoryId),
    score: link.score,
  }));

  const nextCategoryAssignments = input.categoryAssignments.map((assignment) => ({
    categoryId: assignment.categoryId,
    score: assignment.score,
  }));

  const currentTagNames = article.tagLinks.map((link) => link.tag.name);
  const nextTagNames = [...input.tagNames];

  return !(
    article.title === input.title &&
    article.displayTitle === input.displayTitle &&
    article.slug === input.slug &&
    article.excerpt === input.excerpt &&
    article.content === input.content &&
    article.descriptionSeo === input.descriptionSeo &&
    JSON.stringify(currentCategoryAssignments) ===
      JSON.stringify(nextCategoryAssignments) &&
    JSON.stringify(currentTagNames) === JSON.stringify(nextTagNames) &&
    (article.coverMediaId != null ? Number(article.coverMediaId) : null) === input.coverMediaId &&
    article.ogTitle === input.ogTitle &&
    article.ogDescription === input.ogDescription &&
    (article.ogImageMediaId != null ? Number(article.ogImageMediaId) : null) ===
      input.ogImageMediaId &&
    article.noIndex === input.noIndex &&
    article.noFollow === input.noFollow &&
    article.schemaType === input.schemaType
  );
}

async function assertValidRelations(input: {
  categoryAssignments: ArticleCreateInput["categoryAssignments"];
  coverMediaId: number | null;
  ogImageMediaId: number | null;
}) {
  if (input.categoryAssignments.length > 0) {
    const normalizedAssignments = input.categoryAssignments.map((assignment) => ({
      categoryId: assignment.categoryId,
      score: assignment.score,
    }));
    const categoryIds = normalizedAssignments.map((assignment) => assignment.categoryId);
    const uniqueCategoryIds = new Set(categoryIds);

    if (uniqueCategoryIds.size !== categoryIds.length) {
      throw new ArticleServiceError(
        "Une catégorie ne peut être ajoutée qu'une seule fois à un article.",
        400,
      );
    }

    const hasInvalidScore = normalizedAssignments.some(
      (assignment) =>
        !Number.isInteger(assignment.score) ||
        assignment.score <= 0 ||
        assignment.score > 100,
    );

    if (hasInvalidScore) {
      throw new ArticleServiceError(
        "Chaque score de catégorie doit être un entier entre 1 et 100.",
        400,
      );
    }

    const totalScore = normalizedAssignments.reduce(
      (sum, assignment) => sum + assignment.score,
      0,
    );

    if (totalScore !== 100) {
      throw new ArticleServiceError(
        "Le total des scores de catégories doit être égal à 100%.",
        400,
      );
    }

    const existingCategoryIds = new Set(
      await findExistingArticleCategoryIds(categoryIds),
    );

    if (existingCategoryIds.size !== categoryIds.length) {
      throw new ArticleServiceError(
        "Une ou plusieurs catégories d'articles sont introuvables.",
        400,
      );
    }
  }

  if (input.coverMediaId != null) {
    const exists = await findImageMediaById(input.coverMediaId);
    if (!exists) {
      throw new ArticleServiceError("Invalid coverMediaId", 400);
    }
  }

  if (input.ogImageMediaId != null) {
    const exists = await findImageMediaById(input.ogImageMediaId);
    if (!exists) {
      throw new ArticleServiceError("Invalid ogImageMediaId", 400);
    }
  }
}

async function assertValidAuthorIds(authorIds: readonly string[]) {
  const normalizedAuthorIds = [...new Set(authorIds.map((authorId) => authorId.trim()).filter(Boolean))];

  if (normalizedAuthorIds.length === 0) {
    return;
  }

  const authors = await findArticleAuthorCandidatesByIds(normalizedAuthorIds);

  if (authors.length !== normalizedAuthorIds.length) {
    throw new ArticleServiceError("Un ou plusieurs auteurs sont introuvables.", 400);
  }

  const invalidAuthor = authors.find(
    (author) => author.status === "BANNED" || author.status === "CLOSED",
  );

  if (invalidAuthor) {
    throw new ArticleServiceError(
      "Un auteur ferme ou banni ne peut pas etre ajoute a un article.",
      400,
    );
  }
}

async function resolveArticleTagIds(tagNames: readonly string[]) {
  const tags = await resolveOrCreateTagsByNames(tagNames);
  return tags.map((tag) => Number(tag.id));
}

async function ensureArticleMediaIsPublic(input: {
  coverMediaId: number | null;
  ogImageMediaId: number | null;
  content: string;
}) {
  const mediaIds = [
    ...(input.coverMediaId != null ? [input.coverMediaId] : []),
    ...(input.ogImageMediaId != null ? [input.ogImageMediaId] : []),
    ...extractArticleMediaIds(input.content),
  ];

  await makeMediaPublicMany(mediaIds);
}

export async function listArticlesService(
  session: StaffSession,
  query: ArticleListQuery,
): Promise<ArticleListResult> {
  if (!canAccessArticles(session)) {
    throw new ArticleServiceError("Forbidden", 403);
  }

  const records = await listArticles(query);
  const accessibleItems = records.filter((article) => canViewArticle(session, article));
  const total = accessibleItems.length;
  const startIndex = (query.page - 1) * query.pageSize;
  const items = accessibleItems
    .slice(startIndex, startIndex + query.pageSize)
    .map(mapArticleToListItemDto);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getArticleByIdService(
  session: StaffSession,
  articleId: number,
): Promise<ArticleDetailDto> {
  if (!canAccessArticles(session)) {
    throw new ArticleServiceError("Forbidden", 403);
  }

  const article = await findArticleById(articleId);

  if (!article) {
    throw new ArticleServiceError("Article not found", 404);
  }

  if (!canViewArticle(session, article)) {
    throw new ArticleServiceError("Forbidden", 403);
  }

  return mapArticleToDetailDto(article, getArticleAbilities(session, article));
}

export async function listArticleAuthorOptionsService(
  session: StaffSession,
  query: ArticleAuthorOptionsQuery,
): Promise<ArticleAuthorOptionsResult> {
  if (query.articleId != null) {
    const article = await findArticleById(query.articleId);

    if (!article) {
      throw new ArticleServiceError("Article not found", 404);
    }

    if (!canActOnArticle(session, article, AUTHORS_UPDATE_PERMISSIONS)) {
      throw new ArticleServiceError("Forbidden", 403);
    }
  } else if (!canCreateArticles(session) || !canManageAuthorsOnNewArticle(session)) {
    throw new ArticleServiceError("Forbidden", 403);
  }

  const items = await listArticleAuthorOptions(query);

  return {
    items: items.map(mapAuthorRecordToAssignableDto),
  };
}

export async function createArticleService(
  session: StaffSession,
  input: ArticleCreateInput,
) {
  if (!canCreateArticles(session)) {
    throw new ArticleServiceError("Forbidden", 403);
  }

  if (input.authorIds.length > 0 && !canManageAuthorsOnNewArticle(session)) {
    throw new ArticleServiceError("Forbidden", 403);
  }

  const [resolvedTagIds] = await Promise.all([
    resolveArticleTagIds(input.tagNames),
    assertValidRelations({
      categoryAssignments: input.categoryAssignments,
      coverMediaId: input.coverMediaId,
      ogImageMediaId: input.ogImageMediaId,
    }),
    assertValidAuthorIds(normalizeArticleAuthorIds(session.id, input.authorIds)),
  ]);

  const article = await createArticle(session.id, {
    ...input,
    tagIds: resolvedTagIds,
  });

  await createArticleAuditLog({
    actorUserId: session.id,
    actionType: "CREATE",
    entityId: String(article.id),
    targetLabel: article.title,
    summary: "Création d'un nouvel article",
    afterSnapshotJson: toAuditSnapshot(article),
  });

  return mapArticleToDetailDto(article, getArticleAbilities(session, article));
}

export async function updateArticleService(
  session: StaffSession,
  articleId: number,
  input: ArticleUpdateInput,
) {
  const before = await findArticleById(articleId);

  if (!before) {
    throw new ArticleServiceError("Article not found", 404);
  }

  const abilities = getArticleAbilities(session, before);
  const nextAuthorIds = normalizeArticleAuthorIds(before.authorId, input.authorIds);
  const previousAuthorIds = before.authorLinks.map((link) => link.userId);
  const hasAuthorChanges = !haveSameStringSets(previousAuthorIds, nextAuthorIds);
  const hasContentChanges = hasArticleContentChanges(before, input);

  if (hasContentChanges && !abilities.canEdit) {
    throw new ArticleServiceError("Forbidden", 403);
  }

  if (hasAuthorChanges && !abilities.canManageAuthors) {
    throw new ArticleServiceError("Forbidden", 403);
  }

  if (!hasContentChanges && !hasAuthorChanges && !abilities.canEdit && !abilities.canManageAuthors) {
    throw new ArticleServiceError("Forbidden", 403);
  }

  const [resolvedTagIds] = await Promise.all([
    resolveArticleTagIds(input.tagNames),
    assertValidRelations({
      categoryAssignments: input.categoryAssignments,
      coverMediaId: input.coverMediaId,
      ogImageMediaId: input.ogImageMediaId,
    }),
    hasAuthorChanges ? assertValidAuthorIds(nextAuthorIds) : Promise.resolve(),
  ]);

  const article = await updateArticle(articleId, before.authorId, {
    ...input,
    authorIds: nextAuthorIds,
    tagIds: resolvedTagIds,
  });

  if (article.status === ArticleStatus.PUBLISHED) {
    await ensureArticleMediaIsPublic({
      coverMediaId: article.coverMediaId != null ? Number(article.coverMediaId) : null,
      ogImageMediaId:
        article.ogImageMediaId != null ? Number(article.ogImageMediaId) : null,
      content: article.content,
    });
  }

  await createArticleAuditLog({
    actorUserId: session.id,
    actionType: "UPDATE",
    entityId: String(article.id),
    targetLabel: article.title,
    summary: "Mise à jour d'un article",
    beforeSnapshotJson: toAuditSnapshot(before),
    afterSnapshotJson: toAuditSnapshot(article),
  });

  return mapArticleToDetailDto(article, getArticleAbilities(session, article));
}

export async function publishArticleService(
  session: StaffSession,
  articleId: number,
) {
  const before = await findArticleById(articleId);

  if (!before) {
    throw new ArticleServiceError("Article not found", 404);
  }

  if (!canActOnArticle(session, before, PUBLISH_PERMISSIONS)) {
    throw new ArticleServiceError("Forbidden", 403);
  }

  const article = await updateArticleStatus(
    articleId,
    ArticleStatus.PUBLISHED,
    before.publishedAt ?? new Date(),
  );

  await ensureArticleMediaIsPublic({
    coverMediaId: article.coverMediaId != null ? Number(article.coverMediaId) : null,
    ogImageMediaId:
      article.ogImageMediaId != null ? Number(article.ogImageMediaId) : null,
    content: article.content,
  });

  await createArticleAuditLog({
    actorUserId: session.id,
    actionType: "PUBLISH",
    entityId: String(article.id),
    targetLabel: article.title,
    summary: "Publication de l'article",
    beforeSnapshotJson: toAuditSnapshot(before),
    afterSnapshotJson: toAuditSnapshot(article),
  });

  return mapArticleToDetailDto(article, getArticleAbilities(session, article));
}

export async function unpublishArticleService(
  session: StaffSession,
  articleId: number,
) {
  const before = await findArticleById(articleId);

  if (!before) {
    throw new ArticleServiceError("Article not found", 404);
  }

  if (!canActOnArticle(session, before, UNPUBLISH_PERMISSIONS)) {
    throw new ArticleServiceError("Forbidden", 403);
  }

  const article = await updateArticleStatus(
    articleId,
    ArticleStatus.DRAFT,
  );

  await createArticleAuditLog({
    actorUserId: session.id,
    actionType: "UNPUBLISH",
    entityId: String(article.id),
    targetLabel: article.title,
    summary: "Depublication de l'article",
    beforeSnapshotJson: toAuditSnapshot(before),
    afterSnapshotJson: toAuditSnapshot(article),
  });

  return mapArticleToDetailDto(article, getArticleAbilities(session, article));
}

export async function deleteArticleService(
  session: StaffSession,
  articleId: number,
) {
  const before = await findArticleById(articleId);

  if (!before) {
    throw new ArticleServiceError("Article not found", 404);
  }

  if (!canActOnArticle(session, before, DELETE_PERMISSIONS)) {
    throw new ArticleServiceError("Forbidden", 403);
  }

  const article = await deleteArticle(articleId);

  await createArticleAuditLog({
    actorUserId: session.id,
    actionType: "DELETE",
    entityId: String(article.id),
    targetLabel: article.title,
    summary: "Suppression definitive d'un article",
    beforeSnapshotJson: toAuditSnapshot(before),
  });
}
