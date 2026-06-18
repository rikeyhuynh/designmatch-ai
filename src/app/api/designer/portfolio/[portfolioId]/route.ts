import { NextResponse } from "next/server";

import { rebuildDesignerStyleDNA } from "@/lib/ai/tasks/designer-portfolio-analysis";
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

  const designerId = authState.designerProfile.id;
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

  if (portfolioItem.designer_id !== designerId) {
    return NextResponse.json(
      {
        message: "Bạn không có quyền xóa portfolio này.",
      },
      { status: 403 },
    );
  }

  const { error: deleteAnalysisError } = await adminSupabase
    .from("portfolio_ai_analysis")
    .delete()
    .eq("portfolio_item_id", portfolioId)
    .eq("designer_id", designerId);

  if (deleteAnalysisError) {
    return NextResponse.json(
      {
        message: deleteAnalysisError.message,
      },
      { status: 500 },
    );
  }

  const { error: deleteError } = await adminSupabase
    .from("portfolio_items")
    .delete()
    .eq("id", portfolioId)
    .eq("designer_id", designerId);

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

  try {
    await rebuildDesignerStyleDNA({
      designerId,
      lastPortfolioItemId: null,
    });
  } catch (error) {
    console.error("[DesignMatch AI] Rebuild Style DNA after delete failed:", error);

    return NextResponse.json({
      message:
        "Đã xóa portfolio, nhưng Style DNA chưa được cập nhật lại. Hãy tải lại trang hoặc phân tích lại portfolio còn lại.",
      dnaUpdated: false,
    });
  }

  return NextResponse.json({
    message: "Đã xóa portfolio và cập nhật lại Style DNA.",
    dnaUpdated: true,
  });
}

function getStoragePathFromPublicUrl(imageUrl: string | null) {
  if (!imageUrl) return null;

  const marker = `/storage/v1/object/public/${PORTFOLIO_BUCKET}/`;
  const markerIndex = imageUrl.indexOf(marker);

  if (markerIndex === -1) return null;

  return imageUrl.slice(markerIndex + marker.length);
}