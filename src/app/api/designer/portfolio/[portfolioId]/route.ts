import { NextResponse } from "next/server";

import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PORTFOLIO_BUCKET = "portfolio-images";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const portfolioId = routeParams.portfolioId ?? routeParams.portfolioID;

  if (!portfolioId) {
    return NextResponse.json(
      {
        message: "Thiếu portfolio ID.",
      },
      { status: 400 },
    );
  }

  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated || !authState.profile) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập để xóa portfolio.",
      },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "designer" || !authState.designerProfile) {
    return NextResponse.json(
      {
        message: "Chỉ designer mới có thể xóa portfolio.",
      },
      { status: 403 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: portfolioItem, error: findError } = await adminSupabase
    .from("portfolio_items")
    .select("id, designer_id, image_url")
    .eq("id", portfolioId)
    .maybeSingle();

  if (findError) {
    return NextResponse.json(
      {
        message: findError.message,
      },
      { status: 500 },
    );
  }

  if (!portfolioItem) {
    return NextResponse.json(
      {
        message: "Không tìm thấy portfolio item.",
      },
      { status: 404 },
    );
  }

  if (portfolioItem.designer_id !== authState.designerProfile.id) {
    return NextResponse.json(
      {
        message: "Bạn không có quyền xóa portfolio này.",
      },
      { status: 403 },
    );
  }

  const { error: deleteError } = await adminSupabase
    .from("portfolio_items")
    .delete()
    .eq("id", portfolioId)
    .eq("designer_id", authState.designerProfile.id);

  if (deleteError) {
    return NextResponse.json(
      {
        message: deleteError.message,
      },
      { status: 500 },
    );
  }

  const storagePath = getStoragePathFromPublicUrl(portfolioItem.image_url);

  if (storagePath) {
    await adminSupabase.storage.from(PORTFOLIO_BUCKET).remove([storagePath]);
  }

  return NextResponse.json({
    message: "Đã xóa portfolio thành công.",
  });
}

function getStoragePathFromPublicUrl(imageUrl: string | null) {
  if (!imageUrl) return null;

  const marker = `/storage/v1/object/public/${PORTFOLIO_BUCKET}/`;
  const markerIndex = imageUrl.indexOf(marker);

  if (markerIndex === -1) return null;

  return imageUrl.slice(markerIndex + marker.length);
}