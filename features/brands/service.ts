import type { StaffSession } from "@/features/auth/types";
import { findImageMediaById, makeMediaPublic } from "@/features/media/repository";
import {
  canAccessBrands,
  canCreateBrands,
  canManageAnyBrands,
  canManageOwnBrands,
} from "./access";
import {
  countBrands,
  countProductFamiliesForBrand,
  createBrand,
  createBrandAuditLog,
  deleteBrand,
  findBrandById,
  findBrandByName,
  findBrandBySlug,
  listBrands,
  updateBrand,
} from "./repository";
import {
  mapBrandToDetailDto,
  mapBrandToListItemDto,
  toBrandAuditSnapshot,
} from "./mappers";
import type {
  BrandCreateInput,
  BrandListQuery,
  BrandListResult,
  BrandUpdateInput,
} from "./types";

export class BrandServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function canModifyBrand(session: StaffSession, ownerUserId: string | null) {
  return (
    canManageAnyBrands(session) ||
    (canManageOwnBrands(session) && ownerUserId != null && ownerUserId === session.id)
  );
}

async function assertUniqueBrandInput(
  input: { name: string; slug: string },
  options?: { excludeBrandId?: number },
) {
  const [sameSlug, sameName] = await Promise.all([
    findBrandBySlug(input.slug),
    findBrandByName(input.name),
  ]);

  if (
    sameSlug &&
    Number(sameSlug.id) !== (options?.excludeBrandId ?? -1)
  ) {
    throw new BrandServiceError("Une marque avec ce slug existe deja.", 400);
  }

  if (
    sameName &&
    Number(sameName.id) !== (options?.excludeBrandId ?? -1)
  ) {
    throw new BrandServiceError("Une marque avec ce nom existe deja.", 400);
  }
}

async function assertValidBrandLogo(logoMediaId: number | null) {
  if (logoMediaId == null) {
    return;
  }

  const media = await findImageMediaById(logoMediaId);
  if (!media) {
    throw new BrandServiceError("Le logo selectionne est introuvable ou invalide.", 400);
  }
}

async function ensurePublicBrandLogo(
  logoMediaId: number | null,
  showcasePlacement: "NONE" | "REFERENCE" | "PARTNER",
) {
  if (logoMediaId == null || showcasePlacement === "NONE") {
    return;
  }

  await makeMediaPublic(logoMediaId);
}

export async function listBrandsService(
  session: StaffSession,
  query: BrandListQuery,
): Promise<BrandListResult> {
  if (!canAccessBrands(session)) {
    throw new BrandServiceError("Accès refusé.", 403);
  }

  const [items, total] = await Promise.all([
    listBrands(query),
    countBrands(query),
  ]);

  return {
    items: items.map(mapBrandToListItemDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getBrandByIdService(
  session: StaffSession,
  brandId: number,
) {
  if (!canAccessBrands(session)) {
    throw new BrandServiceError("Accès refusé.", 403);
  }

  const brand = await findBrandById(brandId);
  if (!brand) {
    throw new BrandServiceError("Marque introuvable", 404);
  }

  return mapBrandToDetailDto(brand);
}

export async function createBrandService(
  session: StaffSession,
  input: BrandCreateInput,
) {
  if (!canCreateBrands(session)) {
    throw new BrandServiceError("Accès refusé.", 403);
  }

  await assertUniqueBrandInput(input);
  await assertValidBrandLogo(input.logoMediaId);

  const brand = await createBrand(session.id, input);
  await ensurePublicBrandLogo(input.logoMediaId, input.showcasePlacement);

  await createBrandAuditLog({
    actorUserId: session.id,
    actionType: "CREATE",
    entityId: String(brand.id),
    targetLabel: brand.name,
    summary: "Création d'une nouvelle marque",
    afterSnapshotJson: toBrandAuditSnapshot(brand),
  });

  return mapBrandToDetailDto(brand);
}

export async function updateBrandService(
  session: StaffSession,
  brandId: number,
  input: BrandUpdateInput,
) {
  if (!canAccessBrands(session)) {
    throw new BrandServiceError("Accès refusé.", 403);
  }

  const before = await findBrandById(brandId);
  if (!before) {
    throw new BrandServiceError("Marque introuvable", 404);
  }

  if (!canModifyBrand(session, before.ownerUserId)) {
    throw new BrandServiceError("Accès refusé.", 403);
  }

  await assertUniqueBrandInput(input, { excludeBrandId: brandId });
  await assertValidBrandLogo(input.logoMediaId);

  const brand = await updateBrand(brandId, session.id, input);
  await ensurePublicBrandLogo(input.logoMediaId, input.showcasePlacement);

  await createBrandAuditLog({
    actorUserId: session.id,
    actionType: "UPDATE",
    entityId: String(brand.id),
    targetLabel: brand.name,
    summary: "Mise à jour d'une marque",
    beforeSnapshotJson: toBrandAuditSnapshot(before),
    afterSnapshotJson: toBrandAuditSnapshot(brand),
  });

  return mapBrandToDetailDto(brand);
}

export async function deleteBrandService(
  session: StaffSession,
  brandId: number,
) {
  if (!canAccessBrands(session)) {
    throw new BrandServiceError("Accès refusé.", 403);
  }

  const before = await findBrandById(brandId);
  if (!before) {
    throw new BrandServiceError("Marque introuvable", 404);
  }

  if (!canModifyBrand(session, before.ownerUserId)) {
    throw new BrandServiceError("Accès refusé.", 403);
  }

  const linkedProductFamilies = await countProductFamiliesForBrand(brandId);
  if (linkedProductFamilies > 0) {
    throw new BrandServiceError(
      "Impossible de supprimer une marque encore liee a des produits.",
      400,
    );
  }

  const brand = await deleteBrand(brandId);

  await createBrandAuditLog({
    actorUserId: session.id,
    actionType: "DELETE",
    entityId: String(brand.id),
    targetLabel: brand.name,
    summary: "Suppression d'une marque",
    beforeSnapshotJson: toBrandAuditSnapshot(before),
    afterSnapshotJson: toBrandAuditSnapshot(brand),
  });
}

