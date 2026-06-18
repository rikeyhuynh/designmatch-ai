import { NextResponse } from "next/server";

import { analyzeDesignerPortfolio } from "@/lib/ai/tasks/designer-portfolio-analysis";
import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PORTFOLIO_BUCKET = "portfolio-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"];

export async function POST(request: Request) {
  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated || !authState.profile) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập để thêm portfolio.",
      },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "designer" || !authState.designerProfile) {
    return NextResponse.json(
      {
        message: "Chỉ designer mới có thể thêm portfolio.",
      },
      { status: 403 },
    );
  }

  const formData = await request.formData();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const image = formData.get("image");

  if (title.length < 3) {
    return NextResponse.json(
      {
        message: "Tên portfolio cần có ít nhất 3 ký tự.",
      },
      { status: 400 },
    );
  }

  if (!category) {
    return NextResponse.json(
      {
        message: "Vui lòng chọn category cho portfolio.",
      },
      { status: 400 },
    );
  }

  if (!industry) {
    return NextResponse.json(
      {
        message: "Vui lòng chọn ngành cho portfolio.",
      },
      { status: 400 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  let imageUrl: string | null = null;

  if (image instanceof File && image.size > 0) {
    if (!allowedImageTypes.includes(image.type)) {
      return NextResponse.json(
        {
          message: "Ảnh portfolio chỉ hỗ trợ PNG, JPG hoặc WEBP.",
        },
        { status: 400 },
      );
    }

    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          message: "Ảnh portfolio không được vượt quá 5MB.",
        },
        { status: 400 },
      );
    }

    const extension = getFileExtension(image);
    const filePath = `${authState.designerProfile.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await adminSupabase.storage
      .from(PORTFOLIO_BUCKET)
      .upload(filePath, image, {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          message: uploadError.message,
        },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = adminSupabase.storage
      .from(PORTFOLIO_BUCKET)
      .getPublicUrl(filePath);

    imageUrl = publicUrlData.publicUrl;
  }

  const { data: portfolioItem, error: insertError } = await adminSupabase
    .from("portfolio_items")
    .insert({
      designer_id: authState.designerProfile.id,
      title,
      description: description.length > 0 ? description : null,
      category,
      industry,
      image_url: imageUrl,
      ai_analysis_status: imageUrl ? "not_started" : "skipped",
    })
    .select("id, designer_id, title, description, category, industry, image_url")
    .single();

  if (insertError) {
    return NextResponse.json(
      {
        message: insertError.message,
      },
      { status: 500 },
    );
  }

  let aiAnalysis: unknown = null;
  let aiAnalysisStatus: "completed" | "failed" | "skipped" = imageUrl
    ? "failed"
    : "skipped";

  if (imageUrl) {
    try {
      aiAnalysis = await analyzeDesignerPortfolio({
        portfolioItemId: portfolioItem.id,
        designerId: portfolioItem.designer_id,
        title: portfolioItem.title,
        description: portfolioItem.description,
        category: portfolioItem.category,
        industry: portfolioItem.industry,
        imageUrl: portfolioItem.image_url,
      });

      aiAnalysisStatus = "completed";
    } catch (analysisError) {
      aiAnalysisStatus = "failed";

      console.error("[DesignMatch AI] Portfolio analysis failed:", analysisError);
    }
  }

  return NextResponse.json({
    message:
      aiAnalysisStatus === "completed"
        ? "Đã thêm portfolio và cập nhật Designer Style DNA."
        : imageUrl
          ? "Đã thêm portfolio, nhưng AI chưa phân tích được DNA. Có thể phân tích lại sau."
          : "Đã thêm portfolio. Portfolio chưa có ảnh nên AI DNA được bỏ qua.",
    portfolioItem,
    aiAnalysisStatus,
    aiAnalysis,
  });
}

function getFileExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}