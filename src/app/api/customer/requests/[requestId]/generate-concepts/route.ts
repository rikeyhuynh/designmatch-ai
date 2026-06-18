import { NextResponse } from "next/server";

import { generateAIConceptDirections } from "@/lib/ai/tasks/concept-direction";
import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type AnyRecord = Record<string, any>;

type DesignRequestRow = {
  id: string;
  customer_id: string;
  title: string;
  business_name: string | null;
  industry: string | null;
  category: string | null;
  status: string | null;
  brief_review_status: string | null;
  package_code: string | null;
  package_name: string | null;
  package_type: string | null;
};

type AiBriefRow = {
  id: string;
  request_id: string | null;
  design_request_id: string | null;
  is_user_confirmed: boolean | null;
  status: string | null;
  content: string | null;
  brief_json: unknown;
  customer_edited_brief_json: unknown;
  final_brief_json: unknown;
  project_title: string | null;
  business_context: string | null;
  design_objective: string | null;
  objective: string | null;
  target_audience: string | null;
  key_message: string | null;
  deliverables: string[] | null;
  content_requirements: string[] | null;
  technical_requirements: string[] | null;
  references_to_collect: string[] | null;
  designer_notes: string | null;
};

type AiVisualIntakeRow = {
  id: string;
  design_request_id: string | null;
  customer_profile_id: string | null;
  detected_industry: string | null;
  detected_product_type: string | null;
  detected_main_colors: unknown;
  detected_mood_tags: string[] | null;
  suggested_style_tags: string[] | null;
  avoid_style_tags: string[] | null;
  target_audience_suggestions: string[] | null;
  recommended_design_types: string[] | null;
  recommended_channels: string[] | null;
  visual_summary: string | null;
  designer_matching_notes: string | null;
  confidence_score: number | null;
  user_edited_result: unknown;
};

type AiBriefRiskReportRow = {
  id: string;
  design_request_id: string | null;
  customer_profile_id: string | null;
  risk_score: number | null;
  risk_level: string | null;
  risk_summary: string | null;
  missing_information: string[] | null;
  unclear_points: string[] | null;
  scope_creep_risks: string[] | null;
  budget_timeline_risks: string[] | null;
  recommended_questions: string[] | null;
  matching_hints: unknown;
  risk_json: unknown;
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
        message: "Bạn cần đăng nhập để tạo concept direction.",
      },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "customer" || !authState.customerProfile) {
    return NextResponse.json(
      {
        message: "Chỉ customer mới có thể tạo concept direction.",
      },
      { status: 403 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: designRequestData, error: requestError } =
    await adminSupabase
      .from("design_requests")
      .select(
        `
        id,
        customer_id,
        title,
        business_name,
        industry,
        category,
        status,
        brief_review_status,
        package_code,
        package_name,
        package_type
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

  if (!designRequestData) {
    return NextResponse.json(
      {
        message:
          "Không tìm thấy request hoặc bạn không có quyền xử lý request này.",
      },
      { status: 404 },
    );
  }

  const designRequest = designRequestData as DesignRequestRow;

  const { data: aiBriefData, error: aiBriefError } = await adminSupabase
    .from("ai_briefs")
    .select(
      `
      id,
      request_id,
      design_request_id,
      is_user_confirmed,
      status,
      content,
      brief_json,
      customer_edited_brief_json,
      final_brief_json,
      project_title,
      business_context,
      design_objective,
      objective,
      target_audience,
      key_message,
      deliverables,
      content_requirements,
      technical_requirements,
      references_to_collect,
      designer_notes
    `,
    )
    .or(
      `request_id.eq.${designRequest.id},design_request_id.eq.${designRequest.id}`,
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (aiBriefError) {
    return NextResponse.json(
      {
        message: aiBriefError.message,
      },
      { status: 500 },
    );
  }

  if (!aiBriefData) {
    return NextResponse.json(
      {
        message:
          "Request này chưa có AI brief. Hãy tạo brief trước khi tạo concept direction.",
      },
      { status: 409 },
    );
  }

  const aiBrief = aiBriefData as AiBriefRow;

  const isBriefConfirmed =
    Boolean(aiBrief.is_user_confirmed) ||
    aiBrief.status === "confirmed" ||
    designRequest.brief_review_status === "confirmed" ||
    Object.keys(asRecord(aiBrief.final_brief_json)).length > 0;

  if (!isBriefConfirmed) {
    return NextResponse.json(
      {
        message:
          "Bạn cần chốt brief trước khi tạo concept direction. Hãy vào trang Review Brief và bấm “Chốt brief gửi designer”.",
      },
      { status: 409 },
    );
  }

  const finalBriefJson = buildFinalBriefJson(aiBrief);

  if (
    !stringValue(finalBriefJson.project_title ?? aiBrief.project_title) ||
    !stringValue(
      finalBriefJson.design_objective ??
        aiBrief.design_objective ??
        aiBrief.objective,
    )
  ) {
    return NextResponse.json(
      {
        message:
          "Brief đã chốt chưa đủ dữ liệu để tạo concept direction. Hãy kiểm tra lại tên dự án và mục tiêu thiết kế.",
      },
      { status: 409 },
    );
  }

  const [visualIntakeResult, riskReportResult] = await Promise.all([
    adminSupabase
      .from("ai_visual_intakes")
      .select(
        `
        id,
        design_request_id,
        customer_profile_id,
        detected_industry,
        detected_product_type,
        detected_main_colors,
        detected_mood_tags,
        suggested_style_tags,
        avoid_style_tags,
        target_audience_suggestions,
        recommended_design_types,
        recommended_channels,
        visual_summary,
        designer_matching_notes,
        confidence_score,
        user_edited_result
      `,
      )
      .eq("design_request_id", designRequest.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    adminSupabase
      .from("ai_brief_risk_reports")
      .select(
        `
        id,
        design_request_id,
        customer_profile_id,
        risk_score,
        risk_level,
        risk_summary,
        missing_information,
        unclear_points,
        scope_creep_risks,
        budget_timeline_risks,
        recommended_questions,
        matching_hints,
        risk_json
      `,
      )
      .eq("design_request_id", designRequest.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (visualIntakeResult.error) {
    return NextResponse.json(
      {
        message: visualIntakeResult.error.message,
      },
      { status: 500 },
    );
  }

  if (riskReportResult.error) {
    return NextResponse.json(
      {
        message: riskReportResult.error.message,
      },
      { status: 500 },
    );
  }

  const visualIntake = visualIntakeResult.data
    ? normalizeVisualIntake(visualIntakeResult.data as AiVisualIntakeRow)
    : null;

  const riskReport = riskReportResult.data
    ? normalizeRiskReport(riskReportResult.data as AiBriefRiskReportRow)
    : null;

  try {
    const conceptResult = await generateAIConceptDirections({
      designRequestId: designRequest.id,
      customerProfileId: authState.customerProfile.id,
      aiBriefId: aiBrief.id,

      requestTitle:
        stringValue(finalBriefJson.project_title) ||
        stringValue(aiBrief.project_title) ||
        designRequest.title,
      businessName: designRequest.business_name,
      designType: designRequest.category,
      channel: "social media / digital",

      packageCode: designRequest.package_code,
      packageName: designRequest.package_name,
      packageType: designRequest.package_type,

      finalBriefJson,
      briefText: stringValue(aiBrief.content),
      visualIntakeResult: visualIntake,
      riskReport,
      pricingPackage: asRecord(finalBriefJson.package_scope),
    });

    const responseConcepts = conceptResult.result.concepts.map(
      (concept, index) => ({
        id:
          conceptResult.savedConceptDirectionIds[index] ??
          `${designRequest.id}-${concept.concept_key}`,
        display_order: index + 1,
        is_selected: false,
        ...concept,
      }),
    );

    return NextResponse.json({
      message: "Đã tạo concept direction 100% bằng AI dựa trên brief đã chốt và sản phẩm khách chọn.",
      aiModelRunId: conceptResult.aiModelRunId,
      savedConceptDirectionIds: conceptResult.savedConceptDirectionIds,
      conceptSetSummary: conceptResult.result.concept_set_summary,
      recommendedConceptKey: conceptResult.result.recommended_concept_key,
      selectionGuidance: conceptResult.result.selection_guidance,
      fallback: false,
      fallbackReason: null,
      concepts: responseConcepts,
    });
  } catch (error) {
    console.error("[DesignMatch AI] Generate concept directions failed:", {
      requestId: designRequest.id,
      error,
    });

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Không thể tạo concept direction bằng AI lúc này. Vui lòng thử lại sau.",
      },
      { status: 500 },
    );
  }
}

function buildFinalBriefJson(aiBrief: AiBriefRow): AnyRecord {
  const finalBriefJson = asRecord(aiBrief.final_brief_json);
  const customerEditedBriefJson = asRecord(aiBrief.customer_edited_brief_json);
  const originalBriefJson = asRecord(aiBrief.brief_json);

  const source =
    Object.keys(finalBriefJson).length > 0
      ? finalBriefJson
      : Object.keys(customerEditedBriefJson).length > 0
        ? customerEditedBriefJson
        : originalBriefJson;

  return {
    ...source,
    project_title: stringValue(source.project_title ?? aiBrief.project_title),
    business_context: stringValue(
      source.business_context ?? aiBrief.business_context,
    ),
    design_objective: stringValue(
      source.design_objective ?? aiBrief.design_objective ?? aiBrief.objective,
    ),
    target_audience: stringValue(
      source.target_audience ?? aiBrief.target_audience,
    ),
    key_message: stringValue(source.key_message ?? aiBrief.key_message),
    deliverables: stringArray(source.deliverables ?? aiBrief.deliverables),
    content_requirements: stringArray(
      source.content_requirements ?? aiBrief.content_requirements,
    ),
    technical_requirements: stringArray(
      source.technical_requirements ?? aiBrief.technical_requirements,
    ),
    references_to_collect: stringArray(
      source.references_to_collect ?? aiBrief.references_to_collect,
    ),
    designer_notes: stringValue(source.designer_notes ?? aiBrief.designer_notes),
  };
}

function normalizeVisualIntake(row: AiVisualIntakeRow) {
  return {
    id: row.id,
    detected_industry: row.detected_industry,
    detected_product_type: row.detected_product_type,
    detected_main_colors: row.detected_main_colors,
    detected_mood_tags: row.detected_mood_tags ?? [],
    suggested_style_tags: row.suggested_style_tags ?? [],
    avoid_style_tags: row.avoid_style_tags ?? [],
    target_audience_suggestions: row.target_audience_suggestions ?? [],
    recommended_design_types: row.recommended_design_types ?? [],
    recommended_channels: row.recommended_channels ?? [],
    visual_summary: row.visual_summary,
    designer_matching_notes: row.designer_matching_notes,
    confidence_score: Number(row.confidence_score ?? 0),
    user_edited_result: row.user_edited_result,
  };
}

function normalizeRiskReport(row: AiBriefRiskReportRow) {
  return {
    id: row.id,
    risk_score: Number(row.risk_score ?? 0),
    risk_level: row.risk_level,
    risk_summary: row.risk_summary,
    missing_information: row.missing_information ?? [],
    unclear_points: row.unclear_points ?? [],
    scope_creep_risks: row.scope_creep_risks ?? [],
    budget_timeline_risks: row.budget_timeline_risks ?? [],
    recommended_questions: row.recommended_questions ?? [],
    matching_hints: row.matching_hints,
    risk_json: row.risk_json,
  };
}

function asRecord(value: unknown): AnyRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as AnyRecord;
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => stringValue(item)).filter(Boolean);
}