import { NextResponse } from "next/server";
import { AuthError, requireStaffSession } from "@/features/auth/server/session";
import {
  MediaValidationError,
  parseMediaListQuery,
  parseMediaUploadFormData,
} from "@/features/media/schemas";
import {
  listMediaService,
  MediaServiceError,
  uploadMediaService,
} from "@/features/media/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireStaffSession(req);
    const { searchParams } = new URL(req.url);
    const query = parseMediaListQuery(searchParams);
    const result = await listMediaService(session, query);

    return NextResponse.json({
      ok: true,
      items: result.items,
      currentFolder: result.currentFolder,
      breadcrumbs: result.breadcrumbs,
      folders: result.folders,
      folderOptions: result.folderOptions,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      stats: result.stats,
      storage: result.storage,
    });
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

    console.error("MEDIA_LIST_ERROR:", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireStaffSession(req);
    const formData = await req.formData();
    const input = parseMediaUploadFormData(formData);
    const media = await uploadMediaService(session, input);

    return NextResponse.json({ ok: true, media }, { status: 201 });
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

    console.error("MEDIA_UPLOAD_ERROR:", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
