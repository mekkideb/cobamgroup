import { NextResponse } from "next/server";
import { AuthError, requireStaffSession } from "@/features/auth/server/session";
import {
  parseRoleReorderInput,
  RoleValidationError,
} from "@/features/roles/schemas";
import {
  reorderRolesService,
  RoleServiceError,
} from "@/features/roles/service";

export async function POST(req: Request) {
  try {
    const session = await requireStaffSession(req);
    const body = await req.json();
    const orderedRoleIds = parseRoleReorderInput(body);
    const result = await reorderRolesService(session, orderedRoleIds);

    return NextResponse.json({
      ok: true,
      items: result.items,
      total: result.total,
    });
  } catch (error: unknown) {
    if (
      error instanceof AuthError ||
      error instanceof RoleValidationError ||
      error instanceof RoleServiceError
    ) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status },
      );
    }

    console.error("ROLE_REORDER_ERROR:", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
