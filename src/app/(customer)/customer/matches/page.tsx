import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  ImageIcon,
  LayoutTemplate,
  Palette,
  Sparkles,
  Star,
  Store,
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { SelectDesignerButton } from "@/features/customer/matches/components/select-designer-button";
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel } from "@/lib/domain/labels";
import { formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CustomerMatchesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RequestRow = {
  id: string;
  title: string;
  business_name: string;
  category: string;
  status: string;
  created_at: string;
};

type MatchRow = {
  id: string;
  request_id: string;
  designer_id: string;
  match_score: number;
  match_reasons: string[] | null;
  matched_portfolio_ids: string[] | null;
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
};

type JobRow = {
  id: string;
  request_id: string;
  designer_id: string;
  status: string;
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
  analysis_json: Record<string, any>;
};

export default async function CustomerMatchesPage({
  searchParams,
}: CustomerMatchesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedRequestId = getSearchParamString(
    resolvedSearchParams.requestId,
  );

  const authState = await requireRole(["customer"]);
  const profile = authState.profile;
  const customerProfile = authState.customerProfile;

  if (!profile || !customerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  let requestsQuery = adminSupabase
    .from("design_requests")
    .select("id, title, business_name, category, status, created_at")
    .eq("customer_id", customerProfile.id)
    .order("created_at", { ascending: false });

  if (selectedRequestId) {
    requestsQuery = requestsQuery.eq("id", selectedRequestId);
  }

  const requestsResult = await requestsQuery;

  const requests = (requestsResult.data ?? []) as unknown as RequestRow[];
  const requestIds = requests.map((request) => request.id);

  const matchesResult =
    requestIds.length > 0
      ? await adminSupabase
          .from("designer_matches")
          .select(
            `
            id,
            request_id,
            designer_id,
            match_score,
            match_reasons,
            matched_portfolio_ids
          `,
          )
          .in("request_id", requestIds)
          .order("match_score", { ascending: false })
      : { data: [], error: null };

  const matches = (matchesResult.data ?? []) as unknown as MatchRow[];

  const designerIds = Array.from(
    new Set(matches.map((match) => match.designer_id)),
  );

  const designersResult =
    designerIds.length > 0
      ? await adminSupabase
          .from("designer_profiles")
          .select(
            "id, display_name, headline, rating, completed_jobs, response_time_hours, availability, verification_status",
          )
          .in("id", designerIds)
      : { data: [], error: null };

  const designers = (designersResult.data ?? []) as unknown as DesignerRow[];

  const jobsResult =
    requestIds.length > 0
      ? await adminSupabase
          .from("jobs")
          .select("id, request_id, designer_id, status")
          .in("request_id", requestIds)
      : { data: [], error: null };

  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];

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
          .in("request_id", requestIds)
      : { data: [], error: null };

  const aiMatchScores =
    (aiMatchScoresResult.data ?? []) as unknown as AiDesignerMatchScoreRow[];

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

  const conceptPreviews =
    (conceptPreviewsResult.data ?? []) as unknown as ConceptPreviewRow[];

  const requestsWithMatches = requests.filter((request) =>
    matches.some((match) => match.request_id === request.id),
  );

  const totalMatches = matches.length;
  const matchedRequests = requestsWithMatches.length;
  const requestsWithJobs = requests.filter((request) =>
    jobs.some((job) => job.request_id === request.id),
  ).length;

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

  return (
    <DashboardShell
      role="customer"
      title="Designer match"
      description="Xem điểm match và lý do hệ thống đề xuất designer cho từng brief."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          requestsResult.error?.message,
          matchesResult.error?.message,
          designersResult.error?.message,
          jobsResult.error?.message,
          aiMatchScoresResult.error?.message,
          selectedConceptsResult.error?.message,
          conceptPreviewsResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requests"
          value={`${requests.length}`}
          description={
            selectedRequestId
              ? "Đang xem request hiện tại"
              : "Tổng request của bạn"
          }
          icon={<FileText className="size-5" />}
          tone="dark"
        />

        <MetricCard
          label="Matched"
          value={`${matchedRequests}`}
          description="Request đã có designer match"
          icon={<UsersRound className="size-5" />}
          tone="success"
        />

        <MetricCard
          label="Top score"
          value={`${clampScore(topMatchScore)}/100`}
          description="Điểm match cao nhất"
          icon={<Award className="size-5" />}
          tone={topMatchScore >= 80 ? "success" : "warning"}
        />

        <MetricCard
          label="Created jobs"
          value={`${requestsWithJobs}`}
          description="Request đã chuyển thành job"
          icon={<BriefcaseBusiness className="size-5" />}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Matching workspace
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                Designer phù hợp với brief, concept và visual preview
              </h2>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                Mỗi designer được đề xuất dựa trên brief đã chốt, concept
                direction khách hàng đã chọn, visual preview, portfolio analysis,
                Designer Style DNA, rating, khả năng phản hồi và mức budget.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
                >
                  <Link href="/customer/requests">
                    Xem request của tôi
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-blue-200 bg-white font-extrabold"
                >
                  <Link href="/customer/requests/new">
                    Tạo brief mới
                    <Sparkles className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <SignalBox
                icon={<CheckCircle2 className="size-4" />}
                label="Ready"
                value={`${matchedRequests} request đã có match`}
              />

              <SignalBox
                icon={<Target className="size-4" />}
                label="Avg score"
                value={`${clampScore(averageMatchScore)}/100 điểm trung bình`}
                tone={
                  averageMatchScore > 0 && averageMatchScore < 60
                    ? "warning"
                    : "normal"
                }
              />

              <SignalBox
                icon={<ImageIcon className="size-4" />}
                label="Preview"
                value={`${conceptPreviews.length} ảnh concept preview`}
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
                Match results
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Kết quả matching theo request
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Designer có điểm càng cao thì càng phù hợp với brief và concept
                hiện tại. Lý do match giúp bạn hiểu designer hợp ở mood, style,
                layout, typography, portfolio evidence và rủi ro nào cần lưu ý.
              </p>
            </div>

            <StatusPill tone="info">{`${totalMatches} matches`}</StatusPill>
          </div>

          {requests.length === 0 ? (
            <EmptyState
              title={
                selectedRequestId
                  ? "Không tìm thấy request này."
                  : "Bạn chưa có request nào."
              }
              description={
                selectedRequestId
                  ? "Request này không tồn tại hoặc không thuộc tài khoản customer hiện tại."
                  : "Hãy tạo brief đầu tiên để AI có thể đề xuất designer phù hợp."
              }
              href="/customer/requests"
              buttonLabel="Mở danh sách request"
            />
          ) : requestsWithMatches.length === 0 ? (
            <EmptyState
              title="Chưa có designer match."
              description="Hãy mở request đã tạo, chọn concept, tạo visual preview rồi bấm “Tiếp tục chọn designer” để AI đề xuất designer."
              href={
                selectedRequestId
                  ? `/customer/requests/${selectedRequestId}`
                  : "/customer/requests"
              }
              buttonLabel="Mở request"
            />
          ) : (
            <div className="mt-6 grid gap-5">
              {requestsWithMatches.map((request) => {
                const requestMatches = matches
                  .filter((match) => match.request_id === request.id)
                  .sort(
                    (a, b) =>
                      Number(b.match_score ?? 0) - Number(a.match_score ?? 0),
                  );

                const requestJobs = jobs.filter(
                  (job) => job.request_id === request.id,
                );

                const selectedConcept =
                  selectedConcepts.find(
                    (concept) => concept.design_request_id === request.id,
                  ) ?? null;

                const selectedPreview = selectedConcept
                  ? conceptPreviews.find(
                      (preview) =>
                        preview.concept_direction_id === selectedConcept.id,
                    ) ?? null
                  : null;

                return (
                  <RequestMatchGroup
                    key={request.id}
                    request={request}
                    matches={requestMatches}
                    designers={designers}
                    jobs={requestJobs}
                    aiMatchScores={aiMatchScores}
                    selectedConcept={selectedConcept}
                    selectedPreview={selectedPreview}
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

function RequestMatchGroup({
  request,
  matches,
  designers,
  jobs,
  aiMatchScores,
  selectedConcept,
  selectedPreview,
}: {
  request: RequestRow;
  matches: MatchRow[];
  designers: DesignerRow[];
  jobs: JobRow[];
  aiMatchScores: AiDesignerMatchScoreRow[];
  selectedConcept: SelectedConceptRow | null;
  selectedPreview: ConceptPreviewRow | null;
}) {
  const bestScore =
    matches.length > 0
      ? Math.max(...matches.map((match) => Number(match.match_score ?? 0)))
      : 0;

  return (
    <div className="rounded-[1.35rem] border border-blue-100 bg-blue-50/65 p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="neutral">
              {getSafeCategoryLabel(request.category)}
            </StatusPill>

            <StatusPill tone={jobs.length > 0 ? "success" : "info"}>
              {jobs.length > 0 ? `${jobs.length} job đã tạo` : "Chưa tạo job"}
            </StatusPill>

            <StatusPill tone="success">{`${matches.length} matches`}</StatusPill>

            <ScorePill score={bestScore} label="Best match" />

            {selectedConcept ? (
              <StatusPill tone="info">Có concept đã chọn</StatusPill>
            ) : (
              <StatusPill tone="warning">Chưa chọn concept</StatusPill>
            )}

            {selectedPreview ? (
              <StatusPill tone="success">Có visual preview</StatusPill>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            {request.title}
          </h3>

          <p className="mt-2 text-sm font-bold text-blue-700">
            {request.business_name}
          </p>

          <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {`Created at ${formatDateVi(request.created_at)}`}
          </p>
        </div>

        <Button
          asChild
          className="w-fit shrink-0 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
        >
          <Link href={`/customer/requests/${request.id}`}>
            Mở request
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      {selectedConcept ? (
        <RequestConceptContext
          concept={selectedConcept}
          preview={selectedPreview}
        />
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {matches.map((match, index) => {
          const designer = designers.find(
            (item) => item.id === match.designer_id,
          );

          const jobForDesigner = jobs.find(
            (job) => job.designer_id === match.designer_id,
          );

          const requestAlreadyHasJob = jobs.length > 0;

          const aiMatchContext =
            aiMatchScores.find(
              (score) =>
                score.request_id === match.request_id &&
                score.designer_id === match.designer_id,
            ) ?? null;

          return (
            <DesignerMatchCard
              key={match.id}
              rank={index + 1}
              requestId={request.id}
              match={match}
              designer={designer}
              hasJob={Boolean(jobForDesigner)}
              jobId={jobForDesigner?.id}
              requestAlreadyHasJob={requestAlreadyHasJob}
              aiMatchContext={normalizeMatchContext(aiMatchContext)}
            />
          );
        })}
      </div>
    </div>
  );
}

function RequestConceptContext({
  concept,
  preview,
}: {
  concept: SelectedConceptRow;
  preview: ConceptPreviewRow | null;
}) {
  const colors = normalizeColorPalette(concept.color_palette);

  return (
    <div className="mt-5 rounded-[1.25rem] border border-blue-100 bg-white p-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="info">Selected concept</StatusPill>
            {preview ? (
              <StatusPill tone="success">Visual preview ready</StatusPill>
            ) : null}
          </div>

          <h4 className="mt-3 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
            {concept.concept_name ?? "Concept đã chọn"}
          </h4>

          <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
            {concept.concept_summary ??
              concept.customer_explanation ??
              "Concept này được dùng làm creative direction chính khi matching designer."}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MiniInfo
              icon={<Palette className="size-4" />}
              label="Mood"
              value={
                (concept.mood_tags ?? []).slice(0, 4).join(", ") || "Chưa rõ"
              }
            />

            <MiniInfo
              icon={<LayoutTemplate className="size-4" />}
              label="Style"
              value={
                (concept.style_tags ?? []).slice(0, 4).join(", ") || "Chưa rõ"
              }
            />

            <MiniInfo
              icon={<ImageIcon className="size-4" />}
              label="Visual"
              value={concept.image_direction ?? "Chưa rõ"}
            />
          </div>

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
              alt={`Visual concept preview for ${
                concept.concept_name ?? "selected concept"
              }`}
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
                Tạo ảnh visual preview trong trang Review Brief để matching có
                thêm ngữ cảnh hình ảnh.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DesignerMatchCard({
  rank,
  requestId,
  match,
  designer,
  hasJob,
  jobId,
  requestAlreadyHasJob,
  aiMatchContext,
}: {
  rank: number;
  requestId: string;
  match: MatchRow;
  designer?: DesignerRow;
  hasJob: boolean;
  jobId?: string;
  requestAlreadyHasJob: boolean;
  aiMatchContext: MatchContext | null;
}) {
  if (!designer) {
    return (
      <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold leading-7 text-amber-800">
          Không tìm thấy dữ liệu designer cho match này.
        </p>
      </div>
    );
  }

  const matchScore = Number(match.match_score ?? 0);
  const matchReasons = match.match_reasons ?? [];

  return (
    <div className="rounded-[1.2rem] border border-blue-100 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <UserRound className="size-5" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="info">{`TOP ${rank}`}</StatusPill>

            <ScorePill score={matchScore} />

            <RatingPill rating={designer.rating ?? 0} />

            <StatusPill tone={hasJob ? "success" : "neutral"}>
              {hasJob ? "Đã tạo job" : "Có thể chọn"}
            </StatusPill>
          </div>

          <h4 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
            {designer.display_name}
          </h4>

          <p className="mt-1 text-sm font-bold leading-6 text-blue-700">
            {designer.headline ?? "Designer"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <MiniInfo
          icon={<CheckCircle2 className="size-4" />}
          label="Completed jobs"
          value={`${designer.completed_jobs ?? 0}`}
        />

        <MiniInfo
          icon={<Clock3 className="size-4" />}
          label="Response"
          value={`${designer.response_time_hours ?? 24} giờ`}
        />

        <MiniInfo
          icon={<Store className="size-4" />}
          label="Availability"
          value={getAvailabilityLabel(designer.availability)}
        />
      </div>

      {aiMatchContext ? <AIFitBreakdown context={aiMatchContext} /> : null}

      <div className="mt-5 rounded-[1.1rem] border border-blue-100 bg-blue-50/65 p-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
          <Sparkles className="size-4" />
          Lý do đề xuất
        </div>

        {matchReasons.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {matchReasons.slice(0, 8).map((reason) => (
              <li
                key={reason}
                className="flex gap-2 text-sm font-medium leading-6 text-slate-700"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
            Match này được tạo trước khi hệ thống lưu lý do đề xuất. Hãy tạo
            matching lại để cập nhật dữ liệu.
          </p>
        )}
      </div>

      {aiMatchContext?.matched_portfolio_evidence.length ? (
        <div className="mt-5 rounded-[1.1rem] border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            <BriefcaseBusiness className="size-4" />
            Portfolio evidence
          </div>

          <div className="mt-3 grid gap-3">
            {aiMatchContext.matched_portfolio_evidence
              .slice(0, 3)
              .map((item) => (
                <div
                  key={`${item.portfolio_item_id}-${item.title}`}
                  className="rounded-2xl bg-white p-3 ring-1 ring-emerald-100"
                >
                  <p className="text-sm font-extrabold text-[#061a3a]">
                    {item.title || "Portfolio item"}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                    {item.fit_reason || item.evidence}
                  </p>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {aiMatchContext?.risk_flags.length ? (
        <div className="mt-5 rounded-[1.1rem] border border-amber-100 bg-amber-50 p-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            Rủi ro cần lưu ý
          </div>

          <ul className="mt-3 grid gap-2">
            {aiMatchContext.risk_flags.slice(0, 4).map((risk) => (
              <li
                key={risk}
                className="text-sm font-medium leading-6 text-amber-900"
              >
                • {risk}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {jobId ? (
        <Button
          asChild
          variant="outline"
          className="mt-5 w-full rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href={`/customer/jobs/${jobId}`}>
            Xem job đã tạo
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      ) : requestAlreadyHasJob ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-semibold leading-6 text-slate-600">
          Request này đã có job với designer khác.
        </div>
      ) : (
        <SelectDesignerButton requestId={requestId} matchId={match.id} />
      )}
    </div>
  );
}

function AIFitBreakdown({ context }: { context: MatchContext }) {
  return (
    <div className="mt-5 rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        AI fit breakdown
      </div>

      <div className="mt-3 grid gap-2">
        <ScoreLine label="Portfolio" value={context.portfolio_fit_score} />
        <ScoreLine label="Style" value={context.style_fit_score} />
        <ScoreLine label="Vibe" value={context.vibe_fit_score} />
        <ScoreLine label="Industry" value={context.industry_context_fit_score} />
        <ScoreLine label="Budget" value={context.budget_fit_score} />
      </div>

      {context.not_same_style_but_same_vibe ? (
        <div className="mt-3 rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-blue-700 ring-1 ring-blue-100">
          Designer không nhất thiết trùng style trực tiếp, nhưng có cùng vibe
          thị giác với brief/concept.
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

function MiniInfo({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/65 p-3">
      <div className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-blue-600">
        {icon}
        {label}
      </div>

      <p className="mt-2 break-words text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}

function RatingPill({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-amber-700">
      <Star className="size-3.5 fill-current" />
      {Number(rating ?? 0).toFixed(1)}/5
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
  const safeScore = clampScore(score);
  const view = getScoreView(safeScore);

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${view.className}`}
    >
      <Award className="size-3.5" />
      {`${label}: ${safeScore}/100`}
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

function normalizeMatchContext(row: AiDesignerMatchScoreRow | null) {
  if (!row) {
    return null;
  }

  return {
    portfolio_fit_score: Number(row.portfolio_fit_score ?? 0),
    style_fit_score: Number(row.style_fit_score ?? 0),
    vibe_fit_score: Number(row.vibe_fit_score ?? 0),
    industry_context_fit_score: Number(row.industry_context_fit_score ?? 0),
    budget_fit_score: Number(row.budget_fit_score ?? 0),
    not_same_style_but_same_vibe: Boolean(row.not_same_style_but_same_vibe),
    risk_flags: row.risk_flags ?? [],
    matched_portfolio_evidence: normalizePortfolioEvidence(
      row.matched_portfolio_evidence,
    ),
    analysis_json: asRecord(row.analysis_json),
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

function getAvailabilityLabel(status: string | null) {
  if (status === "available" || status === "open") return "Đang nhận job";
  if (status === "limited") return "Nhận job hạn chế";
  if (status === "busy") return "Đang bận";
  if (status === "unavailable") return "Tạm nghỉ";
  return "Chưa rõ";
}

function getSafeCategoryLabel(category: string) {
  try {
    return getCategoryLabel(category as Parameters<typeof getCategoryLabel>[0]);
  } catch {
    return category;
  }
}

function getSearchParamString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}