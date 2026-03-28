import { prisma } from "@/lib/server/db/prisma";

const ROLE_SELECT = {
  id: true,
  key: true,
  name: true,
  color: true,
  priorityIndex: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  permissionLinks: {
    where: { allowed: true },
    select: {
      permission: {
        select: { key: true },
      },
    },
  },
} as const;

export async function listRoles() {
  return prisma.role.findMany({
    orderBy: [
      { priorityIndex: "asc" },
      { name: "asc" },
    ],
    select: ROLE_SELECT,
  });
}

export async function findRoleById(roleId: string) {
  return prisma.role.findUnique({
    where: { id: BigInt(roleId) },
    select: ROLE_SELECT,
  });
}

export async function findRoleByKey(key: string) {
  return prisma.role.findUnique({
    where: { key },
    select: { id: true },
  });
}

export async function createRole(data: {
  key: string;
  name: string;
  color: string;
  priorityIndex: number;
  description: string | null;
  permissions: string[];
  isActive: boolean;
}) {
  const permissions = await prisma.permission.findMany({
    where: { key: { in: data.permissions } },
    select: { id: true, key: true },
  });

  return prisma.role.create({
    data: {
      key: data.key,
      name: data.name,
      color: data.color,
      priorityIndex: data.priorityIndex,
      description: data.description,
      isActive: data.isActive,
      permissionLinks: {
        create: permissions.map((permission) => ({
          permissionId: permission.id,
          allowed: true,
        })),
      },
    },
    select: ROLE_SELECT,
  });
}

export async function updateRole(data: {
  roleId: string;
  key: string;
  name: string;
  color: string;
  priorityIndex: number;
  description: string | null;
  permissions: string[];
  isActive: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const permissions = await tx.permission.findMany({
      where: { key: { in: data.permissions } },
      select: { id: true },
    });

    await tx.rolePermission.deleteMany({
      where: { roleId: BigInt(data.roleId) },
    });

    await tx.role.update({
      where: { id: BigInt(data.roleId) },
      data: {
        key: data.key,
        name: data.name,
        color: data.color,
        priorityIndex: data.priorityIndex,
        description: data.description,
        isActive: data.isActive,
      },
    });

    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: BigInt(data.roleId),
          permissionId: permission.id,
          allowed: true,
        })),
        skipDuplicates: true,
      });
    }

    return tx.role.findUniqueOrThrow({
      where: { id: BigInt(data.roleId) },
      select: ROLE_SELECT,
    });
  });
}

export async function deleteRole(roleId: string) {
  return prisma.role.delete({
    where: { id: BigInt(roleId) },
    select: ROLE_SELECT,
  });
}

export async function reorderRoles(roleIds: string[]) {
  return prisma.$transaction(async (tx) => {
    for (const [index, roleId] of roleIds.entries()) {
      await tx.role.update({
        where: { id: BigInt(roleId) },
        data: { priorityIndex: index * 10 },
      });
    }

    return tx.role.findMany({
      orderBy: [{ priorityIndex: "asc" }, { name: "asc" }],
      select: ROLE_SELECT,
    });
  });
}

export async function countUsersWithRole(roleId: string) {
  return prisma.userRoleAssignment.count({
    where: {
      roleId: BigInt(roleId),
      revokedAt: null,
    },
  });
}
