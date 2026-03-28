"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import Loading from "@/components/staff/Loading";
import RoleEditorForm, {
  toRoleFormState,
  toRoleMutationInput,
  type RoleFormState,
} from "@/components/staff/roles/RoleEditorForm";
import Panel from "@/components/staff/ui/Panel";
import { StaffBadge, StaffNotice } from "@/components/staff/ui";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { reorderRolesClient } from "@/features/roles/client";
import { useRoleDetail } from "@/features/roles/hooks/use-role-detail";
import { useRolesList } from "@/features/roles/hooks/use-roles-list";
import type { RoleDetailDto } from "@/features/roles/types";

type DropPosition = "before" | "after";
type DropTarget = { roleId: string; position: DropPosition } | null;

const ROLES_PAGE_PATH = "/espace/staff/administration/roles";
const PRIORITY_STEP = 10;

function buildRolesUrl(roleId: string | null, isCreating: boolean) {
  if (isCreating) {
    return `${ROLES_PAGE_PATH}?new=1`;
  }

  if (roleId) {
    return `${ROLES_PAGE_PATH}?id=${roleId}`;
  }

  return ROLES_PAGE_PATH;
}

function getPriorityIndexFromOrder(index: number) {
  return Math.max(0, index) * PRIORITY_STEP;
}

function moveRoleInList(
  roles: RoleDetailDto[],
  draggedRoleId: string,
  targetRoleId: string,
  position: DropPosition,
) {
  const draggedIndex = roles.findIndex((role) => role.id === draggedRoleId);
  const targetIndex = roles.findIndex((role) => role.id === targetRoleId);

  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
    return roles;
  }

  const nextRoles = [...roles];
  const [draggedRole] = nextRoles.splice(draggedIndex, 1);
  const baseTargetIndex = nextRoles.findIndex((role) => role.id === targetRoleId);
  const insertIndex =
    position === "after" ? baseTargetIndex + 1 : Math.max(0, baseTargetIndex);

  nextRoles.splice(insertIndex, 0, draggedRole);
  return nextRoles;
}

export default function RolesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoleId = searchParams.get("id");
  const initialCreate = searchParams.get("new") === "1";
  const { items, isLoading, error, reload } = useRolesList();
  const [orderedRoles, setOrderedRoles] = useState<RoleDetailDto[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    initialCreate ? null : initialRoleId,
  );
  const [isCreating, setIsCreating] = useState(initialCreate);
  const [draftForm, setDraftForm] = useState<RoleFormState | null>(null);
  const [draggedRoleId, setDraggedRoleId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [isReordering, setIsReordering] = useState(false);
  const roleDetail = useRoleDetail(isCreating ? null : selectedRoleId);

  useEffect(() => {
    setOrderedRoles(items);
  }, [items]);

  const replaceSelectionUrl = useCallback(
    (roleId: string | null, nextIsCreating: boolean) => {
      router.replace(buildRolesUrl(roleId, nextIsCreating));
    },
    [router],
  );

  const startCreate = useCallback(() => {
    setIsCreating(true);
    setSelectedRoleId(null);
    setDraftForm(
      toRoleFormState({
        priorityIndex: getPriorityIndexFromOrder(orderedRoles.length),
      }),
    );
    replaceSelectionUrl(null, true);
  }, [orderedRoles.length, replaceSelectionUrl]);

  const selectRole = useCallback(
    (roleId: string) => {
      setIsCreating(false);
      setSelectedRoleId(roleId);
      setDraftForm(null);
      replaceSelectionUrl(roleId, false);
    },
    [replaceSelectionUrl],
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isCreating && !selectedRoleId && orderedRoles.length > 0) {
      selectRole(orderedRoles[0].id);
      return;
    }

    if (!isCreating && !selectedRoleId && orderedRoles.length === 0) {
      startCreate();
    }
  }, [isCreating, isLoading, orderedRoles, selectedRoleId, selectRole, startCreate]);

  useEffect(() => {
    if (isCreating || !roleDetail.role) {
      return;
    }

    setDraftForm(toRoleFormState(roleDetail.role));
  }, [isCreating, roleDetail.role]);

  const selectedRoleIndex = useMemo(
    () => orderedRoles.findIndex((role) => role.id === selectedRoleId),
    [orderedRoles, selectedRoleId],
  );
  const activeTitle =
    draftForm?.name.trim() ||
    (isCreating ? "Nouveau role" : roleDetail.role?.name ?? "Role");
  const activePriorityIndex = isCreating
    ? getPriorityIndexFromOrder(orderedRoles.length)
    : getPriorityIndexFromOrder(selectedRoleIndex);

  const handleSave = async () => {
    if (!draftForm) {
      return;
    }

    const nextRole = await roleDetail.save(
      toRoleMutationInput({
        ...draftForm,
        priorityIndex: activePriorityIndex,
      }),
    );

    if (!nextRole) {
      toast.error(roleDetail.error || "Impossible d'enregistrer le role.");
      return;
    }

    toast.success(isCreating ? "Role cree." : "Role mis a jour.");
    await reload();
    setIsCreating(false);
    setSelectedRoleId(nextRole.id);
    setDraftForm(toRoleFormState(nextRole));
    replaceSelectionUrl(nextRole.id, false);
  };

  const handleDelete = async () => {
    if (!selectedRoleId) {
      return;
    }

    const confirmed = window.confirm(
      "Supprimer ce role ? Les utilisateurs qui le possedent le perdront automatiquement.",
    );

    if (!confirmed) {
      return;
    }

    const currentIndex = orderedRoles.findIndex((role) => role.id === selectedRoleId);
    const success = await roleDetail.remove();

    if (!success) {
      toast.error(roleDetail.error || "Impossible de supprimer le role.");
      return;
    }

    const remainingRoles = orderedRoles.filter((role) => role.id !== selectedRoleId);
    setOrderedRoles(remainingRoles);
    await reload();
    toast.success("Role supprime.");

    if (remainingRoles.length === 0) {
      setIsCreating(true);
      setSelectedRoleId(null);
      setDraftForm(toRoleFormState({ priorityIndex: 0 }));
      replaceSelectionUrl(null, true);
      return;
    }

    const nextRole = remainingRoles[Math.min(currentIndex, remainingRoles.length - 1)];
    if (nextRole) {
      selectRole(nextRole.id);
    }
  };

  const handleRoleDrop = async (targetRoleId: string) => {
    if (!draggedRoleId || !dropTarget) {
      return;
    }

    const nextRoles = moveRoleInList(
      orderedRoles,
      draggedRoleId,
      targetRoleId,
      dropTarget.position,
    );
    const nextOrder = nextRoles.map((role) => role.id);

    if (nextOrder.join("|") === orderedRoles.map((role) => role.id).join("|")) {
      setDraggedRoleId(null);
      setDropTarget(null);
      return;
    }

    setOrderedRoles(nextRoles);
    setDraggedRoleId(null);
    setDropTarget(null);
    setIsReordering(true);

    try {
      const result = await reorderRolesClient(nextOrder);
      setOrderedRoles(result.items);
      await reload();
      toast.success("Ordre des roles mis a jour.");
    } catch (nextError: unknown) {
      await reload();
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : "Impossible de reordonner les roles.",
      );
    } finally {
      setIsReordering(false);
    }
  };

  if (isLoading && orderedRoles.length === 0 && !draftForm) {
    return <Loading />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel
        pretitle="Rôles"
        title="Hierarchie"
        description="Glissez les rôles pour changer leur priorité."
        className="sticky top-4 h-full py-6 max-h-[96vh]"
      >
        <AnimatedUIButton
          type="button"
          variant="secondary"
          icon="plus"
          iconPosition="left"
          className="w-full"
          onClick={startCreate}
        >
          Nouveau rôle
        </AnimatedUIButton>

        {error ? (
          <StaffNotice variant="error" title="Chargement impossible">
            {error}
          </StaffNotice>
        ) : null}

        <div className="space-y-2">
          {orderedRoles.map((role, index) => {
            const isSelected = !isCreating && role.id === selectedRoleId;
            const showBeforeDrop =
              dropTarget?.roleId === role.id && dropTarget.position === "before";
            const showAfterDrop =
              dropTarget?.roleId === role.id && dropTarget.position === "after";

            return (
              <div key={role.id} className="space-y-2">
                {showBeforeDrop ? (
                  <div className="h-0.5 rounded-full bg-cobam-water-blue" />
                ) : null}

                <button
                  type="button"
                  draggable={!isReordering}
                  onClick={() => selectRole(role.id)}
                  onDragStart={(event) => {
                    setDraggedRoleId(role.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDraggedRoleId(null);
                    setDropTarget(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const position =
                      event.clientY - bounds.top > bounds.height / 2 ? "after" : "before";
                    setDropTarget({ roleId: role.id, position });
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleRoleDrop(role.id);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    isSelected
                      ? "border-cobam-water-blue bg-cobam-light-bg/80"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  } ${draggedRoleId === role.id ? "opacity-60" : ""}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <GripVertical className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    <span
                      className="h-3.5 w-3.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-cobam-dark-blue">
                        {role.name}
                      </p>
                      <p className="truncate text-xs text-slate-400">{role.key}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <StaffBadge size="xs" color="default">
                      #{index + 1}
                    </StaffBadge>
                    {!role.isActive ? (
                      <StaffBadge size="xs" color="amber">
                        Inactif
                      </StaffBadge>
                    ) : null}
                  </div>
                </button>

                {showAfterDrop ? (
                  <div className="h-0.5 rounded-full bg-cobam-water-blue" />
                ) : null}
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StaffBadge size="sm" color="primary">
                {isCreating ? "Nouveau role" : "Role selectionne"}
              </StaffBadge>
              <StaffBadge size="sm" color="info">
                Priorite #
                {isCreating ? orderedRoles.length + 1 : Math.max(selectedRoleIndex + 1, 1)}
              </StaffBadge>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-cobam-dark-blue">{activeTitle}</h1>
              <p className="mt-1 text-sm text-slate-500">
                L&apos;ordre de la colonne de gauche definit la priorite. Le role le plus
                haut est le plus prioritaire.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isCreating && selectedRoleId ? (
              <AnimatedUIButton
                type="button"
                variant="light"
                icon="delete"
                iconPosition="left"
                loading={roleDetail.isDeleting}
                loadingText="Suppression..."
                onClick={() => void handleDelete()}
                className="border-red-200 bg-red-50 hover:border-red-300 hover:bg-red-100"
                textClassName="text-red-700"
                iconClassName="text-red-700"
              >
                Supprimer
              </AnimatedUIButton>
            ) : null}

            <AnimatedUIButton
              type="button"
              variant="primary"
              icon="save"
              iconPosition="left"
              loading={roleDetail.isSaving}
              loadingText="Enregistrement..."
              onClick={() => void handleSave()}
            >
              {isCreating ? "Creer le role" : "Enregistrer"}
            </AnimatedUIButton>
          </div>
        </div>

        {roleDetail.error ? (
          <StaffNotice variant="error" title="Operation impossible">
            {roleDetail.error}
          </StaffNotice>
        ) : null}

        {draftForm ? (
          <RoleEditorForm
            state={draftForm}
            onChange={(patch) =>
              setDraftForm((current) => ({ ...(current ?? toRoleFormState()), ...patch }))
            }
            hideSubmitButton
          />
        ) : (
          <div className="flex min-h-[20rem] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <Loading />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
