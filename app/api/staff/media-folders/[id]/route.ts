import { NextResponse } from "next/server";
import { AuthError, requireStaffSession } from "@/features/auth/server/session";
import {
  MediaValidationError,
  parseMediaFolderUpdateInput,
  parseMediaIdParam,
} from "@/features/media/schemas";
import {
  deleteMediaFolderService,
  MediaServiceError,
  updateMediaFolderService,
} from "@/features/media/service";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaffSession(req);
    const { id: idParam } = await params;
    const folderId = parseMediaIdParam(idParam);
    const body = await req.json();
    const input = parseMediaFolderUpdateInput(body);
    const folder = await updateMediaFolderService(session, folderId, input);

    return NextResponse.json({ ok: true, folder }, { status: 200 });
  } catch (error: unknown) {
    if (
      error instanceof AuthError ||
      error instanceof MediaValidationError ||
      error instanceof MediaServiceError
    ) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status },
      );
    }

    console.error("MEDIA_FOLDER_PATCH_ERROR:", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaffSession(req);
    const { id: idParam } = await params;
    const folderId = parseMediaIdParam(idParam);
    const url = new URL(req.url);
    const forceRemove = ["1", "true", "yes"].includes(
      url.searchParams.get("force")?.toLowerCase() ?? "",
    );

    await deleteMediaFolderService(session, folderId, { force: forceRemove });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    if (
      error instanceof AuthError ||
      error instanceof MediaValidationError ||
      error instanceof MediaServiceError
    ) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status },
      );
    }

    console.error("MEDIA_FOLDER_DELETE_ERROR:", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
