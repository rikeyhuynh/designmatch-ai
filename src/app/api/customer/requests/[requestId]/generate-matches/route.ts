import { NextResponse } from "next/server";

import {
  DESIGNER_PORTFOLIO_MATCH_PROMPT_VERSION,
  scoreDesignerBriefMatchWithAI,
  type DesignerProfileForAIMatch,
  type DesignerStyleDNAForAIMatch,
  type FinalBriefForAIMatch,
  type PortfolioEvidenceForAIMatch,
  type SelectedConceptForAIMatch,
  type VisualConceptPreviewForAIMatch,
} from "@/lib/ai/tasks/designer-brief-portfolio-match";
import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type DesignRequestRow = {
  id: string;
  customer_id: string;
  title: string;
  business_name: string;
  industry: string;
  category: string;
  budget_min_vnd: number;
  budget_max_vnd: number;
  status: string;
  brief_review_status: string | null;
  preferred_styles: string[] | null;
};

type AiBriefRow = {
  id: string;
  is_user_confirmed: boolean | null;
  status: string | null;
  brief_json: unknown;
  customer_edited_brief_json: unknown;
  final_brief_json: unknown;
  project_title: string | null;
  business_context: string | null;
  design_objective: string | null;
  objective: string | null;
  target_audience: string | null;
  visual_direction: string | null;
  key_message: string | null;
  deliverables: string[] | null;
  content_requirements: string[] | null;
  technical_requirements: string[] | null;
  references_to_collect: string[] | null;
  designer_notes: string | null;
};

type SelectedConceptDirectionRow = {
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

type ConceptPreviewRow = {
  id: string;
  concept_direction_id: string;
  provider: string | null;
  model: string | null;
  prompt: string | null;
  image_public_url: string | null;
  image_mime_type: string | null;
  preview_status: string | null;
  created_at: string | null;
};

type DesignerRow = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number;
  completed_jobs: number;
  response_time_hours: number;
  availability: string | null;
  verification_status: string | null;
  minimum_project_budget_vnd: number | null;
  specialties: string[] | null;
  styles: string[] | null;
};

type PortfolioRow = {
  id: string;
  designer_id: string;
  title: string;
  industry: string;
  category: string;
  image_url: string | null;
  ai_analysis_status: string | null;
  ai_style_tags: string[] | null;
  ai_industry_tags: string[] | null;
  ai_category_tags: string[] | null;
  ai_visual_summary: string | null;
  ai_confidence_score: number | null;
};

type PortfolioAnalysisRow = {
  portfolio_item_id: string | null;
  designer_id: string | null;
  designer_profile_id?: string | null;
  style_tags: string[] | null;
  mood_tags: string[] | null;
  industry_tags: string[] | null;
  category_tags: string[] | null;
  color_tags: string[] | null;
  typography_tags: string[] | null;
  layout_tags: string[] | null;
  visual_strengths: string[] | null;
  visual_summary: string | null;
  confidence_score: number | null;
};

type DesignerStyleDNARow = {
  designer_id: string | null;
  designer_profile_id?: string | null;
  analyzed_portfolio_count: number | null;
  style_tags: string[] | null;
  industry_tags: string[] | null;
  category_tags: string[] | null;
  visual_strengths: string[] | null;
  common_moods: string[] | null;
  color_preferences: string[] | null;
  typography_preferences: string[] | null;
  layout_preferences: string[] | null;
  dna_summary: string | null;
  confidence_score: number | null;
};

type ScoredDesigner = {
  designer: DesignerRow;
  score: number;
  reasons: string[];
  matchedPortfolioIds: string[];
};

const MAX_AI_CANDIDATES = 12;
const MAX_MATCHES = 5;
const MIN_MATCH_SCORE = 0;
const MAX_MATCH_SCORE = 100;

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
        message: "Bạn cần đăng nhập để tạo designer matches.",
      },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "customer" || !authState.customerProfile) {
    return NextResponse.json(
      {
        message: "Chỉ customer mới có thể tạo designer matches.",
      },
      { status: 403 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: designRequest, error: requestError } = await adminSupabase
    .from("design_requests")
    .select(
      `
      id,
      customer_id,
      title,
      business_name,
      industry,
      category,
      budget_min_vnd,
      budget_max_vnd,
      status,
      brief_review_status,
      preferred_styles
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

  if (!designRequest) {
    return NextResponse.json(
      {
        message:
          "Không tìm thấy request hoặc bạn không có quyền xử lý request này.",
      },
      { status: 404 },
    );
  }

  const request = designRequest as DesignRequestRow;

  const { data: aiBriefData, error: aiBriefError } = await adminSupabase
    .from("ai_briefs")
    .select(
      `
      id,
      is_user_confirmed,
      status,
      brief_json,
      customer_edited_brief_json,
      final_brief_json,
      project_title,
      business_context,
      design_objective,
      objective,
      target_audience,
      visual_direction,
      key_message,
      deliverables,
      content_requirements,
      technical_requirements,
      references_to_collect,
      designer_notes
    `,
    )
    .or(`request_id.eq.${request.id},design_request_id.eq.${request.id}`)
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
          "Request này chưa có AI brief. Hãy tạo brief và chốt brief trước khi tìm designer.",
      },
      { status: 409 },
    );
  }

  const aiBrief = aiBriefData as AiBriefRow;

  const isBriefConfirmed =
    Boolean(aiBrief.is_user_confirmed) ||
    request.brief_review_status === "confirmed" ||
    aiBrief.status === "confirmed";

  if (!isBriefConfirmed) {
    return NextResponse.json(
      {
        message:
          "Bạn cần chốt brief trước khi tạo designer matches. Hãy vào trang Review Brief và bấm “Chốt brief gửi designer”.",
      },
      { status: 409 },
    );
  }

  const finalBrief = normalizeFinalBrief(aiBrief);

  if (!finalBrief.project_title || !finalBrief.design_objective) {
    return NextResponse.json(
      {
        message:
          "Brief đã chốt chưa đủ dữ liệu để matching. Hãy kiểm tra lại tên dự án và mục tiêu thiết kế.",
      },
      { status: 409 },
    );
  }

  const {
    selectedConceptDirection,
    visualConceptPreview,
    selectedConceptError,
    visualPreviewError,
  } = await loadSelectedConceptContext(adminSupabase, request.id);

  if (selectedConceptError) {
    return NextResponse.json(
      {
        message: selectedConceptError,
      },
      { status: 500 },
    );
  }

  if (visualPreviewError) {
    return NextResponse.json(
      {
        message: visualPreviewError,
      },
      { status: 500 },
    );
  }

  const { data: designersData, error: designersError } = await adminSupabase
    .from("designer_profiles")
    .select(
      `
      id,
      display_name,
      headline,
      rating,
      completed_jobs,
      response_time_hours,
      availability,
      verification_status,
      minimum_project_budget_vnd,
      specialties,
      styles
    `,
    )
    .eq("verification_status", "approved")
    .eq("availability", "available");

  if (designersError) {
    return NextResponse.json(
      {
        message: designersError.message,
      },
      { status: 500 },
    );
  }

  const approvedDesigners = (designersData ?? []) as unknown as DesignerRow[];
  const approvedDesignerIds = approvedDesigners.map((designer) => designer.id);

  if (approvedDesignerIds.length === 0) {
    await adminSupabase
      .from("designer_matches")
      .delete()
      .eq("request_id", request.id);

    return NextResponse.json({
      message:
        "Hiện chưa có designer nào đã được admin duyệt và đang sẵn sàng nhận dự án.",
      matches: [],
    });
  }

  const [
    portfolioResult,
    portfolioAnalysisResult,
    designerStyleDNAResult,
  ] = await Promise.all([
    adminSupabase
      .from("portfolio_items")
      .select(
        `
        id,
        designer_id,
        title,
        industry,
        category,
        image_url,
        ai_analysis_status,
        ai_style_tags,
        ai_industry_tags,
        ai_category_tags,
        ai_visual_summary,
        ai_confidence_score
      `,
      )
      .in("designer_id", approvedDesignerIds),

    adminSupabase
      .from("portfolio_ai_analysis")
      .select(
        `
        portfolio_item_id,
        designer_id,
        designer_profile_id,
        style_tags,
        mood_tags,
        industry_tags,
        category_tags,
        color_tags,
        typography_tags,
        layout_tags,
        visual_strengths,
        visual_summary,
        confidence_score
      `,
      )
      .or(
        `designer_id.in.(${approvedDesignerIds.join(
          ",",
        )}),designer_profile_id.in.(${approvedDesignerIds.join(",")})`,
      ),

    adminSupabase
      .from("designer_style_dna")
      .select(
        `
        designer_id,
        designer_profile_id,
        analyzed_portfolio_count,
        style_tags,
        industry_tags,
        category_tags,
        visual_strengths,
        common_moods,
        color_preferences,
        typography_preferences,
        layout_preferences,
        dna_summary,
        confidence_score
      `,
      )
      .or(
        `designer_id.in.(${approvedDesignerIds.join(
          ",",
        )}),designer_profile_id.in.(${approvedDesignerIds.join(",")})`,
      ),
  ]);

  if (portfolioResult.error) {
    return NextResponse.json(
      {
        message: portfolioResult.error.message,
      },
      { status: 500 },
    );
  }

  if (portfolioAnalysisResult.error) {
    return NextResponse.json(
      {
        message: portfolioAnalysisResult.error.message,
      },
      { status: 500 },
    );
  }

  if (designerStyleDNAResult.error) {
    return NextResponse.json(
      {
        message: designerStyleDNAResult.error.message,
      },
      { status: 500 },
    );
  }

  const portfolioItems =
    (portfolioResult.data ?? []) as unknown as PortfolioRow[];

  const portfolioAnalyses =
    (portfolioAnalysisResult.data ?? []) as unknown as PortfolioAnalysisRow[];

  const designerStyleDNAs =
    (designerStyleDNAResult.data ?? []) as unknown as DesignerStyleDNARow[];

  const candidateDesigners = approvedDesigners
    .map((designer) => ({
      designer,
      preScore: scoreCandidateBeforeAI({
        designer,
        request,
        finalBrief,
        selectedConceptDirection,
        portfolioItems: portfolioItems.filter(
          (item) => item.designer_id === designer.id,
        ),
        dna: findDesignerDNA(designerStyleDNAs, designer.id),
      }),
    }))
    .sort((a, b) => b.preScore - a.preScore)
    .slice(0, MAX_AI_CANDIDATES)
    .map((item) => item.designer);

  const aiScoredDesigners: ScoredDesigner[] = [];
  const aiFailedDesignerIds: string[] = [];

  for (const designer of candidateDesigners) {
    const designerPortfolioItems = portfolioItems.filter(
      (item) => item.designer_id === designer.id,
    );

    const designerPortfolioAnalyses = portfolioAnalyses.filter(
      (item) =>
        item.designer_id === designer.id ||
        item.designer_profile_id === designer.id,
    );

    const portfolioEvidence = buildPortfolioEvidence({
      portfolioItems: designerPortfolioItems,
      portfolioAnalyses: designerPortfolioAnalyses,
    });

    const designerDNA = normalizeDesignerDNA(
      findDesignerDNA(designerStyleDNAs, designer.id),
    );

    try {
      const aiMatch = await scoreDesignerBriefMatchWithAI({
        requestId: request.id,
        aiBriefId: aiBrief.id,
        designerId: designer.id,
        request: {
          title: request.title,
          business_name: request.business_name,
          industry: request.industry,
          category: request.category,
          budget_min_vnd: request.budget_min_vnd,
          budget_max_vnd: request.budget_max_vnd,
          preferred_styles: request.preferred_styles ?? [],
        },
        finalBrief,
        selectedConceptDirection,
        visualConceptPreview,
        designerProfile: normalizeDesignerProfile(designer),
        designerStyleDNA: designerDNA,
        portfolioEvidence,
      });

      const aiScore = clampMatchScore(aiMatch.result.match_score);

      if (aiScore <= 0) {
        aiFailedDesignerIds.push(designer.id);
        continue;
      }

      const { error: aiScoreInsertError } = await adminSupabase
        .from("ai_designer_match_scores")
        .upsert(
          {
            request_id: request.id,
            designer_id: designer.id,
            ai_brief_id: aiBrief.id,
            ai_model_run_id: aiMatch.aiModelRunId,
            provider: aiMatch.provider,
            model: aiMatch.model,
            match_score: aiScore,
            portfolio_fit_score: aiMatch.result.portfolio_fit_score,
            style_fit_score: aiMatch.result.style_fit_score,
            vibe_fit_score: aiMatch.result.vibe_fit_score,
            industry_context_fit_score:
              aiMatch.result.industry_context_fit_score,
            budget_fit_score: aiMatch.result.budget_fit_score,
            not_same_style_but_same_vibe:
              aiMatch.result.not_same_style_but_same_vibe,
            match_reasons: aiMatch.result.match_reasons,
            risk_flags: aiMatch.result.risk_flags,
            matched_portfolio_evidence:
              aiMatch.result.matched_portfolio_evidence,
            analysis_json: {
              ...aiMatch.result,
              selected_concept_direction: selectedConceptDirection,
              visual_concept_preview: visualConceptPreview,
              prompt_version: DESIGNER_PORTFOLIO_MATCH_PROMPT_VERSION,
            },
            prompt_version: DESIGNER_PORTFOLIO_MATCH_PROMPT_VERSION,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "request_id,designer_id",
          },
        );

      if (aiScoreInsertError) {
        console.warn("[DesignMatch AI] Could not save AI match score:", {
          requestId: request.id,
          designerId: designer.id,
          error: aiScoreInsertError.message,
        });
      }

      aiScoredDesigners.push({
        designer,
        score: aiScore,
        reasons: buildDesignerMatchReasons({
          aiResult: aiMatch.result,
          selectedConceptDirection,
          visualConceptPreview,
        }),
        matchedPortfolioIds: getMatchedPortfolioIdsFromAIResult({
          aiMatchedPortfolioEvidence:
            aiMatch.result.matched_portfolio_evidence,
          fallbackPortfolioItems: designerPortfolioItems,
        }),
      });
    } catch (error) {
      aiFailedDesignerIds.push(designer.id);

      console.error("[DesignMatch AI] AI designer portfolio match failed:", {
        requestId: request.id,
        designerId: designer.id,
        error,
      });
    }
  }

  const scoredDesigners = aiScoredDesigners
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const ratingDiff =
        Number(b.designer.rating ?? 0) - Number(a.designer.rating ?? 0);

      if (ratingDiff !== 0) return ratingDiff;

      return (
        Number(b.designer.completed_jobs ?? 0) -
        Number(a.designer.completed_jobs ?? 0)
      );
    })
    .slice(0, MAX_MATCHES);

  await adminSupabase
    .from("designer_matches")
    .delete()
    .eq("request_id", request.id);

  if (scoredDesigners.length === 0) {
    return NextResponse.json(
      {
        message:
          "AI 100% chưa tạo được designer matches vì tất cả lần chấm điểm AI đều lỗi hoặc trả điểm không hợp lệ. Hãy kiểm tra log terminal phần AI designer portfolio match failed.",
        matches: [],
        ai_failed_designer_ids: aiFailedDesignerIds,
      },
      {
        status: 409,
      },
    );
  }

  const matchRows = scoredDesigners.map((item) => ({
    request_id: request.id,
    designer_id: item.designer.id,
    match_score: clampMatchScore(item.score),
    taste_gap: 0,
    reason:
      item.reasons[0] ??
      "AI đánh giá designer phù hợp với brief, concept, portfolio và Style DNA.",
    match_reasons: item.reasons,
    matched_portfolio_ids: item.matchedPortfolioIds,
  }));

  const { data: insertedMatches, error: insertError } = await adminSupabase
    .from("designer_matches")
    .insert(matchRows)
    .select(
      "id, request_id, designer_id, match_score, taste_gap, reason, match_reasons, matched_portfolio_ids",
    );

  if (insertError) {
    return NextResponse.json(
      {
        message: insertError.message,
      },
      { status: 500 },
    );
  }

  await adminSupabase
    .from("design_requests")
    .update({
      status: "matched",
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id)
    .eq("customer_id", authState.customerProfile.id);

  return NextResponse.json({
    message:
      selectedConceptDirection && visualConceptPreview
        ? "Đã tạo designer matches 100% bằng AI dựa trên brief đã chốt, concept đã chọn, visual preview, portfolio analysis và Designer Style DNA."
        : selectedConceptDirection
          ? "Đã tạo designer matches 100% bằng AI dựa trên brief đã chốt, concept đã chọn, portfolio analysis và Designer Style DNA."
          : "Đã tạo designer matches 100% bằng AI dựa trên brief đã chốt, portfolio analysis và Designer Style DNA.",
    matches: insertedMatches ?? [],
    ai_failed_designer_ids: aiFailedDesignerIds,
  });
}

async function loadSelectedConceptContext(
  adminSupabase: any,
  requestId: string,
) {
  const { data: selectedConceptData, error: selectedConceptQueryError } =
    await adminSupabase
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
      .eq("design_request_id", requestId)
      .eq("is_selected", true)
      .limit(1)
      .maybeSingle();

  if (selectedConceptQueryError) {
    return {
      selectedConceptDirection: null,
      visualConceptPreview: null,
      selectedConceptError: selectedConceptQueryError.message,
      visualPreviewError: null,
    };
  }

  if (!selectedConceptData) {
    return {
      selectedConceptDirection: null,
      visualConceptPreview: null,
      selectedConceptError: null,
      visualPreviewError: null,
    };
  }

  const selectedConceptDirection = normalizeSelectedConceptDirection(
    selectedConceptData as SelectedConceptDirectionRow,
  );

  const { data: previewData, error: previewQueryError } = await adminSupabase
    .from("ai_concept_previews")
    .select(
      `
      id,
      concept_direction_id,
      provider,
      model,
      prompt,
      image_public_url,
      image_mime_type,
      preview_status,
      created_at
    `,
    )
    .eq("design_request_id", requestId)
    .eq("concept_direction_id", selectedConceptDirection.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previewQueryError) {
    return {
      selectedConceptDirection,
      visualConceptPreview: null,
      selectedConceptError: null,
      visualPreviewError: previewQueryError.message,
    };
  }

  return {
    selectedConceptDirection,
    visualConceptPreview: previewData
      ? normalizeVisualConceptPreview(previewData as ConceptPreviewRow)
      : null,
    selectedConceptError: null,
    visualPreviewError: null,
  };
}

function normalizeFinalBrief(aiBrief: AiBriefRow): FinalBriefForAIMatch {
  const finalBriefJson = asRecord(aiBrief.final_brief_json);
  const customerEditedBriefJson = asRecord(aiBrief.customer_edited_brief_json);
  const originalBriefJson = asRecord(aiBrief.brief_json);

  const source =
    Object.keys(finalBriefJson).length > 0
      ? finalBriefJson
      : Object.keys(customerEditedBriefJson).length > 0
        ? customerEditedBriefJson
        : originalBriefJson;

  const visualDirection = asRecord(source.visual_direction);

  return {
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
    visual_direction: {
      mood: stringArray(visualDirection.mood),
      style_tags: stringArray(visualDirection.style_tags),
      color_direction: stringArray(visualDirection.color_direction),
      typography_direction: stringValue(visualDirection.typography_direction),
      layout_direction: stringValue(visualDirection.layout_direction),
      image_direction: stringValue(visualDirection.image_direction),
    },
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

function normalizeSelectedConceptDirection(
  row: SelectedConceptDirectionRow,
): SelectedConceptForAIMatch {
  return {
    id: row.id,
    concept_key: row.concept_key ?? "",
    concept_name: row.concept_name ?? "",
    concept_summary: row.concept_summary ?? "",
    strategic_role: row.strategic_role ?? "",
    best_for: row.best_for ?? [],
    mood_tags: row.mood_tags ?? [],
    style_tags: row.style_tags ?? [],
    color_palette: normalizeColorPalette(row.color_palette),
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
  };
}

function normalizeVisualConceptPreview(
  row: ConceptPreviewRow,
): VisualConceptPreviewForAIMatch {
  return {
    id: row.id,
    concept_direction_id: row.concept_direction_id,
    provider: row.provider ?? "",
    model: row.model ?? "",
    prompt: row.prompt ?? "",
    image_public_url: row.image_public_url ?? "",
    image_mime_type: row.image_mime_type ?? "",
    preview_status: row.preview_status ?? "",
    created_at: row.created_at ?? "",
  };
}

function normalizeColorPalette(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);

      return {
        name: stringValue(record.name) || "Không xác định",
        hex_guess:
          typeof record.hex_guess === "string" &&
          /^#[0-9a-fA-F]{6}$/.test(record.hex_guess.trim())
            ? record.hex_guess.trim().toUpperCase()
            : null,
        role: stringValue(record.role) || "supporting",
      };
    })
    .filter((item) => item.name);
}

function normalizeDesignerProfile(
  designer: DesignerRow,
): DesignerProfileForAIMatch {
  return {
    id: designer.id,
    display_name: designer.display_name,
    headline: designer.headline,
    rating: Number(designer.rating ?? 0),
    completed_jobs: Number(designer.completed_jobs ?? 0),
    response_time_hours: Number(designer.response_time_hours ?? 24),
    availability: designer.availability,
    minimum_project_budget_vnd: designer.minimum_project_budget_vnd,
    specialties: designer.specialties ?? [],
    styles: designer.styles ?? [],
  };
}

function normalizeDesignerDNA(
  dna: DesignerStyleDNARow | null,
): DesignerStyleDNAForAIMatch | null {
  if (!dna) {
    return null;
  }

  return {
    analyzed_portfolio_count: Number(dna.analyzed_portfolio_count ?? 0),
    style_tags: dna.style_tags ?? [],
    industry_tags: dna.industry_tags ?? [],
    category_tags: dna.category_tags ?? [],
    visual_strengths: dna.visual_strengths ?? [],
    common_moods: dna.common_moods ?? [],
    color_preferences: dna.color_preferences ?? [],
    typography_preferences: dna.typography_preferences ?? [],
    layout_preferences: dna.layout_preferences ?? [],
    dna_summary: dna.dna_summary,
    confidence_score: Number(dna.confidence_score ?? 0),
  };
}

function findDesignerDNA(rows: DesignerStyleDNARow[], designerId: string) {
  return (
    rows.find(
      (row) =>
        row.designer_id === designerId ||
        row.designer_profile_id === designerId,
    ) ?? null
  );
}

function buildPortfolioEvidence({
  portfolioItems,
  portfolioAnalyses,
}: {
  portfolioItems: PortfolioRow[];
  portfolioAnalyses: PortfolioAnalysisRow[];
}): PortfolioEvidenceForAIMatch[] {
  return portfolioItems.slice(0, 8).map((portfolioItem) => {
    const analysis = portfolioAnalyses.find(
      (item) => item.portfolio_item_id === portfolioItem.id,
    );

    return {
      portfolio_item_id: portfolioItem.id,
      title: portfolioItem.title,
      declared_industry: portfolioItem.industry,
      declared_category: portfolioItem.category,
      image_url: portfolioItem.image_url,
      ai_visual_summary:
        analysis?.visual_summary ?? portfolioItem.ai_visual_summary,
      ai_style_tags:
        analysis?.style_tags ?? portfolioItem.ai_style_tags ?? [],
      ai_mood_tags: analysis?.mood_tags ?? [],
      ai_industry_tags:
        analysis?.industry_tags ?? portfolioItem.ai_industry_tags ?? [],
      ai_category_tags:
        analysis?.category_tags ?? portfolioItem.ai_category_tags ?? [],
      ai_color_tags: analysis?.color_tags ?? [],
      ai_typography_tags: analysis?.typography_tags ?? [],
      ai_layout_tags: analysis?.layout_tags ?? [],
      ai_visual_strengths: analysis?.visual_strengths ?? [],
      ai_confidence_score: Number(
        analysis?.confidence_score ?? portfolioItem.ai_confidence_score ?? 0,
      ),
    };
  });
}

function buildDesignerMatchReasons({
  aiResult,
  selectedConceptDirection,
  visualConceptPreview,
}: {
  aiResult: {
    match_score: number;
    portfolio_fit_score: number;
    style_fit_score: number;
    vibe_fit_score: number;
    industry_context_fit_score: number;
    budget_fit_score: number;
    not_same_style_but_same_vibe: boolean;
    match_reasons: string[];
    risk_flags: string[];
    fit_summary: string;
  };
  selectedConceptDirection: SelectedConceptForAIMatch | null;
  visualConceptPreview: VisualConceptPreviewForAIMatch | null;
}) {
  const reasons = [
    `AI match score: ${aiResult.match_score}/100.`,
    `Portfolio fit: ${aiResult.portfolio_fit_score}/100.`,
    `Style fit: ${aiResult.style_fit_score}/100.`,
    `Vibe fit: ${aiResult.vibe_fit_score}/100.`,
    `Industry/context fit: ${aiResult.industry_context_fit_score}/100.`,
    `Budget fit: ${aiResult.budget_fit_score}/100.`,
  ];

  if (selectedConceptDirection) {
    reasons.push(
      `Đã xét theo concept khách chọn: ${selectedConceptDirection.concept_name}.`,
    );
  }

  if (visualConceptPreview) {
    reasons.push("Đã xét thêm visual concept preview đã tạo.");
  }

  if (aiResult.not_same_style_but_same_vibe) {
    reasons.push(
      "Không trùng phong cách trực tiếp nhưng có cùng hơi hướng thị giác với brief/concept.",
    );
  }

  if (aiResult.fit_summary) {
    reasons.push(aiResult.fit_summary);
  }

  reasons.push(...aiResult.match_reasons);

  if (aiResult.risk_flags.length > 0) {
    reasons.push(`Lưu ý: ${aiResult.risk_flags.slice(0, 2).join("; ")}.`);
  }

  return Array.from(new Set(reasons.map((item) => item.trim()).filter(Boolean)))
    .slice(0, 8);
}

function getMatchedPortfolioIdsFromAIResult({
  aiMatchedPortfolioEvidence,
  fallbackPortfolioItems,
}: {
  aiMatchedPortfolioEvidence: Array<{
    portfolio_item_id: string;
  }>;
  fallbackPortfolioItems: PortfolioRow[];
}) {
  const aiIds = aiMatchedPortfolioEvidence
    .map((item) => item.portfolio_item_id)
    .filter(Boolean);

  if (aiIds.length > 0) {
    return Array.from(new Set(aiIds)).slice(0, 4);
  }

  return fallbackPortfolioItems.slice(0, 4).map((item) => item.id);
}

function scoreCandidateBeforeAI({
  designer,
  request,
  finalBrief,
  selectedConceptDirection,
  portfolioItems,
  dna,
}: {
  designer: DesignerRow;
  request: DesignRequestRow;
  finalBrief: FinalBriefForAIMatch;
  selectedConceptDirection: SelectedConceptForAIMatch | null;
  portfolioItems: PortfolioRow[];
  dna: DesignerStyleDNARow | null;
}) {
  let score = 0;

  if (designer.verification_status === "approved") score += 30;
  if (designer.availability === "available" || designer.availability === "open") {
    score += 15;
  }

  if (
    Number(designer.minimum_project_budget_vnd ?? 0) <=
    Number(request.budget_max_vnd ?? 0)
  ) {
    score += 10;
  }

  score += Math.min(portfolioItems.length * 3, 18);

  const categoryMatches = portfolioItems.filter(
    (item) => item.category === request.category,
  ).length;

  const industryMatches = portfolioItems.filter(
    (item) => item.industry === request.industry,
  ).length;

  score += Math.min(categoryMatches * 5, 15);
  score += Math.min(industryMatches * 5, 15);

  const dnaKeywords = [
    ...(dna?.style_tags ?? []),
    ...(dna?.common_moods ?? []),
    ...(dna?.color_preferences ?? []),
    ...(dna?.layout_preferences ?? []),
    ...(dna?.visual_strengths ?? []),
  ];

  const briefKeywords = [
    ...finalBrief.visual_direction.mood,
    ...finalBrief.visual_direction.style_tags,
    ...finalBrief.visual_direction.color_direction,
    finalBrief.visual_direction.typography_direction,
    finalBrief.visual_direction.layout_direction,
    finalBrief.visual_direction.image_direction,
    ...(selectedConceptDirection?.mood_tags ?? []),
    ...(selectedConceptDirection?.style_tags ?? []),
    ...(selectedConceptDirection?.best_for ?? []),
    ...(selectedConceptDirection?.color_palette.map((color) => color.name) ??
      []),
    selectedConceptDirection?.typography_direction ?? "",
    selectedConceptDirection?.layout_direction ?? "",
    selectedConceptDirection?.image_direction ?? "",
    selectedConceptDirection?.content_direction ?? "",
  ].filter(Boolean);

  const keywordHits = dnaKeywords.filter((dnaKeyword) =>
    briefKeywords.some((briefKeyword) =>
      isLooseTextMatch(dnaKeyword, briefKeyword),
    ),
  ).length;

  score += Math.min(keywordHits * 4, 24);

  score += Math.min(Number(designer.rating ?? 0) * 2, 10);
  score += Math.min(Number(designer.completed_jobs ?? 0) * 2, 10);

  return score;
}

function isLooseTextMatch(left: string, right: string) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, any>;
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

function clampMatchScore(score: number) {
  if (!Number.isFinite(score)) return MIN_MATCH_SCORE;

  return Math.min(
    MAX_MATCH_SCORE,
    Math.max(MIN_MATCH_SCORE, Math.round(score)),
  );
}