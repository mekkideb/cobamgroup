"use client";

import Loading from "@/components/staff/Loading";
import RolesWorkspace from "@/components/staff/roles/RolesWorkspace";
import { StaffPageHeader, StaffStateCard } from "@/components/staff/ui";
import { useStaffSessionContext } from "@/features/auth/client/staff-session-provider";
import { canAccessRoles } from "@/features/roles/access";

export default function RolesPage() {
  const { user, isLoading } = useStaffSessionContext();
  const canManage = user ? canAccessRoles(user) : false;

  if (isLoading) {
    return <Loading />;
  }

  if (!canManage) {
    return (
      <StaffStateCard
        variant="forbidden"
        title="Accès refusé"
        description="Seuls les comptes Admin et Root peuvent gérer les rôles."
      />
    );
  }

  return (
    <div className="space-y-6">
      <StaffPageHeader eyebrow="Administration" title="Rôles" />

      <RolesWorkspace />
    </div>
  );
}
