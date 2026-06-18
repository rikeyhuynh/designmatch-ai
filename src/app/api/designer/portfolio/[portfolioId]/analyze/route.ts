import { NextResponse } from "next/server";

import { analyzeDesignerPortfolio } from "@/lib/ai/tasks/designer-portfolio-analysis";
import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

export async function POST(_request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const portfolioId = routeParams.portfolioId ?? routeParams.portfolioID;

  if (!portfolioId) {
    return NextResponse.json(
      {
        message: "Thiếu portfolio ID.",
      },
      {
        status: 400,
      },
    );
  }

  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated || !authState.profile) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập để phân tích portfolio.",
      },
      {
        status: 401,
      },
    );
  }

  if (authState.profile.role !== "designer" || !authState.designerProfile) {
    return NextResponse.json(
      {
        message: "Chỉ designer mới có thể phân tích portfolio của mình.",
      },
      {
        status: 403,
      },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: portfolioItem, error } = await adminSupabase
    .from("portfolio_items")
    .select("id, designer_id, title, description, category, industry, image_url")
    .eq("id", portfolioId)
    .eq("designer_id", authState.designerProfile.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        message: error.message,
      },
      {
        status: 500,
      },
    );
  }

  if (!portfolioItem) {
    return NextResponse.json(
      {
        message: "Không tìm thấy portfolio hoặc bạn không có quyền xử lý.",
      },
      {
        status: 404,
      },
    );
  }

  try {
    const result = await analyzeDesignerPortfolio({
      portfolioItemId: portfolioItem.id,
      designerId: portfolioItem.designer_id,
      title: portfolioItem.title,
      description: portfolioItem.description,
      category: portfolioItem.category,
      industry: portfolioItem.industry,
      imageUrl: portfolioItem.image_url,
    });

    return NextResponse.json({
      message: result.message,
      result,
    });
  } catch (analysisError) {
    return NextResponse.json(
      {
        message:
          analysisError instanceof Error
            ? analysisError.message
            : "AI chưa phân tích được portfolio.",
      },
      {
        status: 500,
      },
    );
  }
}