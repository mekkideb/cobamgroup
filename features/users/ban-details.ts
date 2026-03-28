export const PRESET_BAN_REASON_OPTIONS = [
  {
    id: "policy_violation",
    label: "Violation des règles internes",
  },
  {
    id: "security_risk",
    label: "Risque de sécurité ou activité suspecte",
  },
  {
    id: "abusive_usage",
    label: "Utilisation abusive des outils internes",
  },
  {
    id: "access_revoked",
    label: "Accès retiré par l'administration",
  },
  {
    id: "offboarding",
    label: "Départ ou fin de mission",
  },
] as const;

export type BanReasonId = (typeof PRESET_BAN_REASON_OPTIONS)[number]["id"];
export type StaffUserStatus = "ACTIVE" | "SUSPENDED" | "BANNED" | "CLOSED";

export type UserBanDetails = {
  presetReasonIds: BanReasonId[];
  presetLabels: string[];
  otherReason: string | null;
  description: string | null;
  summary: string | null;
};

type StoredBanDetails = {
  presetReasonIds: BanReasonId[];
  otherReason: string | null;
  description: string | null;
};

const PRESET_LABELS = new Map<BanReasonId, string>(
  PRESET_BAN_REASON_OPTIONS.map((option) => [option.id, option.label]),
);

function normalizePresetReasonIds(value: unknown): BanReasonId[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is BanReasonId => {
    return typeof item === "string" && PRESET_LABELS.has(item as BanReasonId);
  });
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function buildBanSummary(input: {
  presetReasonIds?: BanReasonId[];
  otherReason?: string | null;
}): string | null {
  const labels = (input.presetReasonIds ?? [])
    .map((id) => PRESET_LABELS.get(id))
    .filter((label): label is string => Boolean(label));
  const otherReason = normalizeNullableString(input.otherReason);
  const parts = [...labels, ...(otherReason ? [otherReason] : [])];

  return parts.length > 0 ? parts.join(" - ") : null;
}

export function serializeBanDetails(input: {
  presetReasonIds?: BanReasonId[];
  otherReason?: string | null;
  description?: string | null;
}): string | null {
  const presetReasonIds = normalizePresetReasonIds(input.presetReasonIds ?? []);
  const otherReason = normalizeNullableString(input.otherReason);
  const description = normalizeNullableString(input.description);

  if (
    presetReasonIds.length === 0 &&
    otherReason == null &&
    description == null
  ) {
    return null;
  }

  const payload: StoredBanDetails = {
    presetReasonIds,
    otherReason,
    description,
  };

  return JSON.stringify(payload);
}

export function parseBanDetails(raw: string | null | undefined): UserBanDetails | null {
  const fallback = normalizeNullableString(raw);
  if (!fallback) return null;

  try {
    const parsed = JSON.parse(fallback) as Partial<StoredBanDetails>;
    const presetReasonIds = normalizePresetReasonIds(parsed.presetReasonIds ?? []);
    const otherReason = normalizeNullableString(parsed.otherReason);
    const description = normalizeNullableString(parsed.description);
    const presetLabels = presetReasonIds
      .map((id) => PRESET_LABELS.get(id))
      .filter((label): label is string => Boolean(label));
    const summary = buildBanSummary({ presetReasonIds, otherReason });

    return {
      presetReasonIds,
      presetLabels,
      otherReason,
      description,
      summary,
    };
  } catch {
    return {
      presetReasonIds: [],
      presetLabels: [],
      otherReason: null,
      description: fallback,
      summary: fallback,
    };
  }
}
