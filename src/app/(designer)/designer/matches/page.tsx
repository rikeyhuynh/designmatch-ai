import Link from "next/link";
import { redirect } from "next/navigation";
import {
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
  Palette,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel, getIndustryLabel } from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type JsonRecord = Record<string, any>;

type MatchRow = {
  id: string;
  request_id: string;
  designer_id: string;
  match_score: number;
  match_reasons: string[] | null;
};

type RequestRow = {
  id: string;
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
  created_at: string;
  brief_json: unknown;
  customer_edited_brief_json: unknown;
  final_brief_json: unknown;
  project_title: string | null;
  business_context: string | null;
  design_objective: string | null;
  target_audience: string | null;
  deliverables: string[] | null;
  content_requirements: string[] | null;
  technical_requirements: string[] | null;
  references_to_collect: string[] | null;
  designer_notes: string | null;
};

type JobRow = {
  id: string;
  request_id: string;
  designer_id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  due_at: string | null;
  created_at: string;
};

type DesignerRow = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number;
  completed_jobs: number;
  response_time_hours: number;
  availability: string | null;
};

type AiDesignerMatchScoreRow = {
  request_id: string;
  designer_id: string;
  portfolio_fit_score: number | null;
  style_fit_score: number | null;
  vibe_fit_score: number | null;
  industry_context_fit_score: number | null;
  budget_fit_score: number | null;
  not_same_style_but_same_vibe: boolean | null;
  risk_flags: string[] | null;
  matched_portfolio_evidence: unknown;
  analysis_json: unknown;
};

type SelectedConceptRow = {
  id: string;
  design_request_id: string;
  concept_name: string | null;
  concept_summary: string | null;
  strategic_role: string | null;
  mood_tags: string[] | null;
  style_tags: string[] | null;
  color_palette: unknown;
  typography_direction: string | null;
  layout_direction: string | null;
  image_direction: string | null;
  content_direction: string | null;
  designer_guidance: string | null;
  customer_explanation: string | null;
};

type ConceptPreviewRow = {
  id: string;
  design_request_id: string;
  concept_direction_id: string;
  image_public_url: string | null;
  provider: string | null;
  model: string | null;
  prompt: string | null;
  created_at: string | null;
};

type MatchEvidence = {
  portfolio_item_id: string;
  title: string;
  evidence: string;
  fit_reason: string;
};

type MatchContext = {
  portfolio_fit_score: number;
  style_fit_score: number;
  vibe_fit_score: number;
  industry_context_fit_score: number;
  budget_fit_score: number;
  not_same_style_but_same_vibe: boolean;
  risk_flags: string[];
  matched_portfolio_evidence: MatchEvidence[];
};

type BriefSummary = {
  objective: string;
  visualDirection: string;
  keyMessage: string;
  targetAudience: string;
  deliverables: string[];
  designerNotes: string;
  completenessScore: number;
  createdAt: string;
};

export default async function DesignerMatchesPage() {
  const authState = await requireRole(["designer"]);
  const profile = authState.profile;
  const designerProfile = authState.designerProfile;

  if (!profile || !designerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const [designerResult, matchesResult] = await Promise.all([
    adminSupabase
      .from("designer_profiles")
      .select(
        "id, display_name, headline, rating, completed_jobs, response_time_hours, availability",
      )
      .eq("id", designerProfile.id)
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
      .eq("designer_id", designerProfile.id)
      .order("match_score", { ascending: false }),
  ]);

  const designer = designerResult.data as DesignerRow | null;
  const matches = (matchesResult.data ?? []) as unknown as MatchRow[];

  const requestIds = Array.from(
    new Set(matches.map((match) => match.request_id)),
  );

  const requestsResult =
    requestIds.length > 0
      ? await adminSupabase
          .from("design_requests")
          .select(
            `
            id,
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
            created_at
          `,
          )
          .in("id", requestIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  const briefsResult =
    requestIds.length > 0
      ? await adminSupabase
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
            created_at,
            brief_json,
            customer_edited_brief_json,
            final_brief_json,
            project_title,
            business_context,
            design_objective,
            target_audience,
            deliverables,
            content_requirements,
            technical_requirements,
            references_to_collect,
            designer_notes
          `,
          )
          .or(
            `request_id.in.(${requestIds.join(
              ",",
            )}),design_request_id.in.(${requestIds.join(",")})`,
          )
      : { data: [], error: null };

  const jobsResult =
    requestIds.length > 0
      ? await adminSupabase
          .from("jobs")
          .select(
            `
            id,
            request_id,
            designer_id,
            title,
            status,
            agreed_price_vnd,
            due_at,
            created_at
          `,
          )
          .eq("designer_id", designerProfile.id)
          .in("request_id", requestIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  const aiMatchScoresResult =
    requestIds.length > 0
      ? await adminSupabase
          .from("ai_designer_match_scores")
          .select(
            `
            request_id,
            designer_id,
            portfolio_fit_score,
            style_fit_score,
            vibe_fit_score,
            industry_context_fit_score,
            budget_fit_score,
            not_same_style_but_same_vibe,
            risk_flags,
            matched_portfolio_evidence,
            analysis_json
          `,
          )
          .eq("designer_id", designerProfile.id)
          .in("request_id", requestIds)
      : { data: [], error: null };

  const selectedConceptsResult =
    requestIds.length > 0
      ? await adminSupabase
          .from("ai_concept_directions")
          .select(
            `
            id,
            design_request_id,
            concept_name,
            concept_summary,
            strategic_role,
            mood_tags,
            style_tags,
            color_palette,
            typography_direction,
            layout_direction,
            image_direction,
            content_direction,
            designer_guidance,
            customer_explanation
          `,
          )
          .in("design_request_id", requestIds)
          .eq("is_selected", true)
      : { data: [], error: null };

  const selectedConcepts =
    (selectedConceptsResult.data ?? []) as unknown as SelectedConceptRow[];

  const selectedConceptIds = selectedConcepts.map((concept) => concept.id);

  const conceptPreviewsResult =
    selectedConceptIds.length > 0
      ? await adminSupabase
          .from("ai_concept_previews")
          .select(
            `
            id,
            design_request_id,
            concept_direction_id,
            image_public_url,
            provider,
            model,
            prompt,
            created_at
          `,
          )
          .in("concept_direction_id", selectedConceptIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  const requests = (requestsResult.data ?? []) as unknown as RequestRow[];
  const briefs = (briefsResult.data ?? []) as unknown as AiBriefRow[];
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];
  const aiMatchScores =
    (aiMatchScoresResult.data ?? []) as unknown as AiDesignerMatchScoreRow[];
  const conceptPreviews =
    (conceptPreviewsResult.data ?? []) as unknown as ConceptPreviewRow[];

  const matchedRequests = requests.length;
  const convertedJobs = jobs.length;
  const waitingRequests = matchedRequests - convertedJobs;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const activeJobs = jobs.filter((job) => job.status === "active").length;

  const topMatchScore =
    matches.length > 0
      ? Math.max(...matches.map((match) => Number(match.match_score ?? 0)))
      : 0;

  const averageMatchScore =
    matches.length > 0
      ? Math.round(
          matches.reduce(
            (total, match) => total + Number(match.match_score ?? 0),
            0,
          ) / matches.length,
        )
      : 0;

  const designerName =
    designer?.display_name ?? designerProfile.display_name ?? "Designer";

  const designerHeadline =
    designer?.headline ?? designerProfile.headline ?? "Designer";

  const orderedRequests = requests
    .map((request) => {
      const match = matches.find((item) => item.request_id === request.id);
      const brief = briefs.find(
        (item) =>
          item.request_id === request.id || item.design_request_id === request.id,
      );
      const job = jobs.find((item) => item.request_id === request.id);
      const aiMatchContext =
        aiMatchScores.find((item) => item.request_id === request.id) ?? null;
      const selectedConcept =
        selectedConcepts.find(
          (concept) => concept.design_request_id === request.id,
        ) ?? null;
      const selectedPreview = selectedConcept
        ? conceptPreviews.find(
            (preview) => preview.concept_direction_id === selectedConcept.id,
          ) ?? null
        : null;

      return {
        request,
        match,
        brief,
        job,
        aiMatchContext,
        selectedConcept,
        selectedPreview,
      };
    })
    .sort(
      (a, b) =>
        Number(b.match?.match_score ?? 0) - Number(a.match?.match_score ?? 0),
    );

  return (
    <DashboardShell
      role="designer"
      title="Brief phù hợp"
      description="Xem điểm match và lý do hệ thống đề xuất bạn cho từng brief."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          designerResult.error?.message,
          matchesResult.error?.message,
          requestsResult.error?.message,
          briefsResult.error?.message,
          jobsResult.error?.message,
          aiMatchScoresResult.error?.message,
          selectedConceptsResult.error?.message,
          conceptPreviewsResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Matched briefs"
          value={`${matchedRequests}`}
          description="Brief được match với bạn"
          icon={<Sparkles className="size-5" />}
          tone="dark"
        />

        <MetricCard
          label="Top score"
          value={`${topMatchScore}`}
          description="Điểm match cao nhất"
          icon={<Award className="size-5" />}
          tone={topMatchScore >= 80 ? "success" : "warning"}
        />

        <MetricCard
          label="Converted jobs"
          value={`${convertedJobs}`}
          description="Brief đã chuyển thành job"
          icon={<BriefcaseBusiness className="size-5" />}
          tone="success"
        />

        <MetricCard
          label="Waiting"
          value={`${waitingRequests}`}
          description="Đang chờ customer chọn"
          icon={<Clock3 className="size-5" />}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Designer matching
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                {designerName}
              </h2>

              <p className="mt-2 text-sm font-bold text-blue-700">
                {designerHeadline}
              </p>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                Điểm match được tính dựa trên brief đã chốt, concept khách hàng
                đã chọn, visual preview, portfolio, Style DNA, ngành, hạng mục,
                rating, job hoàn thành, thời gian phản hồi và minimum budget của
                bạn.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
                >
                  <Link href="/designer/jobs">
                    Xem job đang làm
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-blue-200 bg-white font-extrabold"
                >
                  <Link href="/designer/profile">
                    Cập nhật hồ sơ
                    <UserRound className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <SignalBox
                icon={<Sparkles className="size-4" />}
                label="Matched"
                value={`${matchedRequests} brief phù hợp`}
              />

              <SignalBox
                icon={<Award className="size-4" />}
                label="Avg score"
                value={`${averageMatchScore} điểm trung bình`}
                tone={
                  averageMatchScore > 0 && averageMatchScore < 60
                    ? "warning"
                    : "normal"
                }
              />

              <SignalBox
                icon={<BriefcaseBusiness className="size-4" />}
                label="Active jobs"
                value={`${activeJobs} job đang làm`}
              />
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Matched brief list
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Danh sách brief được đề xuất
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Mỗi brief bên dưới cho biết bạn được match bao nhiêu điểm, hợp
                với concept nào, visual preview ra sao và vì sao hệ thống đề
                xuất bạn cho customer.
              </p>
            </div>

            <StatusPill tone="info">{`${matchedRequests} briefs`}</StatusPill>
          </div>

          {matchedRequests === 0 ? (
            <EmptyState
              title="Chưa có brief phù hợp."
              description="Hãy cập nhật profile, Style DNA và portfolio để hệ thống có dữ liệu matching tốt hơn."
              href="/designer/profile"
              buttonLabel="Cập nhật hồ sơ"
            />
          ) : (
            <div className="mt-6 grid gap-5">
              {orderedRequests.map(
                ({
                  request,
                  match,
                  brief,
                  job,
                  aiMatchContext,
                  selectedConcept,
                  selectedPreview,
                }) => (
                  <MatchedBriefCard
                    key={request.id}
                    request={request}
                    match={match}
                    brief={brief}
                    job={job}
                    aiMatchContext={normalizeMatchContext(aiMatchContext)}
                    selectedConcept={selectedConcept}
                    selectedPreview={selectedPreview}
                  />
                ),
              )}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function MatchedBriefCard({
  request,
  match,
  brief,
  job,
  aiMatchContext,
  selectedConcept,
  selectedPreview,
}: {
  request: RequestRow;
  match?: MatchRow;
  brief?: AiBriefRow;
  job?: JobRow;
  aiMatchContext: MatchContext | null;
  selectedConcept: SelectedConceptRow | null;
  selectedPreview: ConceptPreviewRow | null;
}) {
  const requestStatus = getRequestStatusView(request.status);
  const jobStatus = job ? getJobStatusView(job.status) : null;
  const matchScore = Number(match?.match_score ?? 0);
  const matchReasons = match?.match_reasons ?? [];
  const briefSummary = brief ? normalizeBriefSummary(brief) : null;

  return (
    <div className="rounded-[1.35rem] border border-blue-100 bg-blue-50/65 p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ScorePill score={matchScore} />

            <StatusPill tone={requestStatus.tone}>
              {requestStatus.label}
            </StatusPill>

            <StatusPill tone="neutral">
              {getSafeCategoryLabel(request.category)}
            </StatusPill>

            {brief ? (
              <StatusPill tone="success">Có AI brief</StatusPill>
            ) : (
              <StatusPill tone="warning">Chưa có AI brief</StatusPill>
            )}

            {selectedConcept ? (
              <StatusPill tone="info">Có concept đã chọn</StatusPill>
            ) : (
              <StatusPill tone="warning">Chưa có concept</StatusPill>
            )}

            {selectedPreview ? (
              <StatusPill tone="success">Có visual preview</StatusPill>
            ) : null}

            {jobStatus ? (
              <StatusPill tone={jobStatus.tone}>{jobStatus.label}</StatusPill>
            ) : (
              <StatusPill tone="info">Đang chờ customer chọn</StatusPill>
            )}
          </div>

          <h3 className="mt-4 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            {request.title}
          </h3>

          <p className="mt-2 text-sm font-bold text-blue-700">
            {request.business_name}
          </p>

          <p className="mt-3 line-clamp-3 max-w-5xl text-sm font-medium leading-7 text-slate-600">
            {request.description}
          </p>
        </div>

        {job ? (
          <Button
            asChild
            className="w-fit shrink-0 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
          >
            <Link href={`/designer/jobs/${job.id}`}>
              Mở job
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        ) : (
          <Button
            disabled
            className="w-fit shrink-0 rounded-full bg-slate-300 px-5 font-extrabold text-slate-600"
          >
            Chờ customer chọn
          </Button>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoBox
          icon={<Store className="size-4" />}
          label="Industry"
          value={getSafeIndustryLabel(request.industry)}
        />

        <InfoBox
          icon={<CircleDollarSign className="size-4" />}
          label="Budget"
          value={`${formatCurrencyVnd(
            request.budget_min_vnd,
          )} - ${formatCurrencyVnd(request.budget_max_vnd)}`}
        />

        <InfoBox
          icon={<CalendarDays className="size-4" />}
          label="Deadline"
          value={request.deadline ? formatDateVi(request.deadline) : "Chưa có"}
        />

        <InfoBox
          icon={<FileText className="size-4" />}
          label="Created"
          value={formatDateVi(request.created_at)}
        />
      </div>

      {selectedConcept ? (
        <DesignerConceptContext
          concept={selectedConcept}
          preview={selectedPreview}
        />
      ) : null}

      {aiMatchContext ? <AIFitBreakdown context={aiMatchContext} /> : null}

      <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
          <Sparkles className="size-4" />
          Vì sao bạn được đề xuất?
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
            Match này được tạo trước khi hệ thống lưu lý do đề xuất. Customer có
            thể tạo matching lại để cập nhật score và reasons.
          </p>
        )}
      </div>

      {aiMatchContext?.matched_portfolio_evidence.length ? (
        <div className="mt-5 rounded-[1.2rem] border border-emerald-100 bg-emerald-50/70 p-5">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            <BriefcaseBusiness className="size-4" />
            Portfolio evidence
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {aiMatchContext.matched_portfolio_evidence
              .slice(0, 4)
              .map((item) => (
                <div
                  key={`${item.portfolio_item_id}-${item.title}`}
                  className="rounded-2xl bg-white p-4 ring-1 ring-emerald-100"
                >
                  <p className="text-sm font-extrabold text-[#061a3a]">
                    {item.title || "Portfolio item"}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                    {item.fit_reason || item.evidence}
                  </p>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {aiMatchContext?.risk_flags.length ? (
        <div className="mt-5 rounded-[1.2rem] border border-amber-100 bg-amber-50 p-5">
          <div className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
            Rủi ro cần lưu ý trước khi nhận job
          </div>

          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {aiMatchContext.risk_flags.slice(0, 6).map((risk) => (
              <li
                key={risk}
                className="rounded-2xl bg-white p-3 text-sm font-medium leading-6 text-amber-900 ring-1 ring-amber-100"
              >
                • {risk}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {briefSummary ? (
        <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
            <Sparkles className="size-4" />
            AI brief summary
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <BriefBlock label="Objective" value={briefSummary.objective} />

            <BriefBlock
              label="Visual direction"
              value={briefSummary.visualDirection}
            />

            <BriefBlock
              label="Target audience"
              value={briefSummary.targetAudience || request.target_audience || "Chưa rõ"}
            />

            <BriefBlock
              label="Key message"
              value={briefSummary.keyMessage || "Chưa có key message"}
            />
          </div>

          {briefSummary.deliverables.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Deliverables
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {briefSummary.deliverables.map((deliverable) => (
                  <span
                    key={deliverable}
                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
                  >
                    {deliverable}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {briefSummary.designerNotes ? (
            <BriefBlock label="Designer notes" value={briefSummary.designerNotes} />
          ) : null}

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {`Brief generated at ${formatDateVi(briefSummary.createdAt)}`}
          </p>
        </div>
      ) : null}

      {job ? (
        <div className="mt-5 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Converted job
              </p>

              <h4 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
                {job.title}
              </h4>

              <p className="mt-2 text-sm font-medium leading-7 text-emerald-950">
                Customer đã chọn bạn cho brief này. Hãy mở job để gửi update,
                ảnh tiến độ hoặc bản hoàn thiện.
              </p>
            </div>

            <StatusPill tone={getJobStatusView(job.status).tone}>
              {getJobStatusView(job.status).label}
            </StatusPill>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoBox
              icon={<CircleDollarSign className="size-4" />}
              label="Agreed price"
              value={formatCurrencyVnd(job.agreed_price_vnd)}
            />

            <InfoBox
              icon={<CalendarDays className="size-4" />}
              label="Due date"
              value={job.due_at ? formatDateVi(job.due_at) : "Chưa có"}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DesignerConceptContext({
  concept,
  preview,
}: {
  concept: SelectedConceptRow;
  preview: ConceptPreviewRow | null;
}) {
  const colors = normalizeColorPalette(concept.color_palette);

  return (
    <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-white p-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="info">Concept khách đã chọn</StatusPill>
            {preview ? (
              <StatusPill tone="success">Có visual preview</StatusPill>
            ) : null}
          </div>

          <h4 className="mt-3 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
            {concept.concept_name ?? "Concept đã chọn"}
          </h4>

          <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
            {concept.concept_summary ??
              concept.customer_explanation ??
              "Concept này là direction chính mà customer đã chọn trước khi matching."}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
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
              label="Image direction"
              value={concept.image_direction ?? "Chưa rõ"}
            />
          </div>

          {concept.designer_guidance ? (
            <BriefBlock label="Guidance cho designer" value={concept.designer_guidance} />
          ) : null}

          {colors.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {colors.slice(0, 6).map((color) => (
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
          ) : null}
        </div>

        {preview?.image_public_url ? (
          <div className="overflow-hidden rounded-[1.15rem] border border-blue-100 bg-blue-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.image_public_url}
              alt={`Visual concept preview for ${concept.concept_name ?? "selected concept"}`}
              className="aspect-square w-full object-cover"
            />
          </div>
        ) : (
          <div className="grid min-h-48 place-items-center rounded-[1.15rem] border border-dashed border-blue-200 bg-blue-50 p-5 text-center">
            <div>
              <ImageIcon className="mx-auto size-7 text-blue-600" />
              <p className="mt-3 text-sm font-bold text-slate-700">
                Chưa có ảnh preview
              </p>
              <p className="mt-1 text-xs font-medium leading-6 text-slate-500">
                Customer chưa tạo visual preview cho concept này.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AIFitBreakdown({ context }: { context: MatchContext }) {
  return (
    <div className="mt-5 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-5">
      <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
        AI fit breakdown
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ScoreLine label="Portfolio fit" value={context.portfolio_fit_score} />
        <ScoreLine label="Style fit" value={context.style_fit_score} />
        <ScoreLine label="Vibe fit" value={context.vibe_fit_score} />
        <ScoreLine
          label="Industry context"
          value={context.industry_context_fit_score}
        />
        <ScoreLine label="Budget fit" value={context.budget_fit_score} />
      </div>

      {context.not_same_style_but_same_vibe ? (
        <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-semibold leading-6 text-blue-700 ring-1 ring-blue-100">
          Bạn không nhất thiết trùng style trực tiếp với brief, nhưng có cùng
          vibe thị giác với concept mà customer đã chọn.
        </div>
      ) : null}
    </div>
  );
}

function ScoreLine({ label, value }: { label: string; value: number }) {
  const safeValue = clampScore(value);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        <span>{label}</span>
        <span>{safeValue}/100</span>
      </div>

      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{
            width: `${safeValue}%`,
          }}
        />
      </div>
    </div>
  );
}

function BriefBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/65 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium leading-7 text-slate-700">
        {value}
      </p>
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

function SignalBox({
  icon,
  label,
  value,
  tone = "normal",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "normal" | "warning";
}) {
  const boxClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-blue-100 bg-blue-50/65";

  return (
    <div className={`rounded-[1.15rem] border p-4 ${boxClass}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {icon}
        {label}
      </div>

      <p className="mt-2 text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
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

function ScorePill({
  score,
  label = "Match score",
}: {
  score: number;
  label?: string;
}) {
  const view = getScoreView(score);

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${view.className}`}
    >
      <Award className="size-3.5" />
      {`${label}: ${score}`}
    </div>
  );
}

function EmptyState({
  title,
  description,
  href,
  buttonLabel,
}: {
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
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

      <Button
        asChild
        className="mt-6 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
      >
        <Link href={href}>{buttonLabel}</Link>
      </Button>
    </div>
  );
}

function normalizeBriefSummary(brief: AiBriefRow): BriefSummary {
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

  const mood = asArray(visualDirection.mood);
  const styleTags = asArray(visualDirection.style_tags);
  const colorDirection = asArray(visualDirection.color_direction);

  const visualDirectionText =
    [
      mood.length > 0 ? `Mood: ${mood.join(", ")}` : "",
      styleTags.length > 0 ? `Style: ${styleTags.join(", ")}` : "",
      colorDirection.length > 0 ? `Màu sắc: ${colorDirection.join(", ")}` : "",
      stringValue(visualDirection.typography_direction)
        ? `Typography: ${stringValue(visualDirection.typography_direction)}`
        : "",
      stringValue(visualDirection.layout_direction)
        ? `Layout: ${stringValue(visualDirection.layout_direction)}`
        : "",
      stringValue(visualDirection.image_direction)
        ? `Hình ảnh: ${stringValue(visualDirection.image_direction)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n") ||
    stringValue(source.visual_direction ?? brief.visual_direction) ||
    "Chưa có visual direction.";

  return {
    objective:
      stringValue(source.design_objective ?? brief.design_objective) ||
      stringValue(source.objective ?? brief.objective) ||
      "Chưa có objective.",
    visualDirection: visualDirectionText,
    keyMessage:
      stringValue(source.key_message ?? brief.key_message) ||
      "Chưa có key message.",
    targetAudience:
      stringValue(source.target_audience ?? brief.target_audience) ||
      "Chưa rõ.",
    deliverables: asArray(source.deliverables ?? brief.deliverables),
    designerNotes: stringValue(source.designer_notes ?? brief.designer_notes),
    completenessScore: Number(brief.brief_completeness_score ?? 0),
    createdAt: brief.created_at,
  };
}

function normalizeMatchContext(row: AiDesignerMatchScoreRow | null) {
  if (!row) {
    return null;
  }

  const analysisJson = asRecord(row.analysis_json);

  return {
    portfolio_fit_score: Number(row.portfolio_fit_score ?? 0),
    style_fit_score: Number(row.style_fit_score ?? 0),
    vibe_fit_score: Number(row.vibe_fit_score ?? 0),
    industry_context_fit_score: Number(row.industry_context_fit_score ?? 0),
    budget_fit_score: Number(row.budget_fit_score ?? 0),
    not_same_style_but_same_vibe: Boolean(row.not_same_style_but_same_vibe),
    risk_flags:
      row.risk_flags ?? asArray(analysisJson.risk_flags).slice(0, 8),
    matched_portfolio_evidence: normalizePortfolioEvidence(
      row.matched_portfolio_evidence ??
        analysisJson.matched_portfolio_evidence,
    ),
  } satisfies MatchContext;
}

function normalizePortfolioEvidence(value: unknown): MatchEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);

      return {
        portfolio_item_id: stringValue(record.portfolio_item_id),
        title: stringValue(record.title),
        evidence: stringValue(record.evidence),
        fit_reason: stringValue(record.fit_reason),
      };
    })
    .filter((item) => item.portfolio_item_id || item.title)
    .slice(0, 4);
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

function asArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => stringValue(item)).filter(Boolean);
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

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function getScoreView(score: number) {
  if (score >= 80) {
    return {
      label: "Rất phù hợp",
      className: "border-emerald-200 bg-emerald-100 text-emerald-700",
    };
  }

  if (score >= 60) {
    return {
      label: "Phù hợp",
      className: "border-blue-200 bg-blue-100 text-blue-700",
    };
  }

  if (score >= 40) {
    return {
      label: "Cần cân nhắc",
      className: "border-amber-200 bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "Thấp",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  };
}

function getRequestStatusView(status: string) {
  if (status === "completed") {
    return {
      label: "Hoàn thành",
      tone: "success" as const,
    };
  }

  if (status === "matched") {
    return {
      label: "Đã matching",
      tone: "success" as const,
    };
  }

  if (status === "brief_generated") {
    return {
      label: "Đã có brief",
      tone: "info" as const,
    };
  }

  if (status === "new") {
    return {
      label: "Mới tạo",
      tone: "neutral" as const,
    };
  }

  return {
    label: status,
    tone: "neutral" as const,
  };
}

function getJobStatusView(status: string) {
  if (status === "completed") {
    return {
      label: "Hoàn thành",
      tone: "success" as const,
    };
  }

  if (status === "active") {
    return {
      label: "Đang làm",
      tone: "info" as const,
    };
  }

  if (status === "cancelled") {
    return {
      label: "Đã hủy",
      tone: "warning" as const,
    };
  }

  return {
    label: status,
    tone: "neutral" as const,
  };
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