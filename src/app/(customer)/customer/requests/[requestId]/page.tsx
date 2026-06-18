import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  ImageIcon,
  LayoutTemplate,
  Lightbulb,
  Palette,
  PencilLine,
  Sparkles,
  Star,
  Store,
  Target,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  CreateJobFromMatchButton,
  GenerateBriefButton,
  GenerateMatchesButton,
  OpenJobButton,
} from "@/features/customer/requests/components/request-detail-actions";
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel, getIndustryLabel } from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteProps = {
  params: Promise<Record<string, string>>;
};

type JsonRecord = Record<string, unknown>;

type RequestRow = {
  id: string;
  customer_id: string;
  title: string;
  business_name: string;
  industry: string;
  category: string;
  description: string;
  target_audience: string | null;
  budget_min_vnd: number;
  budget_max_vnd: number;
  deadline: string | null;
  status: string;
  brief_review_status: string | null;
  brief_confirmed_at: string | null;
  created_at: string;
};

type AiBriefRow = {
  id: string;
  request_id: string | null;
  design_request_id: string | null;
  objective: string | null;
  visual_direction: string | null;
  key_message: string | null;
  brief_completeness_score: number | null;
  brief_json: unknown;
  customer_edited_brief_json: unknown;
  final_brief_json: unknown;
  project_title: string | null;
  design_objective: string | null;
  is_user_confirmed: boolean | null;
  status: string | null;
  confirmed_at: string | null;
  created_at: string;
};

type BriefDisplay = {
  objective: string;
  visualDirection: string;
  keyMessage: string | null;
  deliverables: string[];
  contentRequirements: string[];
  technicalRequirements: string[];
};

type SelectedConceptRow = {
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
  created_at: string | null;
};

type ConceptPreviewRow = {
  id: string;
  design_request_id: string;
  concept_direction_id: string;
  image_public_url: string | null;
  image_storage_path: string | null;
  image_mime_type: string | null;
  provider: string | null;
  model: string | null;
  prompt: string | null;
  preview_status: string | null;
  created_at: string | null;
};

type MatchRow = {
  id: string;
  request_id: string;
  designer_id: string;
  match_score: number;
  match_reasons: string[] | null;
};

type AiDesignerMatchScoreRow = {
  id: string;
  request_id: string;
  designer_id: string;
  ai_brief_id: string | null;
  match_score: number;
  portfolio_fit_score: number;
  style_fit_score: number;
  vibe_fit_score: number;
  industry_context_fit_score: number;
  budget_fit_score: number;
  not_same_style_but_same_vibe: boolean;
  match_reasons: string[] | null;
  risk_flags: string[] | null;
  matched_portfolio_evidence: unknown;
  analysis_json: unknown;
  created_at: string;
};

type DesignerRow = {
  id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  specialties: string[] | null;
  styles: string[] | null;
  minimum_project_budget_vnd: number | null;
  rating: number;
  completed_jobs: number;
  response_time_hours: number;
  availability: string | null;
  verification_status: string | null;
};

type DesignerDnaRow = {
  designer_id: string;
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

type PortfolioRow = {
  id: string;
  designer_id: string;
  title: string;
  description: string | null;
  category: string;
  industry: string;
  image_url: string | null;
  ai_analysis_status: string | null;
  ai_style_tags: string[] | null;
  ai_industry_tags: string[] | null;
  ai_category_tags: string[] | null;
  ai_visual_summary: string | null;
  ai_confidence_score: number | null;
  created_at: string;
};

type JobRow = {
  id: string;
  request_id: string;
  designer_id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  created_at: string;
};

type PortfolioEvidence = {
  portfolioItemId: string | null;
  title: string | null;
  reason: string | null;
  visualRelevance: string | null;
  score: number | null;
};

export default async function CustomerRequestDetailPage({ params }: RouteProps) {
  const routeParams = await params;
  const requestId = routeParams.requestId ?? routeParams.requestID;

  if (!requestId) {
    notFound();
  }

  const authState = await requireRole(["customer"]);
  const profile = authState.profile;
  const customerProfile = authState.customerProfile;

  if (!profile || !customerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const requestResult = await adminSupabase
    .from("design_requests")
    .select(
      `
      id,
      customer_id,
      title,
      business_name,
      industry,
      category,
      description,
      target_audience,
      budget_min_vnd,
      budget_max_vnd,
      deadline,
      status,
      brief_review_status,
      brief_confirmed_at,
      created_at
    `,
    )
    .eq("id", requestId)
    .eq("customer_id", customerProfile.id)
    .maybeSingle();

  if (requestResult.error) {
    throw new Error(requestResult.error.message);
  }

  if (!requestResult.data) {
    notFound();
  }

  const request = requestResult.data as RequestRow;

  const [
    briefResult,
    matchesResult,
    aiScoresResult,
    jobsResult,
    selectedConceptResult,
  ] = await Promise.all([
    adminSupabase
      .from("ai_briefs")
      .select(
        `
        id,
        request_id,
        design_request_id,
        objective,
        visual_direction,
        key_message,
        brief_completeness_score,
        brief_json,
        customer_edited_brief_json,
        final_brief_json,
        project_title,
        design_objective,
        is_user_confirmed,
        status,
        confirmed_at,
        created_at
      `,
      )
      .or(`request_id.eq.${request.id},design_request_id.eq.${request.id}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    adminSupabase
      .from("designer_matches")
      .select(
        `
        id,
        request_id,
        designer_id,
        match_score,
        match_reasons
      `,
      )
      .eq("request_id", request.id)
      .order("match_score", { ascending: false }),

    adminSupabase
      .from("ai_designer_match_scores")
      .select(
        `
        id,
        request_id,
        designer_id,
        ai_brief_id,
        match_score,
        portfolio_fit_score,
        style_fit_score,
        vibe_fit_score,
        industry_context_fit_score,
        budget_fit_score,
        not_same_style_but_same_vibe,
        match_reasons,
        risk_flags,
        matched_portfolio_evidence,
        analysis_json,
        created_at
      `,
      )
      .eq("request_id", request.id)
      .order("match_score", { ascending: false }),

    adminSupabase
      .from("jobs")
      .select(
        `
        id,
        request_id,
        designer_id,
        title,
        status,
        agreed_price_vnd,
        created_at
      `,
      )
      .eq("request_id", request.id),

    adminSupabase
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
        created_at
      `,
      )
      .eq("design_request_id", request.id)
      .eq("is_selected", true)
      .limit(1)
      .maybeSingle(),
  ]);

  const brief = briefResult.data as AiBriefRow | null;
  const matches = (matchesResult.data ?? []) as unknown as MatchRow[];
  const aiScores = (aiScoresResult.data ??
    []) as unknown as AiDesignerMatchScoreRow[];
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];
  const selectedConcept = selectedConceptResult.data as SelectedConceptRow | null;

  const conceptPreviewResult: any = selectedConcept
    ? await adminSupabase
        .from("ai_concept_previews")
        .select(
          `
          id,
          design_request_id,
          concept_direction_id,
          image_public_url,
          image_storage_path,
          image_mime_type,
          provider,
          model,
          prompt,
          preview_status,
          created_at
        `,
        )
        .eq("design_request_id", request.id)
        .eq("concept_direction_id", selectedConcept.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null, error: null };

  const selectedPreview = conceptPreviewResult.data as ConceptPreviewRow | null;

  const designerIds = Array.from(
    new Set([
      ...matches.map((match) => match.designer_id),
      ...aiScores.map((score) => score.designer_id),
    ]),
  );

  const [designersResult, portfolioResult, dnaResult] =
    designerIds.length > 0
      ? await Promise.all([
          adminSupabase
            .from("designer_profiles")
            .select(
              `
              id,
              display_name,
              headline,
              bio,
              specialties,
              styles,
              minimum_project_budget_vnd,
              rating,
              completed_jobs,
              response_time_hours,
              availability,
              verification_status
            `,
            )
            .in("id", designerIds),

          adminSupabase
            .from("portfolio_items")
            .select(
              `
              id,
              designer_id,
              title,
              description,
              category,
              industry,
              image_url,
              ai_analysis_status,
              ai_style_tags,
              ai_industry_tags,
              ai_category_tags,
              ai_visual_summary,
              ai_confidence_score,
              created_at
            `,
            )
            .in("designer_id", designerIds)
            .order("created_at", { ascending: false }),

          adminSupabase
            .from("designer_style_dna")
            .select(
              `
              designer_id,
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
            .in("designer_id", designerIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  const designers = (designersResult.data ?? []) as unknown as DesignerRow[];
  const portfolioItems = (portfolioResult.data ??
    []) as unknown as PortfolioRow[];
  const designerDnas = (dnaResult.data ?? []) as unknown as DesignerDnaRow[];

  const selectedJob = jobs[0];
  const topMatchScore =
    aiScores.length > 0
      ? Math.max(...aiScores.map((score) => Number(score.match_score ?? 0)))
      : matches.length > 0
        ? Math.max(...matches.map((match) => Number(match.match_score ?? 0)))
        : 0;

  const requestStatus = getRequestStatusView(request.status);
  const isBriefConfirmed =
    Boolean(brief?.is_user_confirmed) ||
    request.brief_review_status === "confirmed" ||
    brief?.status === "confirmed";

  const briefDisplay = brief ? getBriefDisplay(brief) : null;
  const briefReviewHref = `/customer/requests/${request.id}/brief-review`;

  return (
    <DashboardShell
      role="customer"
      title="Chi tiết request"
      description="Xem brief đã chốt, concept direction, visual preview, designer match và tạo job từ request này."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          briefResult.error?.message,
          matchesResult.error?.message,
          aiScoresResult.error?.message,
          jobsResult.error?.message,
          selectedConceptResult.error?.message,
          conceptPreviewResult.error?.message,
          designersResult.error?.message,
          portfolioResult.error?.message,
          dnaResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Request status"
          value={requestStatus.label}
          description="Trạng thái xử lý hiện tại"
          icon={<FileText className="size-5" />}
          tone={requestStatus.metricTone}
        />

        <MetricCard
          label="Brief"
          value={isBriefConfirmed ? "Đã chốt" : brief ? "Đang chỉnh" : "Chưa có"}
          description="Trạng thái brief khách hàng"
          icon={<PencilLine className="size-5" />}
          tone={isBriefConfirmed ? "success" : brief ? "warning" : "normal"}
        />

        <MetricCard
          label="Concept"
          value={selectedConcept ? "Đã chọn" : "Chưa chọn"}
          description={
            selectedPreview
              ? "Đã có visual preview"
              : "Creative direction của request"
          }
          icon={<Lightbulb className="size-5" />}
          tone={selectedConcept ? "success" : "warning"}
        />

        <MetricCard
          label="Top score"
          value={`${topMatchScore}`}
          description="Điểm AI match cao nhất"
          icon={<Award className="size-5" />}
          tone={topMatchScore >= 80 ? "success" : "warning"}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <Button
            asChild
            variant="outline"
            className="mb-5 rounded-full border-blue-200 bg-white font-extrabold"
          >
            <Link href="/customer/requests">
              <ArrowLeft className="mr-2 size-4" />
              Quay lại requests
            </Link>
          </Button>

          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr] xl:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusPill tone={requestStatus.tone}>
                  {requestStatus.label}
                </StatusPill>

                {isBriefConfirmed ? (
                  <StatusPill tone="success">Brief đã chốt</StatusPill>
                ) : brief ? (
                  <StatusPill tone="warning">Brief chưa chốt</StatusPill>
                ) : (
                  <StatusPill tone="neutral">Chưa có brief</StatusPill>
                )}

                {selectedConcept ? (
                  <StatusPill tone="info">Có concept direction</StatusPill>
                ) : (
                  <StatusPill tone="warning">Chưa chọn concept</StatusPill>
                )}

                {selectedPreview ? (
                  <StatusPill tone="success">Có visual preview</StatusPill>
                ) : null}

                <StatusPill tone="neutral">
                  {getSafeCategoryLabel(request.category)}
                </StatusPill>

                <StatusPill tone="info">
                  {getSafeIndustryLabel(request.industry)}
                </StatusPill>

                {selectedJob ? (
                  <StatusPill tone="success">Đã tạo job</StatusPill>
                ) : (
                  <StatusPill tone="warning">Chưa chọn designer</StatusPill>
                )}
              </div>

              <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.065em] text-[#061a3a]">
                {request.title}
              </h1>

              <p className="mt-2 text-base font-bold text-blue-700">
                {request.business_name}
              </p>

              <p className="mt-4 max-w-4xl text-sm font-medium leading-7 text-slate-600">
                {request.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <GenerateBriefButton requestId={request.id} />

                {brief ? (
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-blue-200 bg-white px-5 font-extrabold"
                  >
                    <Link href={briefReviewHref}>
                      <PencilLine className="mr-2 size-4" />
                      {isBriefConfirmed
                        ? "Xem brief / concept"
                        : "Tiếp tục chỉnh brief"}
                    </Link>
                  </Button>
                ) : null}

                {isBriefConfirmed ? (
                  <GenerateMatchesButton requestId={request.id} />
                ) : (
                  <Button
                    disabled
                    className="rounded-full bg-slate-300 px-5 font-extrabold text-slate-600"
                  >
                    <Sparkles className="mr-2 size-4" />
                    Chốt brief để match
                  </Button>
                )}

                {selectedJob ? <OpenJobButton jobId={selectedJob.id} /> : null}
              </div>

              {!isBriefConfirmed && brief ? (
                <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-semibold leading-7 text-amber-900">
                    Bạn cần kiểm tra và chốt brief trước khi hệ thống tìm
                    designer phù hợp. Việc này đảm bảo designer được match theo
                    brief cuối cùng do bạn xác nhận, không phải brief AI ban đầu.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <InfoBox
                icon={<Store className="size-4" />}
                label="Industry"
                value={getSafeIndustryLabel(request.industry)}
              />

              <InfoBox
                icon={<Palette className="size-4" />}
                label="Category"
                value={getSafeCategoryLabel(request.category)}
              />

              <InfoBox
                icon={<Target className="size-4" />}
                label="Target audience"
                value={request.target_audience ?? "Chưa có"}
              />

              <InfoBox
                icon={<CalendarDays className="size-4" />}
                label="Deadline"
                value={
                  request.deadline ? formatDateVi(request.deadline) : "Chưa có"
                }
              />

              <InfoBox
                icon={<CircleDollarSign className="size-4" />}
                label="Budget min"
                value={formatCurrencyVnd(request.budget_min_vnd)}
              />

              <InfoBox
                icon={<CircleDollarSign className="size-4" />}
                label="Budget max"
                value={formatCurrencyVnd(request.budget_max_vnd)}
              />
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-5">
        <CreativeFlowPanel
          hasBrief={Boolean(brief)}
          isBriefConfirmed={isBriefConfirmed}
          selectedConcept={selectedConcept}
          selectedPreview={selectedPreview}
          matchCount={matches.length}
          hasJob={Boolean(selectedJob)}
          briefReviewHref={briefReviewHref}
        />
      </section>

      <section className="mt-5">
        <CreativeDirectionPanel
          concept={selectedConcept}
          preview={selectedPreview}
          briefReviewHref={briefReviewHref}
          isBriefConfirmed={isBriefConfirmed}
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
        <SurfaceCard className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            Customer brief
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Brief dùng để match designer
          </h2>

          {brief && briefDisplay ? (
            <div className="mt-5 grid gap-4">
              <BriefBlock label="Objective" value={briefDisplay.objective} />

              <BriefBlock
                label="Visual direction"
                value={briefDisplay.visualDirection}
              />

              {briefDisplay.keyMessage ? (
                <BriefBlock
                  label="Key message"
                  value={briefDisplay.keyMessage}
                />
              ) : null}

              {briefDisplay.deliverables.length > 0 ? (
                <BriefListBlock
                  label="Deliverables"
                  items={briefDisplay.deliverables}
                />
              ) : null}

              {briefDisplay.contentRequirements.length > 0 ? (
                <BriefListBlock
                  label="Content requirements"
                  items={briefDisplay.contentRequirements}
                />
              ) : null}

              {briefDisplay.technicalRequirements.length > 0 ? (
                <BriefListBlock
                  label="Technical requirements"
                  items={briefDisplay.technicalRequirements}
                />
              ) : null}

              <div
                className={`rounded-[1.1rem] border p-4 ${
                  isBriefConfirmed
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div
                  className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] ${
                    isBriefConfirmed ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  <CheckCircle2 className="size-4" />
                  Brief status
                </div>

                <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#061a3a]">
                  {isBriefConfirmed ? "Đã chốt" : "Chưa chốt"}
                </p>

                <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  {isBriefConfirmed &&
                  (brief.confirmed_at || request.brief_confirmed_at)
                    ? `Confirmed ${formatDateVi(
                        brief.confirmed_at ??
                          request.brief_confirmed_at ??
                          "",
                      )}`
                    : `Generated ${formatDateVi(brief.created_at)}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-medium leading-7 text-amber-950">
                Request này chưa có AI brief. Hãy bấm “Tạo lại AI brief” để hệ
                thống chuẩn hóa thông tin, sau đó vào trang Review Brief để chốt
                trước khi matching designer.
              </p>
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                AI designer matches
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Designer được đề xuất
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Hệ thống đánh giá designer dựa trên brief đã chốt, concept đã
                chọn, visual preview, portfolio, Style DNA, ngành hàng, ngân
                sách và mức độ cùng gu thị giác.
              </p>
            </div>

            <StatusPill tone="info">{`${matches.length} matches`}</StatusPill>
          </div>

          {!isBriefConfirmed ? (
            <EmptyState
              title="Chưa thể tạo designer match."
              description="Bạn cần chốt brief trước. Sau khi brief được xác nhận, hệ thống mới tìm designer dựa trên nội dung cuối cùng."
            />
          ) : matches.length === 0 ? (
            <EmptyState
              title="Chưa có designer match."
              description="Hãy bấm tạo matching để hệ thống đề xuất designer đã được admin duyệt."
            />
          ) : (
            <div className="mt-6 grid gap-5">
              {matches.map((match) => {
                const designer = designers.find(
                  (item) => item.id === match.designer_id,
                );

                const designerPortfolio = portfolioItems.filter(
                  (item) => item.designer_id === match.designer_id,
                );

                const job = jobs.find(
                  (item) => item.designer_id === match.designer_id,
                );

                const aiScore = aiScores.find(
                  (item) => item.designer_id === match.designer_id,
                );

                const dna = designerDnas.find(
                  (item) => item.designer_id === match.designer_id,
                );

                return (
                  <DesignerMatchCard
                    key={match.id}
                    requestId={request.id}
                    match={match}
                    aiScore={aiScore}
                    designer={designer}
                    designerDna={dna}
                    portfolioItems={designerPortfolio}
                    job={job}
                    hasAnyJob={jobs.length > 0}
                  />
                );
              })}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function CreativeFlowPanel({
  hasBrief,
  isBriefConfirmed,
  selectedConcept,
  selectedPreview,
  matchCount,
  hasJob,
  briefReviewHref,
}: {
  hasBrief: boolean;
  isBriefConfirmed: boolean;
  selectedConcept: SelectedConceptRow | null;
  selectedPreview: ConceptPreviewRow | null;
  matchCount: number;
  hasJob: boolean;
  briefReviewHref: string;
}) {
  const steps = [
    {
      label: "Request",
      title: "Khách gửi nhu cầu",
      done: true,
      description: "Thông tin ban đầu đã được ghi nhận.",
      icon: <FileText className="size-5" />,
    },
    {
      label: "Brief",
      title: isBriefConfirmed ? "Brief đã chốt" : "Brief chưa chốt",
      done: isBriefConfirmed,
      description: hasBrief
        ? "AI đã chuẩn hóa brief, cần customer xác nhận."
        : "Cần tạo AI brief trước.",
      icon: <PencilLine className="size-5" />,
    },
    {
      label: "Concept",
      title: selectedConcept ? "Đã chọn concept" : "Chưa chọn concept",
      done: Boolean(selectedConcept),
      description: selectedConcept
        ? selectedConcept.concept_name ?? "Concept direction đã được chọn."
        : "Nên chọn concept trước khi match designer.",
      icon: <Lightbulb className="size-5" />,
    },
    {
      label: "Preview",
      title: selectedPreview ? "Đã có visual preview" : "Chưa có preview",
      done: Boolean(selectedPreview),
      description: selectedPreview
        ? "Ảnh preview giúp hai bên hiểu cùng một direction."
        : "Tạo preview để matching và làm việc rõ hơn.",
      icon: <ImageIcon className="size-5" />,
    },
    {
      label: "Match",
      title: matchCount > 0 ? `${matchCount} designer matches` : "Chưa match",
      done: matchCount > 0,
      description: "AI đề xuất designer dựa trên brief, concept, preview và DNA.",
      icon: <Sparkles className="size-5" />,
    },
    {
      label: "Job",
      title: hasJob ? "Đã tạo job" : "Chưa tạo job",
      done: hasJob,
      description: "Customer chọn designer để bắt đầu làm việc.",
      icon: <BriefcaseBusiness className="size-5" />,
    },
  ];

  return (
    <SurfaceCard className="p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            Creative workflow
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Luồng xử lý request từ brief đến job
          </h2>

          <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
            Trang này hiển thị toàn bộ quá trình: customer tạo request, AI xây
            brief, chọn concept direction, tạo visual preview, match designer và
            chuyển thành job.
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href={briefReviewHref}>
            Mở brief / concept
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {steps.map((step) => (
          <div
            key={step.label}
            className={`rounded-[1.15rem] border p-4 ${
              step.done
                ? "border-emerald-200 bg-emerald-50"
                : "border-blue-100 bg-blue-50/65"
            }`}
          >
            <div
              className={`grid size-11 place-items-center rounded-2xl ${
                step.done
                  ? "bg-white text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-white text-blue-700 ring-1 ring-blue-100"
              }`}
            >
              {step.icon}
            </div>

            <p
              className={`mt-4 text-xs font-black uppercase tracking-[0.16em] ${
                step.done ? "text-emerald-700" : "text-blue-600"
              }`}
            >
              {step.label}
            </p>

            <p className="mt-2 text-sm font-extrabold leading-6 text-[#061a3a]">
              {step.title}
            </p>

            <p className="mt-2 text-xs font-medium leading-6 text-slate-600">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

function CreativeDirectionPanel({
  concept,
  preview,
  briefReviewHref,
  isBriefConfirmed,
}: {
  concept: SelectedConceptRow | null;
  preview: ConceptPreviewRow | null;
  briefReviewHref: string;
  isBriefConfirmed: boolean;
}) {
  if (!concept) {
    return (
      <SurfaceCard className="p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_320px] xl:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Selected concept direction
            </p>

            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
              Chưa có concept direction được chọn
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
              Concept direction giúp customer và designer thống nhất trước về
              mood, màu sắc, bố cục, typography và hướng hình ảnh. Đây là phần
              làm cho DesignMatch AI khác với việc chỉ tạo brief văn bản.
            </p>

            <div className="mt-5">
              <Button
                asChild={isBriefConfirmed}
                disabled={!isBriefConfirmed}
                className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61] disabled:bg-slate-300 disabled:text-slate-600"
              >
                {isBriefConfirmed ? (
                  <Link href={briefReviewHref}>
                    Tạo / chọn concept
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                ) : (
                  <span>Chốt brief để tạo concept</span>
                )}
              </Button>
            </div>
          </div>

          <div className="grid min-h-56 place-items-center rounded-[1.35rem] border border-dashed border-blue-200 bg-blue-50 p-6 text-center">
            <div>
              <Lightbulb className="mx-auto size-9 text-blue-700" />
              <p className="mt-3 text-sm font-extrabold text-[#061a3a]">
                Concept direction pending
              </p>
              <p className="mt-2 text-xs font-medium leading-6 text-slate-500">
                Sau khi chọn concept, trang này sẽ hiển thị direction và ảnh
                preview.
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>
    );
  }

  const colors = normalizeColorPalette(concept.color_palette);

  return (
    <SurfaceCard className="p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="info">Selected concept</StatusPill>
            {preview ? (
              <StatusPill tone="success">Visual preview ready</StatusPill>
            ) : (
              <StatusPill tone="warning">Chưa có preview</StatusPill>
            )}

            <ScorePill
              score={Number(concept.suitability_score ?? 0)}
              label="Concept fit"
            />
          </div>

          <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            Creative direction
          </p>

          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
            {concept.concept_name ?? "Concept đã chọn"}
          </h2>

          <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-slate-600">
            {concept.concept_summary ??
              concept.customer_explanation ??
              "Concept này là direction chính được dùng khi matching designer."}
          </p>

          {concept.strategic_role ? (
            <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-blue-50/65 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Vai trò chiến lược
              </p>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">
                {concept.strategic_role}
              </p>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <InfoBox
              icon={<Palette className="size-4" />}
              label="Mood"
              value={(concept.mood_tags ?? []).slice(0, 4).join(", ") || "Chưa rõ"}
            />

            <InfoBox
              icon={<LayoutTemplate className="size-4" />}
              label="Style"
              value={(concept.style_tags ?? []).slice(0, 4).join(", ") || "Chưa rõ"}
            />

            <InfoBox
              icon={<ImageIcon className="size-4" />}
              label="Image"
              value={concept.image_direction ?? "Chưa rõ"}
            />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {concept.typography_direction ? (
              <BriefBlock
                label="Typography direction"
                value={concept.typography_direction}
              />
            ) : null}

            {concept.layout_direction ? (
              <BriefBlock
                label="Layout direction"
                value={concept.layout_direction}
              />
            ) : null}

            {concept.content_direction ? (
              <BriefBlock
                label="Content direction"
                value={concept.content_direction}
              />
            ) : null}

            {concept.designer_guidance ? (
              <BriefBlock
                label="Guidance cho designer"
                value={concept.designer_guidance}
              />
            ) : null}
          </div>

          {colors.length > 0 ? (
            <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-white p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
                Color palette
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {colors.slice(0, 8).map((color) => (
                  <div
                    key={`${color.name}-${color.hex_guess ?? color.role}`}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-slate-700"
                  >
                    <span
                      className="size-4 rounded-full border border-white shadow-sm"
                      style={{
                        backgroundColor: color.hex_guess ?? "#E5E7EB",
                      }}
                    />
                    {color.name}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {(concept.risk_notes ?? []).length > 0 ? (
            <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
                Rủi ro của concept
              </p>

              <ul className="mt-3 grid gap-2">
                {(concept.risk_notes ?? []).slice(0, 5).map((risk) => (
                  <li
                    key={risk}
                    className="rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-amber-900 ring-1 ring-amber-100"
                  >
                    • {risk}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div>
          {preview?.image_public_url ? (
            <div className="overflow-hidden rounded-[1.35rem] border border-blue-100 bg-blue-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.image_public_url}
                alt={`Visual concept preview for ${
                  concept.concept_name ?? "selected concept"
                }`}
                className="aspect-square w-full object-cover"
              />

              <div className="border-t border-blue-100 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                  Visual preview
                </p>
                <p className="mt-2 text-xs font-medium leading-6 text-slate-500">
                  {preview.provider || "AI"} · {preview.model || "image model"}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center rounded-[1.35rem] border border-dashed border-blue-200 bg-blue-50 p-6 text-center">
              <div>
                <ImageIcon className="mx-auto size-10 text-blue-700" />
                <p className="mt-3 text-sm font-extrabold text-[#061a3a]">
                  Chưa có visual preview
                </p>
                <p className="mt-2 text-xs font-medium leading-6 text-slate-500">
                  Tạo ảnh preview trong trang Review Brief để designer hiểu
                  direction rõ hơn.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-5 rounded-full border-blue-200 bg-white font-extrabold"
                >
                  <Link href={briefReviewHref}>
                    Tạo preview
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}

function DesignerMatchCard({
  requestId,
  match,
  aiScore,
  designer,
  designerDna,
  portfolioItems,
  job,
  hasAnyJob,
}: {
  requestId: string;
  match: MatchRow;
  aiScore?: AiDesignerMatchScoreRow;
  designer?: DesignerRow;
  designerDna?: DesignerDnaRow;
  portfolioItems: PortfolioRow[];
  job?: JobRow;
  hasAnyJob: boolean;
}) {
  if (!designer) {
    return (
      <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold leading-7 text-amber-800">
          Không tìm thấy designer cho match này.
        </p>
      </div>
    );
  }

  const matchScore = Number(aiScore?.match_score ?? match.match_score ?? 0);
  const matchReasons =
    aiScore?.match_reasons && aiScore.match_reasons.length > 0
      ? aiScore.match_reasons
      : match.match_reasons ?? [];
  const riskFlags = aiScore?.risk_flags ?? [];
  const specialties = designer.specialties ?? [];
  const styles = designer.styles ?? [];
  const evidence = normalizePortfolioEvidence(
    aiScore?.matched_portfolio_evidence,
  );

  return (
    <div className="rounded-[1.35rem] border border-blue-100 bg-blue-50/65 p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <ScorePill score={matchScore} />

            <RatingPill rating={designer.rating ?? 0} />

            <StatusPill tone={getAvailabilityTone(designer.availability)}>
              {getAvailabilityLabel(designer.availability)}
            </StatusPill>

            {aiScore?.not_same_style_but_same_vibe ? (
              <StatusPill tone="info">Cùng vibe thị giác</StatusPill>
            ) : (
              <StatusPill tone="success">Style fit</StatusPill>
            )}

            {job ? (
              <StatusPill tone="success">Đã chọn</StatusPill>
            ) : hasAnyJob ? (
              <StatusPill tone="neutral">Không được chọn</StatusPill>
            ) : (
              <StatusPill tone="info">Có thể chọn</StatusPill>
            )}
          </div>

          <div className="mt-5 flex items-start gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-3xl bg-[#061a3a] text-white shadow-[0_18px_45px_rgba(6,26,58,0.22)]">
              <UserRound className="size-6" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                {designer.display_name}
              </h3>

              <p className="mt-2 text-sm font-bold leading-6 text-blue-700">
                {designer.headline ?? "Designer"}
              </p>

              <p className="mt-3 line-clamp-3 text-sm font-medium leading-7 text-slate-600">
                {designer.bio ||
                  "Designer này chưa cập nhật bio, nhưng vẫn có dữ liệu matching từ portfolio và tín hiệu hệ thống."}
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {job ? (
            <OpenJobButton jobId={job.id} />
          ) : hasAnyJob ? (
            <Button
              disabled
              className="rounded-full bg-slate-300 px-5 font-extrabold text-slate-600"
            >
              Request đã có job
            </Button>
          ) : (
            <CreateJobFromMatchButton
              requestId={requestId}
              matchId={match.id}
              designerName={designer.display_name}
            />
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoBox
          icon={<Star className="size-4" />}
          label="Rating"
          value={`${designer.rating ?? 0}/5`}
        />

        <InfoBox
          icon={<BriefcaseBusiness className="size-4" />}
          label="Completed"
          value={`${designer.completed_jobs ?? 0} jobs`}
        />

        <InfoBox
          icon={<Clock3 className="size-4" />}
          label="Response"
          value={`${designer.response_time_hours ?? 24} giờ`}
        />

        <InfoBox
          icon={<WalletCards className="size-4" />}
          label="Min budget"
          value={formatCurrencyVnd(
            Number(designer.minimum_project_budget_vnd ?? 0),
          )}
        />
      </div>

      {aiScore ? <ScoreBreakdownPanel aiScore={aiScore} /> : null}

      <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
          <Sparkles className="size-4" />
          Lý do hệ thống đề xuất
        </div>

        {matchReasons.length > 0 ? (
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {matchReasons.slice(0, 8).map((reason) => (
              <li
                key={reason}
                className="flex gap-2 rounded-2xl border border-blue-100 bg-blue-50/65 p-3 text-sm font-medium leading-6 text-slate-700"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
            Match này được tạo trước khi hệ thống lưu lý do. Hãy tạo matching lại
            để cập nhật dữ liệu AI.
          </p>
        )}
      </div>

      {riskFlags.length > 0 ? (
        <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
            Điểm cần lưu ý
          </p>

          <ul className="mt-3 grid gap-2">
            {riskFlags.map((flag) => (
              <li
                key={flag}
                className="rounded-2xl border border-amber-200 bg-white/75 p-3 text-sm font-semibold leading-6 text-amber-900"
              >
                {flag}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <MiniTagPanel
          title="Designer specialties"
          icon={<Sparkles className="size-4" />}
          items={specialties}
          emptyText="Designer chưa khai báo specialties."
        />

        <MiniTagPanel
          title="Designer visual styles"
          icon={<Palette className="size-4" />}
          items={styles}
          emptyText="Designer chưa khai báo visual styles."
        />
      </div>

      {designerDna ? (
        <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
                AI Style DNA
              </p>

              <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                Dữ liệu tổng hợp từ các portfolio đã được AI phân tích của
                designer.
              </p>
            </div>

            <StatusPill tone="info">
              {`${designerDna.analyzed_portfolio_count ?? 0} portfolio analyzed`}
            </StatusPill>
          </div>

          {designerDna.dna_summary ? (
            <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/65 p-4 text-sm font-medium leading-7 text-slate-700">
              {designerDna.dna_summary}
            </p>
          ) : null}

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <MiniTagPanel
              title="Mood nổi bật"
              icon={<Sparkles className="size-4" />}
              items={designerDna.common_moods ?? []}
              emptyText="Chưa có mood nổi bật."
            />

            <MiniTagPanel
              title="Điểm mạnh thị giác"
              icon={<Award className="size-4" />}
              items={designerDna.visual_strengths ?? []}
              emptyText="Chưa có điểm mạnh thị giác."
            />

            <MiniTagPanel
              title="Màu sắc thường dùng"
              icon={<Palette className="size-4" />}
              items={designerDna.color_preferences ?? []}
              emptyText="Chưa có dữ liệu màu sắc."
            />

            <MiniTagPanel
              title="Typography preference"
              icon={<FileText className="size-4" />}
              items={designerDna.typography_preferences ?? []}
              emptyText="Chưa có dữ liệu typography."
            />
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
              Portfolio evidence
            </p>

            <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
              Portfolio được dùng làm tín hiệu để đánh giá độ phù hợp với brief.
            </p>
          </div>

          <StatusPill tone="info">{`${portfolioItems.length} items`}</StatusPill>
        </div>

        {evidence.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {evidence.slice(0, 3).map((item, index) => (
              <PortfolioEvidenceCard
                key={`${item.portfolioItemId ?? item.title ?? index}-${index}`}
                evidence={item}
                portfolioItem={findEvidencePortfolioItem(item, portfolioItems)}
              />
            ))}
          </div>
        ) : portfolioItems.length === 0 ? (
          <div className="mt-4 rounded-[1.1rem] border border-blue-100 bg-white p-5">
            <p className="text-sm font-medium leading-7 text-slate-500">
              Designer này chưa có portfolio item.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {portfolioItems.slice(0, 3).map((item) => (
              <PortfolioPreviewCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBreakdownPanel({
  aiScore,
}: {
  aiScore: AiDesignerMatchScoreRow;
}) {
  const totalScore = clampScore(aiScore.match_score);

  const scoreItems = [
    {
      label: "Portfolio",
      score: aiScore.portfolio_fit_score,
    },
    {
      label: "Style",
      score: aiScore.style_fit_score,
    },
    {
      label: "Vibe",
      score: aiScore.vibe_fit_score,
    },
    {
      label: "Industry",
      score: aiScore.industry_context_fit_score,
    },
    {
      label: "Budget",
      score: aiScore.budget_fit_score,
    },
  ];

  const strongestSignal = [...scoreItems].sort(
    (a, b) => clampScore(b.score) - clampScore(a.score),
  )[0];

  const weakestSignal = [...scoreItems].sort(
    (a, b) => clampScore(a.score) - clampScore(b.score),
  )[0];

  return (
    <div className="mt-5 overflow-hidden rounded-[1.35rem] border border-blue-100 bg-white">
      <div className="border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
              <Award className="size-4" />
              AI match breakdown
            </div>

            <h4 className="mt-3 text-2xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
              Vì sao hệ thống đề xuất designer này?
            </h4>
          </div>

          <div className="rounded-[1.25rem] border border-blue-100 bg-white px-6 py-4 text-center shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
              Overall match
            </p>

            <p className="mt-2 text-5xl font-black tracking-[-0.08em] text-[#061a3a]">
              {totalScore}
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              / 100
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {scoreItems.map((item, index) => (
            <ConnectedScoreItem
              key={item.label}
              label={item.label}
              score={item.score}
              isLast={index === scoreItems.length - 1}
            />
          ))}
        </div>

        <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-blue-50/70 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
              <Lightbulb className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="text-center text-sm font-black uppercase tracking-[0.16em] text-blue-700 lg:text-left">
                Kết luận từ các tín hiệu trên
              </p>

              <p className="mt-2 text-center text-sm font-semibold leading-7 text-slate-700 lg:text-left">
                {buildMatchInsightSentence({
                  aiScore,
                  strongestLabel: strongestSignal.label,
                  strongestScore: strongestSignal.score,
                  weakestLabel: weakestSignal.label,
                  weakestScore: weakestSignal.score,
                })}
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-white p-4 text-center">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                    Tín hiệu mạnh nhất
                  </p>

                  <p className="mt-2 text-sm font-extrabold text-[#061a3a]">
                    {strongestSignal.label} —{" "}
                    {clampScore(strongestSignal.score)}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-white p-4 text-center">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                    Cần cân nhắc
                  </p>

                  <p className="mt-2 text-sm font-extrabold text-[#061a3a]">
                    {weakestSignal.label} — {clampScore(weakestSignal.score)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {aiScore.not_same_style_but_same_vibe ? (
          <div className="mt-4 rounded-[1.2rem] border border-indigo-100 bg-indigo-50/70 p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 size-5 shrink-0 text-indigo-700" />

              <div>
                <p className="text-center text-sm font-black uppercase tracking-[0.16em] text-indigo-700 md:text-left">
                  Match theo vibe, không chỉ theo style
                </p>

                <p className="mt-2 text-center text-sm font-semibold leading-7 text-slate-700 md:text-left">
                  Designer này có thể không trùng style 100%, nhưng có cùng hơi
                  hướng thị giác với brief. Đây là dạng match tốt khi portfolio
                  có mood, bố cục, màu sắc hoặc cách xử lý hình ảnh tương đồng.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ConnectedScoreItem({
  label,
  score,
  isLast,
}: {
  label: string;
  score: number;
  isLast: boolean;
}) {
  const safeScore = clampScore(score);
  const view = getScoreView(safeScore);

  return (
    <div className="relative">
      {!isLast ? (
        <div className="absolute left-[calc(100%-0.2rem)] top-1/2 hidden h-px w-4 -translate-y-1/2 bg-blue-200 xl:block" />
      ) : null}

      <div
        className={`flex min-h-[140px] flex-col items-center justify-center rounded-[1.15rem] border p-4 text-center ${view.className}`}
      >
        <p className="text-sm font-black uppercase tracking-[0.16em]">
          {label}
        </p>

        <p className="mt-4 text-5xl font-black tracking-[-0.08em]">
          {safeScore}
        </p>
      </div>
    </div>
  );
}

function buildMatchInsightSentence({
  aiScore,
  strongestLabel,
  strongestScore,
  weakestLabel,
  weakestScore,
}: {
  aiScore: AiDesignerMatchScoreRow;
  strongestLabel: string;
  strongestScore: number;
  weakestLabel: string;
  weakestScore: number;
}) {
  const strongest = `${strongestLabel} (${clampScore(strongestScore)})`;
  const weakest = `${weakestLabel} (${clampScore(weakestScore)})`;

  if (aiScore.not_same_style_but_same_vibe) {
    return `Hệ thống vẫn đề xuất designer này vì tín hiệu ${strongest} đang nổi bật, đặc biệt là mức độ cùng hơi hướng thị giác. Tuy nhiên, ${weakest} thấp hơn nên khách hàng nên xem portfolio evidence trước khi chọn.`;
  }

  if (clampScore(aiScore.match_score) >= 80) {
    return `Đây là match mạnh vì nhiều tín hiệu cùng hỗ trợ nhau. Tín hiệu nổi bật nhất là ${strongest}. Điểm cần cân nhắc tương đối là ${weakest}, nhưng chưa đủ để làm giảm độ phù hợp tổng thể.`;
  }

  if (clampScore(aiScore.match_score) >= 60) {
    return `Đây là match khá ổn. Hệ thống thấy tín hiệu ${strongest} tốt, nhưng ${weakest} còn yếu hơn nên nên xem kỹ portfolio trước khi tạo job.`;
  }

  return `Đây là match tham khảo. Tín hiệu tốt nhất hiện là ${strongest}, nhưng ${weakest} còn thấp nên chỉ nên chọn nếu bạn thấy portfolio thực tế phù hợp với gu của mình.`;
}

function PortfolioEvidenceCard({
  evidence,
  portfolioItem,
}: {
  evidence: PortfolioEvidence;
  portfolioItem?: PortfolioRow;
}) {
  return (
    <div className="grid gap-4 overflow-hidden rounded-[1.1rem] border border-blue-100 bg-white md:grid-cols-[180px_1fr]">
      <div className="grid aspect-[4/3] place-items-center bg-blue-50 md:aspect-auto">
        {portfolioItem?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portfolioItem.image_url}
            alt={portfolioItem.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="size-9 text-blue-700" />
        )}
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {portfolioItem?.category ? (
            <StatusPill tone="neutral">
              {getSafeCategoryLabel(portfolioItem.category)}
            </StatusPill>
          ) : null}

          {evidence.score !== null ? (
            <StatusPill tone="info">{`Evidence score ${evidence.score}`}</StatusPill>
          ) : null}
        </div>

        <h4 className="mt-3 text-base font-extrabold leading-6 text-[#061a3a]">
          {portfolioItem?.title ?? evidence.title ?? "Portfolio evidence"}
        </h4>

        {evidence.reason ? (
          <p className="mt-2 text-sm font-medium leading-7 text-slate-700">
            {evidence.reason}
          </p>
        ) : null}

        {evidence.visualRelevance ? (
          <p className="mt-2 text-sm font-medium leading-7 text-blue-700">
            {evidence.visualRelevance}
          </p>
        ) : null}

        {portfolioItem?.ai_visual_summary ? (
          <p className="mt-2 text-xs font-medium leading-6 text-slate-500">
            AI summary: {portfolioItem.ai_visual_summary}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PortfolioPreviewCard({ item }: { item: PortfolioRow }) {
  return (
    <div className="overflow-hidden rounded-[1.1rem] border border-blue-100 bg-white">
      <div className="grid aspect-[4/3] place-items-center bg-blue-50">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="size-9 text-blue-700" />
        )}
      </div>

      <div className="p-4">
        <StatusPill tone="neutral">{getSafeCategoryLabel(item.category)}</StatusPill>

        <h4 className="mt-3 text-sm font-extrabold leading-6 text-[#061a3a]">
          {item.title}
        </h4>

        {item.ai_visual_summary ? (
          <p className="mt-2 line-clamp-3 text-xs font-medium leading-6 text-slate-500">
            {item.ai_visual_summary}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MiniTagPanel({
  title,
  icon,
  items,
  emptyText,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  emptyText: string;
}) {
  const safeItems = items.filter(Boolean);

  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-white p-5">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {icon}
        {title}
      </div>

      {safeItems.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {safeItems.slice(0, 12).map((item) => (
            <StatusPill key={item} tone="neutral">
              {item}
            </StatusPill>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm font-medium leading-7 text-slate-500">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function BriefBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-blue-100 bg-blue-50/65 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm font-medium leading-7 text-slate-700">
        {value || "Chưa có"}
      </p>
    </div>
  );
}

function BriefListBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-[1.1rem] border border-blue-100 bg-blue-50/65 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {label}
      </p>

      <ul className="mt-3 grid gap-2">
        {items.slice(0, 8).map((item) => (
          <li
            key={item}
            className="flex gap-2 text-sm font-medium leading-6 text-slate-700"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ErrorPanel({ errors }: { errors: Array<string | undefined> }) {
  const realErrors = errors.filter((error): error is string => Boolean(error));

  if (realErrors.length === 0) return null;

  return (
    <SurfaceCard className="mb-5 border-red-200 bg-red-50 p-6">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">
        Data loading warning
      </p>

      <div className="mt-3 grid gap-2">
        {realErrors.map((error) => (
          <p key={error} className="text-sm font-semibold leading-7 text-red-600">
            {error}
          </p>
        ))}
      </div>
    </SurfaceCard>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
  tone = "normal",
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone?: "normal" | "dark" | "success" | "warning";
}) {
  const cardClass =
    tone === "dark"
      ? "border-[#061a3a] bg-[#061a3a] text-white shadow-[0_18px_50px_rgba(6,26,58,0.22)]"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-[#061a3a]"
        : tone === "warning"
          ? "border-amber-200 bg-amber-50 text-[#061a3a]"
          : "border-blue-100 bg-white text-[#061a3a]";

  const iconClass =
    tone === "dark"
      ? "bg-white/10 text-sky-200 ring-white/10"
      : tone === "success"
        ? "bg-white text-emerald-700 ring-emerald-200"
        : tone === "warning"
          ? "bg-white text-amber-700 ring-amber-200"
          : "bg-blue-50 text-blue-700 ring-blue-100";

  const labelClass = tone === "dark" ? "text-sky-200/75" : "text-blue-600";
  const descriptionClass = tone === "dark" ? "text-white/68" : "text-slate-500";

  return (
    <div className={`rounded-[1.35rem] border p-5 ${cardClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-xs font-black uppercase tracking-[0.18em] ${labelClass}`}
          >
            {label}
          </p>

          <p className="mt-3 text-3xl font-black tracking-[-0.06em]">
            {value}
          </p>
        </div>

        <div
          className={`grid size-11 shrink-0 place-items-center rounded-2xl ring-1 ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      <p className={`mt-3 text-sm font-medium leading-6 ${descriptionClass}`}>
        {description}
      </p>
    </div>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-white/75 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {icon}
        {label}
      </div>

      <p className="mt-2 break-words text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 grid place-items-center rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-8 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
        <Sparkles className="size-6" />
      </div>

      <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
        {title}
      </h3>

      <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function normalizeConceptDisplayScore(value: number) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  if (score > 0 && score <= 1) {
    return Math.max(0, Math.min(100, Math.round(score * 100)));
  }

  if (score > 1 && score <= 10) {
    return Math.max(0, Math.min(100, Math.round(score * 10)));
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function shouldNormalizeAsConceptScore(label: string) {
  const normalizedLabel = label.toLowerCase();

  return (
    normalizedLabel.includes("concept") ||
    normalizedLabel.includes("brief") ||
    normalizedLabel.includes("fit")
  );
}

function ScorePill({
  score,
  label = "AI match",
}: {
  score: number;
  label?: string;
}) {
  const displayScore = shouldNormalizeAsConceptScore(label)
    ? normalizeConceptDisplayScore(score)
    : clampScore(score);

  const view = getScoreView(displayScore);

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${view.className}`}
    >
      <Award className="size-3.5" />
      {`${label}: ${displayScore}/100`}
    </div>
  );
}

function RatingPill({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-amber-700">
      <Star className="size-3.5 fill-current" />
      {rating}/5
    </div>
  );
}

function getBriefDisplay(brief: AiBriefRow): BriefDisplay {
  const finalBriefJson = asRecord(brief.final_brief_json);
  const customerEditedBriefJson = asRecord(brief.customer_edited_brief_json);
  const originalBriefJson = asRecord(brief.brief_json);

  const source =
    Object.keys(finalBriefJson).length > 0
      ? finalBriefJson
      : Object.keys(customerEditedBriefJson).length > 0
        ? customerEditedBriefJson
        : originalBriefJson;

  const visualDirection = asRecord(source.visual_direction);

  return {
    objective: stringValue(
      source.design_objective ?? brief.design_objective ?? brief.objective,
    ),
    visualDirection: buildVisualDirectionText(visualDirection, brief),
    keyMessage: stringValue(source.key_message ?? brief.key_message) || null,
    deliverables: stringArray(source.deliverables),
    contentRequirements: stringArray(source.content_requirements),
    technicalRequirements: stringArray(source.technical_requirements),
  };
}

function buildVisualDirectionText(
  visualDirection: JsonRecord,
  brief: AiBriefRow,
) {
  const mood = stringArray(visualDirection.mood);
  const styleTags = stringArray(visualDirection.style_tags);
  const colorDirection = stringArray(visualDirection.color_direction);
  const typographyDirection = stringValue(
    visualDirection.typography_direction,
  );
  const layoutDirection = stringValue(visualDirection.layout_direction);
  const imageDirection = stringValue(visualDirection.image_direction);

  const lines = [
    mood.length > 0 ? `Mood: ${mood.join(", ")}` : "",
    styleTags.length > 0 ? `Style: ${styleTags.join(", ")}` : "",
    colorDirection.length > 0 ? `Màu sắc: ${colorDirection.join(", ")}` : "",
    typographyDirection ? `Typography: ${typographyDirection}` : "",
    layoutDirection ? `Bố cục: ${layoutDirection}` : "",
    imageDirection ? `Hình ảnh: ${imageDirection}` : "",
  ].filter(Boolean);

  if (lines.length > 0) {
    return lines.join("\n");
  }

  return brief.visual_direction ?? "";
}

function normalizePortfolioEvidence(value: unknown): PortfolioEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);

      return {
        portfolioItemId:
          stringValue(record.portfolio_item_id) ||
          stringValue(record.portfolioItemId) ||
          stringValue(record.portfolio_id) ||
          stringValue(record.portfolioId) ||
          stringValue(record.id) ||
          null,
        title:
          stringValue(record.title) ||
          stringValue(record.portfolio_title) ||
          null,
        reason:
          stringValue(record.reason) ||
          stringValue(record.fit_reason) ||
          stringValue(record.match_reason) ||
          null,
        visualRelevance:
          stringValue(record.visual_relevance) ||
          stringValue(record.visualRelevance) ||
          stringValue(record.relevance) ||
          null,
        score: numberOrNull(record.score ?? record.fit_score),
      };
    })
    .filter(
      (item) =>
        item.portfolioItemId ||
        item.title ||
        item.reason ||
        item.visualRelevance,
    );
}

function findEvidencePortfolioItem(
  evidence: PortfolioEvidence,
  portfolioItems: PortfolioRow[],
) {
  if (evidence.portfolioItemId) {
    const exact = portfolioItems.find(
      (item) => item.id === evidence.portfolioItemId,
    );

    if (exact) return exact;
  }

  if (evidence.title) {
    const title = evidence.title.toLowerCase();

    return portfolioItems.find((item) =>
      item.title.toLowerCase().includes(title),
    );
  }

  return undefined;
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

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
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

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function getScoreView(score: number) {
  const safeScore = clampScore(score);

  if (safeScore >= 80) {
    return {
      className: "border-emerald-200 bg-emerald-100 text-emerald-700",
    };
  }

  if (safeScore >= 60) {
    return {
      className: "border-blue-200 bg-blue-100 text-blue-700",
    };
  }

  if (safeScore >= 40) {
    return {
      className: "border-amber-200 bg-amber-100 text-amber-700",
    };
  }

  return {
    className: "border-slate-200 bg-slate-100 text-slate-600",
  };
}

function getRequestStatusView(status: string) {
  if (status === "completed") {
    return {
      label: "Hoàn thành",
      tone: "success" as const,
      metricTone: "success" as const,
    };
  }

  if (status === "matched") {
    return {
      label: "Đã matching",
      tone: "success" as const,
      metricTone: "success" as const,
    };
  }

  if (status === "brief_generated") {
    return {
      label: "Đã có brief",
      tone: "info" as const,
      metricTone: "normal" as const,
    };
  }

  if (status === "new") {
    return {
      label: "Mới tạo",
      tone: "neutral" as const,
      metricTone: "normal" as const,
    };
  }

  return {
    label: status,
    tone: "neutral" as const,
    metricTone: "normal" as const,
  };
}

function getAvailabilityLabel(status: string | null) {
  if (status === "available" || status === "open") return "Đang nhận job";
  if (status === "busy") return "Đang bận";
  if (status === "unavailable") return "Tạm nghỉ";
  return "Chưa rõ";
}

function getAvailabilityTone(status: string | null) {
  if (status === "available" || status === "open") return "success" as const;
  if (status === "busy") return "warning" as const;
  if (status === "unavailable") return "neutral" as const;
  return "neutral" as const;
}

function getSafeCategoryLabel(category: string) {
  try {
    return getCategoryLabel(category as Parameters<typeof getCategoryLabel>[0]);
  } catch {
    return category;
  }
}

function getSafeIndustryLabel(industry: string) {
  try {
    return getIndustryLabel(industry as Parameters<typeof getIndustryLabel>[0]);
  } catch {
    return industry;
  }
}