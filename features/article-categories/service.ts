import type { StaffSession } from "@/features/auth/types";
import { canAffectTargetUser } from "@/features/rbac/roles";
import { hasPermission } from "@/features/rbac/access";
import { PERMISSIONS } from "@/features/rbac/permissions";
import {
  canAccessArticleCategories,
  canCreateArticleCategories,
  canUseArticleCategoryOptions,
} from "./access";
import {
  mapArticleCategoryToDetailDto,
  mapArticleCategoryToListItemDto,
  resolveArticleCategoryCreatorAccess,
  toArticleCategoryAuditSnapshot,
} from "./mappers";
import {
  createArticleCategory,
  createArticleCategoryAuditLog,
  deleteArticleCategory,
  detachArticlesAndDeleteArticleCategory,
  findArticleCategoryById,
  findArticleCategoryByName,
  findArticleCategoryBySlug,
  listArticleCategories,
  listArticleCategoryOptions,
  updateArticleCategory,
} from "./repository";
import type {
  ArticleCategoryDeleteOptions,
  ArticleCategoryDeleteResult,
  ArticleCategoryListQuery,
  ArticleCategoryListResult,
  ArticleCategoryMutationInput,
  ArticleCategoryOptionDto,
} from "./types";

export class ArticleCategoryServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type ArticleCategoryRecord = NonNullable<
  Awaited<ReturnType<typeof findArticleCategoryById>>
>;

function canDeleteArticleCategoryRecord(
  session: StaffSession,
  category: ArticleCategoryRecord,
) {
  if (hasPermission(session, PERMISSIONS.ARTICLE_CATEGORIES_DELETE_ALL)) {
    return true;
  }

  if (
    hasPermission(session, PERMISSIONS.ARTICLE_CATEGORIES_DELETE_OWN) &&
    category.createdByUserId != null &&
    category.createdByUserId === session.id
  ) {
    return true;
  }

  if (!hasPermission(session, PERMISSIONS.ARTICLE_CATEGORIES_DELETE_BELOW_ROLE)) {
    return false;
  }

  const creatorAccess = resolveArticleCategoryCreatorAccess(category.createdByUser);

  if (!creatorAccess || !category.createdByUser) {
    return false;
  }

  return canAffectTargetUser(session, {
    id: category.createdByUser.id,
    powerType: category.createdByUser.powerType,
    effectiveRole: creatorAccess.effectiveRole,
  });
}

function canForceRemoveArticleCategoryRecord(
  session: StaffSession,
  category: ArticleCategoryRecord,
) {
  const hasForcePermission =
    hasPermission(session, PERMISSIONS.ARTICLE_CATEGORIES_FORCE_REMOVE_ALL) ||
    hasPermission(session, PERMISSIONS.ARTICLE_CATEGORIES_FORCE_REMOVE_BELOW_ROLE) ||
    hasPermission(session, PERMISSIONS.ARTICLE_CATEGORIES_FORCE_REMOVE_OWN);

  if (!hasForcePermission) {
    return false;
  }

  if (!canDeleteArticleCategoryRecord(session, category)) {
    return false;
  }

  if (hasPermission(session, PERMISSIONS.ARTICLE_CATEGORIES_FORCE_REMOVE_ALL)) {
    return true;
  }

  if (
    hasPermission(session, PERMISSIONS.ARTICLE_CATEGORIES_FORCE_REMOVE_OWN) &&
    category.createdByUserId != null &&
    category.createdByUserId === session.id
  ) {
    return true;
  }

  if (!hasPermission(session, PERMISSIONS.ARTICLE_CATEGORIES_FORCE_REMOVE_BELOW_ROLE)) {
    return false;
  }

  const creatorAccess = resolveArticleCategoryCreatorAccess(category.createdByUser);

  if (!creatorAccess || !category.createdByUser) {
    return false;
  }

  return canAffectTargetUser(session, {
    id: category.createdByUser.id,
    powerType: category.createdByUser.powerType,
    effectiveRole: creatorAccess.effectiveRole,
  });
}

function canViewArticleCategoryRecord(
  session: StaffSession,
  category: ArticleCategoryRecord,
) {
  return (
    hasPermission(session, PERMISSIONS.ARTICLE_CATEGORIES_VIEW) ||
    canCreateArticleCategories(session) ||
    canDeleteArticleCategoryRecord(session, category) ||
    canForceRemoveArticleCategoryRecord(session, category)
  );
}

function getArticleCategoryAbilities(
  session: StaffSession,
  category: ArticleCategoryRecord,
) {
  return {
    canEdit: canCreateArticleCategories(session),
    canDelete: canDeleteArticleCategoryRecord(session, category),
    canForceRemove: canForceRemoveArticleCategoryRecord(session, category),
  };
}

async function assertUniqueArticleCategoryInput(
  input: ArticleCategoryMutationInput,
  options?: { excludeCategoryId?: number },
) {
  const [sameSlug, sameName] = await Promise.all([
    findArticleCategoryBySlug(input.slug),
    findArticleCategoryByName(input.name),
  ]);

  if (
    sameSlug &&
    Number(sameSlug.id) !== (options?.excludeCategoryId ?? -1)
  ) {
    throw new ArticleCategoryServiceError(
      "Une catégorie d'articles avec ce slug existe déjà.",
      400,
    );
  }

  if (
    sameName &&
    Number(sameName.id) !== (options?.excludeCategoryId ?? -1)
  ) {
    throw new ArticleCategoryServiceError(
      "Une catégorie d'articles avec ce nom existe déjà.",
      400,
    );
  }
}

export async function listArticleCategoriesService(
  session: StaffSession,
  query: ArticleCategoryListQuery,
): Promise<ArticleCategoryListResult> {
  if (!canAccessArticleCategories(session)) {
    throw new ArticleCategoryServiceError("Accès refusé.", 403);
  }

  const records = await listArticleCategories(query);
  const visibleRecords = records.filter((category) =>
    canViewArticleCategoryRecord(session, category),
  );
  const total = visibleRecords.length;
  const start = (query.page - 1) * query.pageSize;
  const items = visibleRecords
    .slice(start, start + query.pageSize)
    .map((category) =>
      mapArticleCategoryToListItemDto(
        category,
        getArticleCategoryAbilities(session, category),
      ),
    );

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getArticleCategoryByIdService(
  session: StaffSession,
  categoryId: number,
) {
  if (!canAccessArticleCategories(session)) {
    throw new ArticleCategoryServiceError("Accès refusé.", 403);
  }

  const category = await findArticleCategoryById(categoryId);

  if (!category) {
    throw new ArticleCategoryServiceError(
      "Catégorie d'articles introuvable.",
      404,
    );
  }

  if (!canViewArticleCategoryRecord(session, category)) {
    throw new ArticleCategoryServiceError("Accès refusé.", 403);
  }

  return mapArticleCategoryToDetailDto(
    category,
    getArticleCategoryAbilities(session, category),
  );
}

export async function listArticleCategoryOptionsService(
  session: StaffSession,
): Promise<ArticleCategoryOptionDto[]> {
  if (!canUseArticleCategoryOptions(session)) {
    throw new ArticleCategoryServiceError("Accès refusé.", 403);
  }

  const items = await listArticleCategoryOptions();

  return items.map((item) => ({
    id: Number(item.id),
    name: item.name,
    color: item.color,
  }));
}

export async function createArticleCategoryService(
  session: StaffSession,
  input: ArticleCategoryMutationInput,
) {
  if (!canCreateArticleCategories(session)) {
    throw new ArticleCategoryServiceError("Accès refusé.", 403);
  }

  await assertUniqueArticleCategoryInput(input);

  const category = await createArticleCategory(session.id, input);

  await createArticleCategoryAuditLog({
    actorUserId: session.id,
    actionType: "CREATE",
    entityId: String(category.id),
    targetLabel: category.name,
    summary: "Création d'une catégorie d'articles",
    afterSnapshotJson: toArticleCategoryAuditSnapshot(category),
  });

  return mapArticleCategoryToDetailDto(
    category,
    getArticleCategoryAbilities(session, category),
  );
}

export async function updateArticleCategoryService(
  session: StaffSession,
  categoryId: number,
  input: ArticleCategoryMutationInput,
) {
  if (!canCreateArticleCategories(session)) {
    throw new ArticleCategoryServiceError("Accès refusé.", 403);
  }

  const before = await findArticleCategoryById(categoryId);

  if (!before) {
    throw new ArticleCategoryServiceError(
      "Catégorie d'articles introuvable.",
      404,
    );
  }

  await assertUniqueArticleCategoryInput(input, {
    excludeCategoryId: categoryId,
  });

  const category = await updateArticleCategory(categoryId, session.id, input);

  await createArticleCategoryAuditLog({
    actorUserId: session.id,
    actionType: "UPDATE",
    entityId: String(category.id),
    targetLabel: category.name,
    summary: "Mise à jour d'une catégorie d'articles",
    beforeSnapshotJson: toArticleCategoryAuditSnapshot(before),
    afterSnapshotJson: toArticleCategoryAuditSnapshot(category),
  });

  return mapArticleCategoryToDetailDto(
    category,
    getArticleCategoryAbilities(session, category),
  );
}

export async function deleteArticleCategoryService(
  session: StaffSession,
  categoryId: number,
  options: ArticleCategoryDeleteOptions = {},
): Promise<ArticleCategoryDeleteResult> {
  const category = await findArticleCategoryById(categoryId);

  if (!category) {
    throw new ArticleCategoryServiceError(
      "Catégorie d'articles introuvable.",
      404,
    );
  }

  const forceRemove = options.force === true;

  if (
    forceRemove
      ? !canForceRemoveArticleCategoryRecord(session, category)
      : !canDeleteArticleCategoryRecord(session, category)
  ) {
    throw new ArticleCategoryServiceError("Accès refusé.", 403);
  }

  if (!forceRemove && category._count.articleLinks > 0) {
    throw new ArticleCategoryServiceError(
      "Cette catégorie est encore rattachée à des articles. Utilisez Forcer la suppression pour la détacher avant suppression.",
      400,
    );
  }

  const result = forceRemove
    ? await detachArticlesAndDeleteArticleCategory(categoryId)
    : {
        deletedCategory: await deleteArticleCategory(categoryId),
        detachedArticlesCount: 0,
      };

  await createArticleCategoryAuditLog({
    actorUserId: session.id,
    actionType: "DELETE",
    entityId: String(category.id),
    targetLabel: category.name,
    summary: forceRemove
      ? `Suppression forcée d'une catégorie d'articles (${result.detachedArticlesCount} article(s) détaché(s))`
      : "Suppression d'une catégorie d'articles",
    beforeSnapshotJson: toArticleCategoryAuditSnapshot(category),
    afterSnapshotJson: toArticleCategoryAuditSnapshot(result.deletedCategory),
  });

  return {
    detachedArticlesCount: result.detachedArticlesCount,
  };
}
