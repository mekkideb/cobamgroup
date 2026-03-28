"use client";

import { useCallback } from "react";
import Avatar from "@/components/staff/ui/Avatar";
import PanelTable from "@/components/staff/ui/PanelTable";
import { StaffBadge, StaffFilterBar, StaffPageHeader, StaffSelect } from "@/components/staff/ui";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { isHexColor } from "@/components/ui/custom/animated-ui.shared";
import { useStaffSessionContext } from "@/features/auth/client/staff-session-provider";
import { hasPermission } from "@/features/rbac/access";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { useRolesList } from "@/features/roles/hooks/use-roles-list";
import { useUsersList } from "@/features/users/hooks/use-users-list";
import type { StaffUserListItemDto } from "@/features/users/types";
import SearchInput from "@/components/staff/ui/SearchInput";

const PAGE_SIZE_OPTIONS: Array<10 | 20 | 50> = [10, 20, 50];
const columns = ["Utilisateur", "Accès", "Poste", "Créé le", "Actions"];

function getDisplayName(user: StaffUserListItemDto) {
  const first = user.profile?.firstName?.trim() || "";
  const last = user.profile?.lastName?.trim() || "";
  const full = `${first} ${last}`.trim();
  return full || "-";
}

function getInitials(user: StaffUserListItemDto) {
  const first = user.profile?.firstName?.trim() || "";
  const last = user.profile?.lastName?.trim() || "";
  return first[0] + last[0];
}

function getUserStatusBadge(isBanned: boolean) {
  return isBanned
    ? {
        label: "Banni",
        color: "amber" as const,
        icon: "warning" as const,
      }
    : null;
}

function getAccessBadge(user: StaffUserListItemDto) {
  const fallbackColor =
    user.powerType === "ROOT"
      ? "rose"
      : user.powerType === "ADMIN"
        ? "violet"
        : "blue";
  const roleColor = isHexColor(user.roleColor) ? user.roleColor : fallbackColor;

  switch (user.powerType) {
    case "ROOT":
      return {
        label: user.roleLabel,
        color: roleColor,
        icon: "shield" as const,
      };
    case "ADMIN":
      return {
        label: user.roleLabel,
        color: roleColor,
        icon: "shield" as const,
      };
    case "STAFF":
    default:
      return {
        label: user.roleLabel,
        color: roleColor,
        icon: "user" as const,
      };
  }
}

export default function UsersListPage() {
  const { user: authUser } = useStaffSessionContext();
  const { items: roles } = useRolesList();
  const canCreateUser =
    !!authUser && hasPermission(authUser, PERMISSIONS.USERS_CREATE_BELOW_ROLE);

  const {
    items,
    total,
    page,
    pageSize,
    search,
    roleKey,
    powerType,
    isLoading,
    error,
    totalPages,
    canPrev,
    canNext,
    setSearch,
    setRoleKey,
    setPowerType,
    submitSearch,
    updatePageSize,
    goPrev,
    goNext,
    fetchUsers,
  } = useUsersList(20);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      await submitSearch();
    },
    [submitSearch],
  );

  const handleRoleChange = useCallback(
    async (value: string) => {
      setRoleKey(value);
      await fetchUsers({ page: 1, roleKey: value });
    },
    [fetchUsers, setRoleKey],
  );

  const handlePowerTypeChange = useCallback(
    async (value: "" | "ROOT" | "ADMIN" | "STAFF") => {
      setPowerType(value);
      await fetchUsers({ page: 1, powerType: value });
    },
    [fetchUsers, setPowerType],
  );

  return (
    <div className="space-y-6">
      <StaffPageHeader eyebrow="Utilisateurs" title="Gestion des comptes staff">
        {canCreateUser ? (
          <AnimatedUIButton
            href="/espace/staff/administration/membres/new"
            variant="secondary"
            icon="plus"
            iconPosition="left"
          >
            Créer un utilisateur
          </AnimatedUIButton>
        ) : null}
      </StaffPageHeader>

      <form onSubmit={handleSubmit}>
        <StaffFilterBar>
          <SearchInput
            onChange={(s: string) => setSearch(s)} 
            placeholder="Rechercher par email, nom, poste..." 
            value={search}
          />
          <StaffSelect
            value={powerType}
            onValueChange={(value) =>
              void handlePowerTypeChange(value as "" | "ROOT" | "ADMIN" | "STAFF")
            }
            emptyLabel="Tous les pouvoirs"
            options={[
              { value: "ROOT", label: "Root" },
              { value: "ADMIN", label: "Admin" },
              { value: "STAFF", label: "Staff" },
            ]}
          />
          <StaffSelect
            value={roleKey}
            onValueChange={(value) => void handleRoleChange(value)}
            emptyLabel="Tous les rôles"
            options={roles.map((role) => ({
              value: role.key,
              label: role.name,
            }))}
          />
        </StaffFilterBar>
      </form>

      <PanelTable
        columns={columns}
        isLoading={isLoading}
        error={error}
        isEmpty={items.length === 0}
        emptyMessage="Aucun utilisateur ne correspond à ces critères."
        pagination={{
          goPrev,
          goNext,
          updatePageSize: (value) => updatePageSize(value as 10 | 20 | 50),
          canPrev,
          canNext,
          pageSize,
          total,
          totalPages,
          page,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          itemLabel: "utilisateur",
        }}
      >
        {items.map((user) => {
          const statusBadge = getUserStatusBadge(user.status === "BANNED");
          const accessBadge = getAccessBadge(user);

          return (
            <tr key={user.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 align-top">
                <div className="flex flex-wrap items-center gap-3 font-semibold text-cobam-dark-blue">
                  <Avatar
                    initials={getInitials(user)}
                    size="sm"
                    mediaId={user.profile?.avatarMediaId}
                  />
                  <div className="flex flex-col justify-start gap-1">
                    <div className="inline-flex flex-wrap items-center gap-2">
                      <p>{getDisplayName(user)}</p>
                      {statusBadge ? (
                        <StaffBadge
                          size="sm"
                          color={statusBadge.color}
                          icon={statusBadge.icon}
                        >
                          {statusBadge.label}
                        </StaffBadge>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-slate-400">{user.email}</div>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3 align-top text-slate-700">
                <StaffBadge
                  size="md"
                  color={accessBadge.color}
                  icon={accessBadge.icon}
                >
                  {accessBadge.label}
                </StaffBadge>
              </td>

              <td className="px-4 py-3 align-top text-slate-600">
                {user.profile?.jobTitle || "-"}
              </td>

              <td className="px-4 py-3 align-top text-xs text-slate-600">
                {new Date(user.createdAt).toLocaleDateString("fr-FR")}
              </td>

              <td className="px-4 py-3 align-top text-right">
                <AnimatedUIButton
                  href={`/espace/staff/administration/membres/${user.id}`}
                  variant="ghost"
                  icon="modify"
                  iconPosition="left"
                >
                  Voir / Éditer
                </AnimatedUIButton>
              </td>
            </tr>
          );
        })}
      </PanelTable>
    </div>
  );
}
