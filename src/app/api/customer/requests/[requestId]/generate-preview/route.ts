import { NextResponse } from "next/server";

import { generateVisualConceptPreview } from "@/lib/ai/tasks/visual-concept-preview";
import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type DesignRequestRow = {
  id: string;
  customer_id: string;
  title: string | null;
  business_name: string | null;
  category: string | null;
  package_code: string | null;
  package_name: string | null;
  package_type: string | null;
  brief_review_status: string | null;
};

type ConceptDirectionRow = {
  id: string;
  design_request_id: string;
  concept_key: string | null;
  concept_name: string | null;
  concept_summary: string | null;
  strategic_role: string | null;
  best_for: string[] | null;
  mood_tags: string[] | null;
  style_tags: string[] | null;
  color_palette: unknown;
  typography_direction: string | null;
  layout_direction: string | null;
  image_direction: string | null;
  content_direction: string | null;
  preview_image_prompt: string | null;
  designer_guidance: string | null;
  customer_explanation: string | null;
  suitability_score: number | null;
  differentiation_score: number | null;
  risk_notes: string[] | null;
  is_selected: boolean | null;
};

type AiBriefRow = {
  id: string;
  request_id: string | null;
  design_request_id: string | null;
  brief_json: unknown;
  customer_edited_brief_json: unknown;
  final_brief_json: unknown;
};

export async function POST(_request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const requestId = routeParams.requestId ?? routeParams.requestID;

  if (!requestId) {
    return NextResponse.json(
      {
        message: "Thiếu request ID.",
      },
      { status: 400 },
    );
  }

  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated || !authState.profile) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập để tạo visual concept preview.",
      },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "customer" || !authState.customerProfile) {
    return NextResponse.json(
      {
        message: "Chỉ customer mới có thể tạo visual concept preview.",
      },
      { status: 403 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: requestData, error: requestError } = await adminSupabase
    .from("design_requests")
    .select(
      `
      id,
      customer_id,
      title,
      business_name,
      category,
      package_code,
      package_name,
      package_type,
      brief_review_status
    `,
    )
    .eq("id", requestId)
    .eq("customer_id", authState.customerProfile.id)
    .maybeSingle();

  if (requestError) {
    return NextResponse.json(
      {
        message: requestError.message,
      },
      { status: 500 },
    );
  }

  if (!requestData) {
    return NextResponse.json(
      {
        message:
          "Không tìm thấy request hoặc bạn không có quyền tạo preview cho request này.",
      },
      { status: 404 },
    );
  }

  const designRequest = requestData as DesignRequestRow;

  const { data: conceptData, error: conceptError } = await adminSupabase
    .from("ai_concept_directions")
    .select(
      `
      id,
      design_request_id,
      concept_key,
      concept_name,
      concept_summary,
      strategic_role,
      best_for,
      mood_tags,
      style_tags,
      color_palette,
      typography_direction,
      layout_direction,
      image_direction,
      content_direction,
      preview_image_prompt,
      designer_guidance,
      customer_explanation,
      suitability_score,
      differentiation_score,
      risk_notes,
      is_selected
    `,
    )
    .eq("design_request_id", designRequest.id)
    .eq("is_selected", true)
    .maybeSingle();

  if (conceptError) {
    return NextResponse.json(
      {
        message: conceptError.message,
      },
      { status: 500 },
    );
  }

  if (!conceptData) {
    return NextResponse.json(
      {
        message:
          "Bạn cần chọn một concept direction trước khi tạo visual preview.",
      },
      { status: 409 },
    );
  }

  const selectedConcept = conceptData as ConceptDirectionRow;

  const { data: briefData, error: briefError } = await adminSupabase
    .from("ai_briefs")
    .select(
      `
      id,
      request_id,
      design_request_id,
      brief_json,
      customer_edited_brief_json,
      final_brief_json
    `,
    )
    .or(
      `request_id.eq.${designRequest.id},design_request_id.eq.${designRequest.id}`,
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (briefError) {
    return NextResponse.json(
      {
        message: briefError.message,
      },
      { status: 500 },
    );
  }

  const brief = briefData as AiBriefRow | null;
  const finalBriefJson = buildFinalBriefJson(brief);

  try {
    const preview = await generateVisualConceptPreview({
      designRequestId: designRequest.id,
      customerProfileId: authState.customerProfile.id,
      conceptDirectionId: selectedConcept.id,
      finalBriefJson,
      conceptDirection: normalizeConceptDirection(selectedConcept),
      designType: designRequest.category,
      packageCode: designRequest.package_code,
      packageName: designRequest.package_name,
      packageType: designRequest.package_type,
    });

    return NextResponse.json({
      message: "Đã tạo visual concept preview đúng theo sản phẩm đã chọn.",
      preview,
    });
  } catch (error) {
    console.error("[DesignMatch AI] Generate visual preview failed:", {
      requestId: designRequest.id,
      conceptDirectionId: selectedConcept.id,
      error,
    });

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Không thể tạo visual concept preview lúc này.",
      },
      { status: 500 },
    );
  }
}

function buildFinalBriefJson(brief: AiBriefRow | null) {
  if (!brief) {
    return {};
  }

  const finalBriefJson = asRecord(brief.final_brief_json);
  const customerEditedBriefJson = asRecord(brief.customer_edited_brief_json);
  const originalBriefJson = asRecord(brief.brief_json);

  if (Object.keys(finalBriefJson).length > 0) {
    return finalBriefJson;
  }

  if (Object.keys(customerEditedBriefJson).length > 0) {
    return customerEditedBriefJson;
  }

  return originalBriefJson;
}

function normalizeConceptDirection(row: ConceptDirectionRow) {
  return {
    id: row.id,
    design_request_id: row.design_request_id,
    concept_key: row.concept_key ?? "",
    concept_name: row.concept_name ?? "",
    concept_summary: row.concept_summary ?? "",
    strategic_role: row.strategic_role ?? "",
    best_for: row.best_for ?? [],
    mood_tags: row.mood_tags ?? [],
    style_tags: row.style_tags ?? [],
    color_palette: row.color_palette,
    typography_direction: row.typography_direction ?? "",
    layout_direction: row.layout_direction ?? "",
    image_direction: row.image_direction ?? "",
    content_direction: row.content_direction ?? "",
    preview_image_prompt: row.preview_image_prompt ?? "",
    designer_guidance: row.designer_guidance ?? "",
    customer_explanation: row.customer_explanation ?? "",
    suitability_score: Number(row.suitability_score ?? 0),
    differentiation_score: Number(row.differentiation_score ?? 0),
    risk_notes: row.risk_notes ?? [],
    is_selected: Boolean(row.is_selected),
  };
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, any>;
}