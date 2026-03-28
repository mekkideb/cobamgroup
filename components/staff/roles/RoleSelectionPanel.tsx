"use client";

import Panel from "@/components/staff/ui/Panel";
import StaffField from "@/components/staff/ui/field";
import StaffSelect from "@/components/staff/ui/PanelSelect";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import type { PowerType, RoleSummary } from "@/features/rbac/roles";

export default function RoleSelectionPanel({
  powerType,
  canSetAdmin,
  options,
  selectedRoleIds,
  onPowerTypeChange,
  onToggleRole,
  onSubmit,
  isSubmitting = false,
  disabled = false,
  currentRoleLabel,
  submitLabel = "Enregistrer",
}: {
  powerType: PowerType;
  canSetAdmin: boolean;
  options: RoleSummary[];
  selectedRoleIds: string[];
  onPowerTypeChange: (value: PowerType) => void;
  onToggleRole: (roleId: string) => void;
  onSubmit?: () => void | Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
  currentRoleLabel?: string;
  submitLabel?: string;
}) {
  return (
    <Panel
      pretitle="Accès"
      title="Pouvoir et rôles"
      description="Choisissez le type de pouvoir et les rôles dynamiques attribués à ce compte. Le type Staff donne l'accès de base au portail staff."
    >
      <StaffField id="powerType" label="Type de pouvoir">
        <StaffSelect
          value={powerType}
          onValueChange={(value) => onPowerTypeChange(value as PowerType)}
          disabled={disabled}
          options={[
            ...(powerType === "ROOT"
              ? [{ value: "ROOT", label: "Root" }]
              : []),
            { value: "STAFF", label: "Staff" },
            ...(powerType === "ADMIN" && !canSetAdmin
              ? [{ value: "ADMIN", label: "Admin" }]
              : []),
            ...(canSetAdmin ? [{ value: "ADMIN", label: "Admin" }] : []),
          ]}
        />
      </StaffField>

      {powerType === "STAFF" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Rôles attribués</p>
          <p className="text-xs text-slate-500">
            Un compte staff peut rester sans rôle dynamique ou cumuler plusieurs rôles. Le rôle effectif est celui avec la priorité la plus forte.
          </p>
          <div className="space-y-2">
            {options.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun rôle disponible.</p>
            ) : (
              options.map((role) => {
                const checked = selectedRoleIds.includes(role.id);
                return (
                  <label
                    key={role.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleRole(role.id)}
                      disabled={disabled}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-medium text-slate-800">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color }} />
                        {role.name}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        Priorité {role.priorityIndex} - {role.key}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Le pouvoir Admin utilise automatiquement tout le catalogue de permissions régulières. Aucun rôle dynamique n'est requis.
        </div>
      )}

      {currentRoleLabel ? (
        <p className="text-xs text-slate-500">
          Accès actuel : <span className="font-semibold text-slate-700">{currentRoleLabel}</span>
        </p>
      ) : null}

      {onSubmit ? (
        <AnimatedUIButton
          type="button"
          onClick={() => void onSubmit()}
          disabled={isSubmitting || disabled}
          loading={isSubmitting}
          loadingText="Enregistrement..."
          variant="primary"
          className="w-full"
        >
          {submitLabel}
        </AnimatedUIButton>
      ) : null}
    </Panel>
  );
}
