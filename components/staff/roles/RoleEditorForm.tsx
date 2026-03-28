"use client";

import Panel from "@/components/staff/ui/Panel";
import StaffSelect from "@/components/staff/ui/PanelSelect";
import StaffBadge from "@/components/staff/ui/StaffBadge";
import {
  hasArticleCategoryForceRemovePrerequisites,
  hasMediaForceRemovePrerequisites,
  normalizeArticleCategoryForceRemovePermissionDependencies,
  MEDIA_ACCESS_PERMISSION_KEYS,
  MEDIA_MANAGE_PERMISSION_KEYS,
  PERMISSION_DEFINITIONS,
  PERMISSIONS,
  STAFF_BASE_PERMISSION_KEYS,
  normalizeMediaForceRemovePermissionDependencies,
  type PermissionDefinition,
  type PermissionKey,
} from "@/features/rbac/permissions";
import type { RoleMutationInput } from "@/features/roles/types";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import PanelField from "../ui/PanelField";
import PanelInput from "../ui/PanelInput";
import BooleanButton from "../ui/BooleanButton";

export type RoleFormState = {
  key: string;
  name: string;
  color: string;
  priorityIndex: number;
  description: string;
  permissions: PermissionKey[];
  isActive: boolean;
};

type PermissionFamily = {
  key: string;
  resource: string;
  action: string;
  group: string;
  label: string;
  description: string | null;
  permissions: PermissionDefinition[];
  supportsScopeSelection: boolean;
};

const scopeLabels: Record<string, string> = {
  all: "Tout",
  below_role: "Sous mon rôle",
  own: "Mes éléments",
  self: "Moi-même",
};

const scopeSelectionOrder = ["self", "own", "below_role", "all"] as const;
const scopeNormalizationOrder = ["all", "below_role", "own", "self"] as const;
const staffBasePermissionKeySet = new Set<PermissionKey>(
  STAFF_BASE_PERMISSION_KEYS,
);
const mediaAccessPermissionKeySet = new Set<PermissionKey>(
  MEDIA_ACCESS_PERMISSION_KEYS,
);
const mediaManagePermissionKeySet = new Set<PermissionKey>(
  MEDIA_MANAGE_PERMISSION_KEYS,
);

function getScopeOrderIndex(
  scope: string | null | undefined,
  order: readonly string[],
) {
  if (!scope) return order.length;

  const index = order.indexOf(scope);
  return index === -1 ? order.length : index;
}

function buildPermissionFamilyLabel(permissions: PermissionDefinition[]) {
  const source =
    permissions.find((permission) => permission.scope === "all") ??
    permissions.find((permission) => permission.scope === "below_role") ??
    permissions.find((permission) => permission.scope === "own") ??
    permissions[0];

  if (!source) {
    return "";
  }

  if (!source.scope || permissions.length === 1) {
    return source.label;
  }

  return source.label
    .replace(/\s+sous mon rôle$/i, "")
    .replace(/\s+sous mon rôle$/i, "")
    .replace(/\btous les\b/gi, "les")
    .replace(/\btoutes les\b/gi, "les")
    .replace(/\bmes\b/gi, "les")
    .replace(/\bmon\b/gi, "le")
    .replace(/\bma\b/gi, "la")
    .replace(/\bde les\b/gi, "des")
    .replace(/\bde le\b/gi, "du")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePermissionGroup(definition: PermissionDefinition) {
  return definition.resource === "media" ? "Médias" : definition.group;
}

const permissionFamiliesByGroup = Array.from(
  PERMISSION_DEFINITIONS.reduce((groups, definition) => {
    const normalizedGroup = normalizePermissionGroup(definition);
    const groupFamilies =
      groups.get(normalizedGroup) ?? new Map<string, PermissionDefinition[]>();
    const familyKey = `${definition.resource}:${definition.action}`;
    const familyPermissions = groupFamilies.get(familyKey) ?? [];
    familyPermissions.push(definition);
    groupFamilies.set(familyKey, familyPermissions);
    groups.set(normalizedGroup, groupFamilies);
    return groups;
  }, new Map<string, Map<string, PermissionDefinition[]>>()),
).reduce(
  (accumulator, [group, families]) => {
    accumulator[group] = Array.from(families.entries())
      .map(([familyKey, permissions]) => {
        const orderedPermissions = [...permissions].sort(
          (left, right) =>
            getScopeOrderIndex(left.scope, scopeSelectionOrder) -
              getScopeOrderIndex(right.scope, scopeSelectionOrder) ||
            left.label.localeCompare(right.label, "fr-FR") ||
            left.key.localeCompare(right.key, "fr-FR"),
        );

        return {
          key: familyKey,
          resource: orderedPermissions[0]?.resource ?? "",
          action: orderedPermissions[0]?.action ?? "",
          group,
          label: buildPermissionFamilyLabel(orderedPermissions),
          description:
            orderedPermissions.find((permission) => permission.description)
              ?.description ?? null,
          permissions: orderedPermissions,
          supportsScopeSelection:
            orderedPermissions.filter((permission) => permission.scope).length >
            1,
        } satisfies PermissionFamily;
      })
      .sort(
        (left, right) =>
          left.label.localeCompare(right.label, "fr-FR") ||
          left.key.localeCompare(right.key, "fr-FR"),
      );

    return accumulator;
  },
  {} as Record<string, PermissionFamily[]>,
);

function selectPermissionForNormalization(
  permissions: PermissionDefinition[],
): PermissionDefinition {
  return [...permissions].sort(
    (left, right) =>
      getScopeOrderIndex(left.scope, scopeNormalizationOrder) -
        getScopeOrderIndex(right.scope, scopeNormalizationOrder) ||
      left.key.localeCompare(right.key, "fr-FR"),
  )[0];
}

function selectDefaultPermissionForFamily(family: PermissionFamily) {
  return [...family.permissions].sort(
    (left, right) =>
      getScopeOrderIndex(left.scope, scopeSelectionOrder) -
        getScopeOrderIndex(right.scope, scopeSelectionOrder) ||
      left.key.localeCompare(right.key, "fr-FR"),
  )[0];
}

function normalizePermissionSelection(permissions: PermissionKey[]) {
  const selectedKeys = new Set<PermissionKey>(permissions);
  const normalized: PermissionKey[] = [];

  for (const families of Object.values(permissionFamiliesByGroup)) {
    for (const family of families) {
      const selectedPermissions = family.permissions.filter((permission) =>
        selectedKeys.has(permission.key),
      );

      if (selectedPermissions.length === 0) {
        continue;
      }

      normalized.push(selectPermissionForNormalization(selectedPermissions).key);
    }
  }

  return normalized;
}

function normalizeRolePermissionSelection(permissions: PermissionKey[]) {
  return normalizeArticleCategoryForceRemovePermissionDependencies(
    normalizeMediaForceRemovePermissionDependencies(
      normalizePermissionSelection(permissions),
    ),
  );
}

function stripStaffBasePermissions(permissions: PermissionKey[]) {
  return permissions.filter(
    (permission) => !staffBasePermissionKeySet.has(permission),
  );
}

function isStaffBasePermissionFamily(family: PermissionFamily) {
  return family.permissions.every((permission) =>
    staffBasePermissionKeySet.has(permission.key),
  );
}

export function toRoleFormState(input?: Partial<RoleMutationInput>): RoleFormState {
  return {
    key: input?.key ?? "",
    name: input?.name ?? "",
    color: input?.color ?? "#2563eb",
    priorityIndex: input?.priorityIndex ?? 50,
    description: input?.description ?? "",
    permissions: normalizeRolePermissionSelection(
      stripStaffBasePermissions(input?.permissions ?? []),
    ),
    isActive: input?.isActive ?? true,
  };
}

export function toRoleMutationInput(state: RoleFormState): RoleMutationInput {
  return {
    key: state.key,
    name: state.name,
    color: state.color,
    priorityIndex: state.priorityIndex,
    description: state.description.trim() || null,
    permissions: normalizeRolePermissionSelection(
      stripStaffBasePermissions(state.permissions),
    ),
    isActive: state.isActive,
  };
}

export default function RoleEditorForm({
  state,
  onChange,
  onSubmit,
  isSubmitting,
  submitLabel,
  hideSubmitButton = false,
}: {
  state: RoleFormState;
  onChange: (patch: Partial<RoleFormState>) => void;
  onSubmit?: () => void | Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  hideSubmitButton?: boolean;
}) {
  const normalizedPermissions = normalizeRolePermissionSelection(state.permissions);
  const displayedPermissions = normalizeRolePermissionSelection([
    ...STAFF_BASE_PERMISSION_KEYS,
    ...normalizedPermissions,
  ]);
  const selectedCount = displayedPermissions.length;
  const selectedCountLabel =
    selectedCount > 1 ? "permissions activées" : "permission activée";

  const setPermissionFamilyEnabled = (
    family: PermissionFamily,
    isEnabled: boolean,
  ) => {
    if (isStaffBasePermissionFamily(family)) {
      return;
    }

    const familyKeys = new Set<PermissionKey>(
      family.permissions.map((permission) => permission.key),
    );
    const nextPermissions = state.permissions.filter(
      (permission) => !familyKeys.has(permission),
    );

    if (isEnabled) {
      nextPermissions.push(selectDefaultPermissionForFamily(family).key);
    }

    onChange({ permissions: normalizeRolePermissionSelection(nextPermissions) });
  };

  const setPermissionFamilyScope = (
    family: PermissionFamily,
    permissionKey: PermissionKey,
  ) => {
    if (isStaffBasePermissionFamily(family)) {
      return;
    }

    const familyKeys = new Set<PermissionKey>(
      family.permissions.map((permission) => permission.key),
    );
    const nextPermissions = state.permissions.filter(
      (permission) => !familyKeys.has(permission),
    );
    nextPermissions.push(permissionKey);
    onChange({ permissions: normalizeRolePermissionSelection(nextPermissions) });
  };

  function keyfy(text: string): string {
  return text
    .normalize('NFKD')  // Unicode normalization
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics/accents
    .replace(/[^\w\s-]/g, '')  // Keep letters, digits, spaces, dashes
    .replace(/[-\s]+/g, '_')  // Spaces/dashes to single underscore
    .replace(/^_|_$/g, '')  // Strip leading/trailing underscores
    .toUpperCase();  // Uppercase
  }

  return (
    <div className="grid gap-6">
      <Panel
        pretitle=""
        title="Gestion du rôle"
        description="Activez les permissions à accorder à ce rôle. Les permissions de base du staff restent toujours actives."
      >
          <div className="flex gap-8 justify-center items-center w-full px-8 py-5 border border-slate-300 rounded-2xl bg-slate-50/75">
            <div className="flex-3">
              <PanelField id="name" label="Nom">
                <PanelInput
                  value={state.name}
                  onChange={(event) => {onChange({ 
                    name: event.target.value, key: 
                    keyfy(event.target.value) 
                  })}}
                  fullWidth
                />
              </PanelField>
            </div>

            <div className="flex-3">
              <PanelField id="key" label="Clé">
                <PanelInput
                  disabled
                  value={state.key}
                  fullWidth
                />
              </PanelField>
            </div>

            <div className="flex-1">
              <PanelField id="color" label="Couleur">
                <PanelInput
                  type="color"
                  value={state.color}
                  onChange={(event) => onChange({ color: event.target.value })}
                  fullWidth
                />
            </PanelField>
            </div>
            <div>
              <PanelField id="is-active" label="Actif">
                <BooleanButton
                  checked={state.isActive}
                  onClick={(checked: boolean) => onChange({ isActive: checked })}
                />
            </PanelField>
            </div>
          </div>

          <PanelField id="description" label="Description">
            <textarea
              value={state.description}
              onChange={(event) => onChange({ description: event.target.value })}
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cobam-water-blue/40"
            />
          </PanelField>

          {!hideSubmitButton ? (
            <AnimatedUIButton
              type="button"
              onClick={() => void onSubmit?.()}
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText="Enregistrement..."
              variant="primary"
              className="w-full"
            >
              {submitLabel ?? "Enregistrer"}
            </AnimatedUIButton>
          ) : null}


        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{selectedCount}</span>{" "}
          {selectedCountLabel}
        </div>

        <div className="space-y-5">
          {Object.entries(permissionFamiliesByGroup).map(([group, families]) => (
            <div key={group} className="space-y-3">
              <p className="text-sm font-semibold text-cobam-dark-blue">{group}</p>

              <div className="space-y-2">
                {families.map((family) => {
                  const isStaffBaseFamily = isStaffBasePermissionFamily(family);
                  const isMediaForceRemoveFamily = family.permissions.some(
                    (permission) => permission.key === PERMISSIONS.MEDIA_FORCE_REMOVE,
                  );
                  const missingMediaForceRemovePrerequisites =
                    isMediaForceRemoveFamily &&
                    !hasMediaForceRemovePrerequisites(normalizedPermissions);
                  const isArticleCategoryForceRemoveFamily = family.permissions.some(
                    (permission) =>
                      permission.key === PERMISSIONS.ARTICLE_CATEGORIES_FORCE_REMOVE_ALL ||
                      permission.key === PERMISSIONS.ARTICLE_CATEGORIES_FORCE_REMOVE_BELOW_ROLE ||
                      permission.key === PERMISSIONS.ARTICLE_CATEGORIES_FORCE_REMOVE_OWN,
                  );
                  const missingArticleCategoryForceRemovePrerequisites =
                    isArticleCategoryForceRemoveFamily &&
                    !hasArticleCategoryForceRemovePrerequisites(
                      normalizedPermissions,
                    );
                  const isInteractionLocked =
                    isStaffBaseFamily ||
                    missingMediaForceRemovePrerequisites ||
                    missingArticleCategoryForceRemovePrerequisites;
                  const selectedPermission =
                    family.permissions.find((permission) =>
                      displayedPermissions.includes(permission.key),
                    ) ?? null;
                  const isEnabled = selectedPermission != null;
                  const isMediaAccessRelatedFamily = family.permissions.some(
                    (permission) => mediaAccessPermissionKeySet.has(permission.key),
                  );
                  const isMediaManageRelatedFamily = family.permissions.some(
                    (permission) => mediaManagePermissionKeySet.has(permission.key),
                  );
                  const helperDescription = missingMediaForceRemovePrerequisites
                    ? "Activez d'abord un accès médias et une permission de suppression de médias."
                    : missingArticleCategoryForceRemovePrerequisites
                      ? "Activez d'abord l'accès aux catégories d'articles et une permission de suppression."
                      : selectedPermission?.description ??
                        family.description ??
                        (isStaffBaseFamily
                          ? "Permission de base accordée à tous les comptes Staff."
                          : isMediaForceRemoveFamily
                            ? "Permet de déréférencer un média encore utilisé avant suppression définitive."
                            : isArticleCategoryForceRemoveFamily
                              ? "Permet de détacher les articles liés avant suppression définitive."
                              : null);

                  return (
                    <div
                      key={family.key}
                      className={`rounded-xl border px-4 py-4 transition-colors ${
                        isEnabled
                          ? "border-cobam-water-blue bg-cobam-light-bg/60"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <BooleanButton
                            checked={isEnabled}
                            disabled={isInteractionLocked}
                            onClick={(checked: boolean) => setPermissionFamilyEnabled(family, checked)}
                          />

                          <div className="min-w-0">
                            <p className="font-medium text-slate-800">
                              {family.label}
                            </p>

                            {isStaffBaseFamily ? (
                              <div className="mt-1">
                                <StaffBadge
                                  size="sm"
                                  color="primary"
                                  icon="lock"
                                >
                                  Toujours activé
                                </StaffBadge>
                              </div>
                            ) : missingMediaForceRemovePrerequisites ||
                              missingArticleCategoryForceRemovePrerequisites ? (
                              <div className="mt-1">
                                <StaffBadge
                                  size="sm"
                                  color="amber"
                                  icon="lock"
                                >
                                  Prérequis manquants
                                </StaffBadge>
                              </div>
                            ) : null}

                            {helperDescription ? (
                              <p className="mt-1 text-sm text-slate-500">
                                {helperDescription}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {family.supportsScopeSelection ? (
                            <div className="min-w-44">
                              <StaffSelect
                                value={selectedPermission?.key ?? ""}
                                onValueChange={(value) =>
                                  setPermissionFamilyScope(
                                    family,
                                    value as PermissionKey,
                                  )
                                }
                                disabled={!isEnabled || isInteractionLocked}
                                options={family.permissions.map((permission) => ({
                                  value: permission.key,
                                  label:
                                    scopeLabels[permission.scope ?? ""] ??
                                    permission.scope ??
                                    permission.label,
                                }))}
                                triggerClassName="h-10 min-w-44 rounded-lg border-slate-200 px-3 text-sm"
                                contentClassName="min-w-44"
                              />
                            </div>
                          ) : selectedPermission?.scope ? (
                            <StaffBadge size="sm" color="default">
                              {scopeLabels[selectedPermission.scope] ??
                                selectedPermission.scope}
                            </StaffBadge>
                          ) : null}

                          <StaffBadge size="sm" color="default">
                            {isStaffBaseFamily
                              ? "Verrouillee"
                              : missingMediaForceRemovePrerequisites ||
                                  missingArticleCategoryForceRemovePrerequisites
                                ? "Dependances"
                                : isEnabled
                                  ? "Activee"
                                : "Désactivée"}
                          </StaffBadge>
                          {isMediaAccessRelatedFamily || isMediaManageRelatedFamily ? (
                            <StaffBadge
                              size="sm"
                              color={
                                isMediaManageRelatedFamily ? "blue" : "cyan"
                              }
                            >
                              {isMediaManageRelatedFamily ? "Gestion médias" : "Accès médias"}
                            </StaffBadge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
