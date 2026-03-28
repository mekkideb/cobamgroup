import { NextResponse } from "next/server";
import { AuthError, requireStaffSession } from "@/features/auth/server/session";
import {
  MediaValidationError,
  parseMediaIdParam,
  parseMediaUpdateInput,
} from "@/features/media/schemas";
import {
  deleteMediaService,
  getMediaByIdService,
  MediaServiceError,
  updateMediaService,
} from "@/features/media/service";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaffSession(req);
    const { id: idParam } = await params;
    const mediaId = parseMediaIdParam(idParam);
    const media = await getMediaByIdService(session, mediaId);

    return NextResponse.json({ ok: true, media }, { status: 200 });
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

    console.error("MEDIA_GET_ERROR:", error);
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
    const mediaId = parseMediaIdParam(idParam);
    const url = new URL(req.url);
    const forceRemove = ["1", "true", "yes"].includes(
      url.searchParams.get("force")?.toLowerCase() ?? "",
    );

    await deleteMediaService(session, mediaId, { force: forceRemove });

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

    console.error("MEDIA_DELETE_ERROR:", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaffSession(req);
    const { id: idParam } = await params;
    const mediaId = parseMediaIdParam(idParam);
    const body = await req.json();
    const input = parseMediaUpdateInput(body);
    const media = await updateMediaService(session, mediaId, input);

    return NextResponse.json({ ok: true, media }, { status: 200 });
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

    console.error("MEDIA_PATCH_ERROR:", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
