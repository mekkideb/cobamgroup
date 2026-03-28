import { NextResponse } from "next/server";
import { AuthError, requireStaffSession } from "@/features/auth/server/session";
import {
  MediaValidationError,
  parseMediaFolderCreateInput,
} from "@/features/media/schemas";
import {
  createMediaFolderService,
  MediaServiceError,
} from "@/features/media/service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await requireStaffSession(req);
    const body = await req.json();
    const input = parseMediaFolderCreateInput(body);
    const folder = await createMediaFolderService(session, input);

    return NextResponse.json({ ok: true, folder }, { status: 201 });
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

    console.error("MEDIA_FOLDER_CREATE_ERROR:", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
