import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  ImageIcon,
  Layers3,
  MessageSquareText,
  Palette,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Target,
  TriangleAlert,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import {
  getCategoryLabel,
  getIndustryLabel,
  getStyleLabel,
} from "@/lib/domain/labels";
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
  preferred_styles: string[] | null;
  status: string;
  brief_review_status: string | null;
  brief_confirmed_at: string | null;
  created_at: string;
};

type AiBriefRow = {
  id: string;
  request_id: string | null;
  design_request_id: string | null;
  objective: string;
  visual_direction: string;
  key_message: string | null;
  deliverables: string[] | null;
  recommended_styles: string[] | null;
  risk_level: string;
  risk_notes: string[] | null;
  brief_completeness_score: number;
  brief_json: unknown;
  customer_edited_brief_json: unknown;
  final_brief_json: unknown;
  project_title: string | null;
  business_context: string | null;
  design_objective: string | null;
  target_audience: string | null;
  content_requirements: string[] | null;
  technical_requirements: string[] | null;
  references_to_collect: string[] | null;
  designer_notes: string | null;
  status: string | null;
  confirmed_at: string | null;
  created_at: string;
};

type ProductSpecificSection = {
  section_title: string;
  requirements: string[];
};

type VisualDirection = {
  mood: string[];
  style_tags: string[];
  color_direction: string[];
  typography_direction: string;
  layout_direction: string;
  image_direction: string;
};

type LayoutHierarchy = {
  priority_order: string[];
  composition_notes: string;
  readability_notes: string;
  print_or_platform_notes: string;
};

type AdminBriefDisplay = {
  project_title: string;
  business_context: string;
  design_objective: string;
  target_audience: string;
  key_message: string;
  deliverables: string[];
  product_specific_requirements: ProductSpecificSection[];
  visual_direction: VisualDirection;
  layout_hierarchy: LayoutHierarchy;
  content_requirements: string[];
  technical_requirements: string[];
  references_to_collect: string[];
  designer_notes: string;
};

type MatchRow = {
  id: string;
  request_id: string;
  designer_id: string;
  match_score: number;
  match_reasons: string[] | null;
  created_at: string | null;
};

type AiDesignerMatchScoreRow = {
  id: string;
  request_id: string;
  designer_id: string;
  match_score: number | null;
  portfolio_fit_score: number | null;
  style_fit_score: number | null;
  vibe_fit_score: number | null;
  industry_context_fit_score: number | null;
  budget_fit_score: number | null;
  not_same_style_but_same_vibe: boolean | null;
  match_reasons: string[] | null;
  risk_flags: string[] | null;
  matched_portfolio_evidence: unknown;
  created_at: string | null;
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

type PortfolioRow = {
  id: string;
  designer_id: string;
  title: string;
  category: string;
  industry: string | null;
  image_url: string | null;
  ai_analysis_status: string | null;
  ai_visual_summary: string | null;
  ai_style_tags: string[] | null;
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
  platform_fee_vnd: number | null;
  designer_revenue_vnd: number | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  job_id: string;
  amount_vnd: number;
  status: string;
  transfer_note: string | null;
  platform_fee_vnd: number | null;
  designer_revenue_vnd: number | null;
  confirmed_at: string | null;
  created_at: string;
};

export default async function AdminRequestDetailPage({ params }: RouteProps) {
  const routeParams = await params;
  const requestId = routeParams.requestId ?? routeParams.requestID;

  if (!requestId) {
    notFound();
  }

  const authState = await requireRole(["admin"]);
  const profile = authState.profile;

  if (!profile) {
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
      preferred_styles,
      status,
      brief_review_status,
      brief_confirmed_at,
      created_at
    `,
    )
    .eq("id", requestId)
    .maybeSingle();

  if (requestResult.error) {
    throw new Error(requestResult.error.message);
  }

  if (!requestResult.data) {
    notFound();
  }

  const request = requestResult.data as RequestRow;

  const [briefResult, matchesResult, aiScoresResult, jobsResult] =
    await Promise.all([
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
          deliverables,
          recommended_styles,
          risk_level,
          risk_notes,
          brief_completeness_score,
          brief_json,
          customer_edited_brief_json,
          final_brief_json,
          project_title,
          business_context,
          design_objective,
          target_audience,
          content_requirements,
          technical_requirements,
          references_to_collect,
          designer_notes,
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
          match_reasons,
          created_at
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
          platform_fee_vnd,
          designer_revenue_vnd,
          due_at,
          completed_at,
          created_at
        `,
        )
        .eq("request_id", request.id)
        .order("created_at", { ascending: false }),
    ]);

  const brief = briefResult.data as unknown as AiBriefRow | null;
  const matches = (matchesResult.data ?? []) as unknown as MatchRow[];
  const aiScores = (aiScoresResult.data ??
    []) as unknown as AiDesignerMatchScoreRow[];
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];

  const designerIds = Array.from(
    new Set([
      ...matches.map((match) => match.designer_id),
      ...aiScores.map((score) => score.designer_id),
      ...jobs.map((job) => job.designer_id),
    ]),
  );

  const jobIds = jobs.map((job) => job.id);

  const designersResult =
    designerIds.length > 0
      ? await adminSupabase
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
          .in("id", designerIds)
      : { data: [], error: null };

  const portfolioResult =
    designerIds.length > 0
      ? await adminSupabase
          .from("portfolio_items")
          .select(
            `
            id,
            designer_id,
            title,
            category,
            industry,
            image_url,
            ai_analysis_status,
            ai_visual_summary,
            ai_style_tags,
            ai_confidence_score,
            created_at
          `,
          )
          .in("designer_id", designerIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  const paymentsResult =
    jobIds.length > 0
      ? await adminSupabase
          .from("payments")
          .select(
            `
            id,
            job_id,
            amount_vnd,
            status,
            transfer_note,
            platform_fee_vnd,
            designer_revenue_vnd,
            confirmed_at,
            created_at
          `,
          )
          .in("job_id", jobIds)
      : { data: [], error: null };

  const designers = (designersResult.data ?? []) as unknown as DesignerRow[];
  const portfolioItems = (portfolioResult.data ??
    []) as unknown as PortfolioRow[];
  const payments = (paymentsResult.data ?? []) as unknown as PaymentRow[];

  const requestStatus = getRequestStatusView(request.status);
  const briefConfirmed = isBriefConfirmed(request, brief);
  const adminBrief = brief ? normalizeAdminBrief(brief) : null;

  const topMatchScore = getTopMatchScore(matches, aiScores);

  const confirmedPaymentValue = payments
    .filter((payment) =>
      ["paid", "confirmed", "completed", "succeeded"].includes(payment.status),
    )
    .reduce((total, payment) => total + Number(payment.amount_vnd ?? 0), 0);

  const totalJobValue = jobs.reduce(
    (total, job) => total + Number(job.agreed_price_vnd ?? 0),
    0,
  );

  const warningItems = buildRequestWarnings({
    request,
    brief,
    briefConfirmed,
    matches,
    jobs,
    payments,
  });

  return (
    <DashboardShell
      role="admin"
      title="Request detail"
      description="Kiểm tra request, final brief, AI matching, portfolio evidence, job và payment liên quan."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          briefResult.error?.message,
          matchesResult.error?.message,
          aiScoresResult.error?.message,
          jobsResult.error?.message,
          designersResult.error?.message,
          portfolioResult.error?.message,
          paymentsResult.error?.message,
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="outline"
          className="rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href="/admin/requests">
            <ArrowLeft className="mr-2 size-4" />
            Quay lại requests
          </Link>
        </Button>

        <div className="flex flex-wrap gap-2">
          <StatusPill tone={requestStatus.tone}>
            {requestStatus.label}
          </StatusPill>

          {brief ? (
            <StatusPill tone="success">Đã có AI brief</StatusPill>
          ) : (
            <StatusPill tone="warning">Chưa có AI brief</StatusPill>
          )}

          {briefConfirmed ? (
            <StatusPill tone="success">Brief đã chốt</StatusPill>
          ) : (
            <StatusPill tone="warning">Brief chưa chốt</StatusPill>
          )}

          <StatusPill tone={matches.length > 0 ? "success" : "warning"}>
            {`${matches.length} matches`}
          </StatusPill>

          <StatusPill tone={jobs.length > 0 ? "success" : "neutral"}>
            {`${jobs.length} jobs`}
          </StatusPill>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Request status"
          value={requestStatus.label}
          description="Trạng thái request hiện tại"
          icon={<FileText className="size-5" />}
          tone="dark"
        />

        <MetricCard
          label="Brief score"
          value={brief ? `${brief.brief_completeness_score}/100` : "Chưa có"}
          description="Độ hoàn thiện brief AI"
          icon={<Sparkles className="size-5" />}
          tone={brief ? "success" : "warning"}
        />

        <MetricCard
          label="Top score"
          value={matches.length > 0 || aiScores.length > 0 ? `${topMatchScore}` : "N/A"}
          description="Điểm matching cao nhất"
          icon={<Award className="size-5" />}
          tone={topMatchScore >= 80 ? "success" : "warning"}
        />

        <MetricCard
          label="Paid value"
          value={formatCurrencyVnd(confirmedPaymentValue)}
          description="Tổng tiền đã xác nhận"
          icon={<WalletCards className="size-5" />}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-[#061a3a] via-[#0b2a61] to-blue-700 p-6 text-white">
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/75">
                  Request operation center
                </p>

                <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.065em] text-white">
                  {request.title}
                </h1>

                <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-white/70">
                  Admin kiểm tra toàn bộ pipeline của request: dữ liệu đầu vào,
                  brief cuối cùng, AI matching, bằng chứng portfolio, job và
                  payment phát sinh.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <DarkSignalBox
                  icon={<Sparkles className="size-4" />}
                  label="AI brief"
                  value={brief ? "Đã tạo" : "Chưa có"}
                />

                <DarkSignalBox
                  icon={<ShieldCheck className="size-4" />}
                  label="Brief status"
                  value={briefConfirmed ? "Đã chốt" : "Chưa chốt"}
                />

                <DarkSignalBox
                  icon={<BriefcaseBusiness className="size-4" />}
                  label="Job value"
                  value={formatCurrencyVnd(totalJobValue)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-4">
            <SignalBox
              icon={<Store className="size-4" />}
              label="Business"
              value={request.business_name}
            />

            <SignalBox
              icon={<Palette className="size-4" />}
              label="Category"
              value={getSafeCategoryLabel(request.category)}
            />

            <SignalBox
              icon={<CalendarDays className="size-4" />}
              label="Deadline"
              value={request.deadline ? formatDateVi(request.deadline) : "Chưa có"}
              tone={!request.deadline ? "warning" : "normal"}
            />

            <SignalBox
              icon={<TriangleAlert className="size-4" />}
              label="Warnings"
              value={
                warningItems.length > 0
                  ? `${warningItems.length} cảnh báo`
                  : "Không có cảnh báo"
              }
              tone={warningItems.length > 0 ? "warning" : "normal"}
            />
          </div>
        </SurfaceCard>
      </section>

      {warningItems.length > 0 ? (
        <section className="mt-5">
          <SurfaceCard className="border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-600 text-white">
                <TriangleAlert className="size-5" />
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
                  Admin attention needed
                </p>

                <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                  Các điểm cần kiểm tra
                </h2>

                <div className="mt-4 grid gap-2">
                  {warningItems.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-amber-200 bg-white/80 p-3 text-sm font-semibold leading-6 text-amber-950"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SurfaceCard>
        </section>
      ) : null}

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <RequestOverviewPanel request={request} />

        {brief && adminBrief ? (
          <FinalBriefPanel
            brief={brief}
            adminBrief={adminBrief}
            isConfirmed={briefConfirmed}
          />
        ) : (
          <SurfaceCard className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Final brief
            </p>

            <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-medium leading-7 text-amber-950">
                Request này chưa có AI brief. Customer cần tạo và chốt brief
                trước khi matching để dữ liệu đề xuất designer chính xác hơn.
              </p>
            </div>
          </SurfaceCard>
        )}
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Designer matches
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Kết quả matching
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Admin kiểm tra điểm match, lý do đề xuất, AI fit score, trạng
                thái duyệt designer và portfolio evidence.
              </p>
            </div>

            <StatusPill tone="info">{`${matches.length} matches`}</StatusPill>
          </div>

          {matches.length === 0 ? (
            <EmptyState
              title="Chưa có designer match."
              description="Customer chưa tạo matching hoặc không có designer đã duyệt phù hợp."
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

                return (
                  <AdminMatchCard
                    key={match.id}
                    match={match}
                    aiScore={aiScore}
                    designer={designer}
                    portfolioItems={designerPortfolio}
                    job={job}
                  />
                );
              })}
            </div>
          )}
        </SurfaceCard>
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Jobs & payments
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Job đã tạo từ request này
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Nếu customer đã chọn designer, job và payment tương ứng sẽ hiển
                thị tại đây.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusPill tone="info">{`${jobs.length} jobs`}</StatusPill>
              <StatusPill tone="success">
                {formatCurrencyVnd(totalJobValue)}
              </StatusPill>
            </div>
          </div>

          {jobs.length === 0 ? (
            <EmptyState
              title="Request này chưa có job."
              description="Job sẽ được tạo khi customer chọn một designer từ danh sách match."
            />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {jobs.map((job) => {
                const designer = designers.find(
                  (item) => item.id === job.designer_id,
                );

                const payment = payments.find(
                  (item) => item.job_id === job.id,
                );

                return (
                  <JobCard
                    key={job.id}
                    job={job}
                    designer={designer}
                    payment={payment}
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

function RequestOverviewPanel({ request }: { request: RequestRow }) {
  return (
    <SurfaceCard className="p-6">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
        Original request
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill tone="neutral">
          {getSafeCategoryLabel(request.category)}
        </StatusPill>

        <StatusPill tone="info">
          {getSafeIndustryLabel(request.industry)}
        </StatusPill>

        <StatusPill tone={getRequestStatusView(request.status).tone}>
          {getRequestStatusView(request.status).label}
        </StatusPill>
      </div>

      <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
        {request.title}
      </h2>

      <p className="mt-2 text-base font-bold text-blue-700">
        {request.business_name}
      </p>

      <p className="mt-5 text-sm font-medium leading-7 text-slate-600">
        {request.description}
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
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
          value={request.deadline ? formatDateVi(request.deadline) : "Chưa có"}
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

      {request.preferred_styles && request.preferred_styles.length > 0 ? (
        <div className="mt-5 rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            <Palette className="size-4" />
            Preferred styles
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {request.preferred_styles.map((style) => (
              <StatusPill key={style} tone="neutral">
                {getSafeStyleLabel(style)}
              </StatusPill>
            ))}
          </div>
        </div>
      ) : null}
    </SurfaceCard>
  );
}

function FinalBriefPanel({
  brief,
  adminBrief,
  isConfirmed,
}: {
  brief: AiBriefRow;
  adminBrief: AdminBriefDisplay;
  isConfirmed: boolean;
}) {
  return (
    <SurfaceCard variant="dark" className="p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/70">
            Final brief
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-white">
            Brief dùng cho matching & job
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusPill tone={isConfirmed ? "success" : "warning"}>
            {isConfirmed ? "Brief đã chốt" : "Brief chưa chốt"}
          </StatusPill>

          <StatusPill tone={brief.risk_level === "low" ? "success" : "warning"}>
            {`Risk: ${brief.risk_level}`}
          </StatusPill>
        </div>
      </div>

      <DarkBlock label="Project title" value={adminBrief.project_title} />
      <DarkBlock label="Business context" value={adminBrief.business_context} />
      <DarkBlock label="Design objective" value={adminBrief.design_objective} />
      <DarkBlock label="Target audience" value={adminBrief.target_audience} />
      <DarkBlock label="Key message" value={adminBrief.key_message} />

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <DarkMetric
          label="Completeness"
          value={`${brief.brief_completeness_score}/100`}
        />

        <DarkMetric
          label="Deliverables"
          value={`${adminBrief.deliverables.length} đầu ra`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <DarkListBlock title="Deliverables" items={adminBrief.deliverables} />

        <DarkListBlock
          title="Content requirements"
          items={adminBrief.content_requirements}
        />

        <DarkListBlock
          title="Technical requirements"
          items={adminBrief.technical_requirements}
        />

        <DarkListBlock
          title="References to collect"
          items={adminBrief.references_to_collect}
        />
      </div>

      {adminBrief.product_specific_requirements.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
            Product specific requirements
          </p>

          <div className="mt-4 grid gap-3">
            {adminBrief.product_specific_requirements.map((section) => (
              <div
                key={section.section_title}
                className="rounded-xl border border-white/10 bg-white/[0.06] p-4"
              >
                <p className="text-sm font-black text-white">
                  {section.section_title}
                </p>

                <ul className="mt-3 grid gap-2">
                  {section.requirements.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-sm font-semibold leading-6 text-white/80"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
          Visual direction
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <DarkListBlock title="Mood" items={adminBrief.visual_direction.mood} />

          <DarkListBlock
            title="Style tags"
            items={adminBrief.visual_direction.style_tags}
          />

          <DarkListBlock
            title="Color direction"
            items={adminBrief.visual_direction.color_direction}
          />

          <DarkBlock
            label="Typography"
            value={adminBrief.visual_direction.typography_direction}
          />

          <DarkBlock
            label="Layout"
            value={adminBrief.visual_direction.layout_direction}
          />

          <DarkBlock
            label="Image"
            value={adminBrief.visual_direction.image_direction}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
          Layout hierarchy
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <DarkListBlock
            title="Priority order"
            items={adminBrief.layout_hierarchy.priority_order}
          />

          <DarkBlock
            label="Composition notes"
            value={adminBrief.layout_hierarchy.composition_notes}
          />

          <DarkBlock
            label="Readability notes"
            value={adminBrief.layout_hierarchy.readability_notes}
          />

          <DarkBlock
            label="Print/platform notes"
            value={adminBrief.layout_hierarchy.print_or_platform_notes}
          />
        </div>
      </div>

      {adminBrief.designer_notes ? (
        <DarkBlock label="Designer notes" value={adminBrief.designer_notes} />
      ) : null}

      {brief.risk_notes && brief.risk_notes.length > 0 ? (
        <DarkListBlock title="Risk notes" items={brief.risk_notes} />
      ) : null}
    </SurfaceCard>
  );
}

function AdminMatchCard({
  match,
  aiScore,
  designer,
  portfolioItems,
  job,
}: {
  match: MatchRow;
  aiScore?: AiDesignerMatchScoreRow;
  designer?: DesignerRow;
  portfolioItems: PortfolioRow[];
  job?: JobRow;
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
  const evidenceItems = normalizeEvidence(aiScore?.matched_portfolio_evidence);
  const specialties = designer.specialties ?? [];
  const styles = designer.styles ?? [];

  return (
    <div className="rounded-[1.35rem] border border-blue-100 bg-blue-50/65 p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <ScorePill score={matchScore} />

            <RatingPill rating={designer.rating ?? 0} />

            <StatusPill tone={getVerificationTone(designer.verification_status)}>
              {getVerificationLabel(designer.verification_status)}
            </StatusPill>

            {aiScore?.not_same_style_but_same_vibe ? (
              <StatusPill tone="info">Same vibe</StatusPill>
            ) : null}

            {job ? (
              <StatusPill tone="success">Được chọn thành job</StatusPill>
            ) : (
              <StatusPill tone="neutral">Chưa được chọn</StatusPill>
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
                {designer.bio || "Designer này chưa cập nhật bio đầy đủ."}
              </p>
            </div>
          </div>
        </div>

        {job ? (
          <Button
            asChild
            className="w-fit shrink-0 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
          >
            <Link href={`/admin/jobs/${job.id}`}>
              Mở job
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        ) : null}
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

      {aiScore ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <ScoreBox label="Portfolio fit" score={aiScore.portfolio_fit_score} />
          <ScoreBox label="Style fit" score={aiScore.style_fit_score} />
          <ScoreBox label="Vibe fit" score={aiScore.vibe_fit_score} />
          <ScoreBox
            label="Industry fit"
            score={aiScore.industry_context_fit_score}
          />
          <ScoreBox label="Budget fit" score={aiScore.budget_fit_score} />
        </div>
      ) : null}

      <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
          <Sparkles className="size-4" />
          Lý do matching
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
            Match này chưa có lý do lưu trong hệ thống.
          </p>
        )}
      </div>

      {riskFlags.length > 0 ? (
        <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-amber-700">
            <TriangleAlert className="size-4" />
            Risk flags
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {riskFlags.map((item) => (
              <p
                key={item}
                className="rounded-2xl border border-amber-200 bg-white/80 p-3 text-sm font-semibold leading-6 text-amber-950"
              >
                {item}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {evidenceItems.length > 0 ? (
        <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
            <FileText className="size-4" />
            AI portfolio evidence
          </div>

          <div className="mt-4 grid gap-2">
            {evidenceItems.slice(0, 5).map((item) => (
              <p
                key={item}
                className="rounded-2xl border border-blue-100 bg-blue-50/65 p-3 text-sm font-medium leading-6 text-slate-700"
              >
                {item}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <MiniTagPanel
          title="Specialties"
          icon={<Sparkles className="size-4" />}
          items={specialties}
          emptyText="Designer chưa khai báo specialties."
        />

        <MiniTagPanel
          title="Visual styles"
          icon={<Palette className="size-4" />}
          items={styles}
          emptyText="Designer chưa khai báo visual styles."
        />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
              Portfolio preview
            </p>

            <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
              Portfolio giúp admin đánh giá matching có hợp lý hay không.
            </p>
          </div>

          <StatusPill tone="info">{`${portfolioItems.length} items`}</StatusPill>
        </div>

        {portfolioItems.length === 0 ? (
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

function JobCard({
  job,
  designer,
  payment,
}: {
  job: JobRow;
  designer?: DesignerRow;
  payment?: PaymentRow;
}) {
  const jobStatus = getJobStatusView(job.status);
  const paymentStatus = getPaymentStatusView(payment?.status ?? null);

  return (
    <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-5">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone={jobStatus.tone}>{jobStatus.label}</StatusPill>
        <StatusPill tone={paymentStatus.tone}>{paymentStatus.label}</StatusPill>
      </div>

      <h3 className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
        {job.title}
      </h3>

      <p className="mt-2 text-sm font-bold text-blue-700">
        {designer?.display_name ?? "Designer unknown"}
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <InfoBox
          icon={<CircleDollarSign className="size-4" />}
          label="Agreed price"
          value={formatCurrencyVnd(job.agreed_price_vnd)}
        />

        <InfoBox
          icon={<CreditCard className="size-4" />}
          label="Payment"
          value={payment ? formatCurrencyVnd(payment.amount_vnd) : "Chưa có"}
        />

        <InfoBox
          icon={<WalletCards className="size-4" />}
          label="Platform fee"
          value={formatCurrencyVnd(
            Number(payment?.platform_fee_vnd ?? job.platform_fee_vnd ?? 0),
          )}
        />

        <InfoBox
          icon={<Banknote className="size-4" />}
          label="Designer revenue"
          value={formatCurrencyVnd(
            Number(
              payment?.designer_revenue_vnd ?? job.designer_revenue_vnd ?? 0,
            ),
          )}
        />
      </div>

      <Button
        asChild
        className="mt-5 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
      >
        <Link href={`/admin/jobs/${job.id}`}>
          Mở job
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </Button>
    </div>
  );
}

function PortfolioPreviewCard({ item }: { item: PortfolioRow }) {
  const aiStatus = getAiStatusView(item.ai_analysis_status);

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
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="neutral">
            {getSafeCategoryLabel(item.category)}
          </StatusPill>

          <StatusPill tone={aiStatus.tone}>{aiStatus.label}</StatusPill>
        </div>

        <h4 className="mt-3 text-sm font-extrabold leading-6 text-[#061a3a]">
          {item.title}
        </h4>

        {item.ai_visual_summary ? (
          <p className="mt-2 line-clamp-3 text-xs font-medium leading-5 text-slate-500">
            {item.ai_visual_summary}
          </p>
        ) : null}

        {item.ai_style_tags && item.ai_style_tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.ai_style_tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-blue-50 px-2 py-1 text-[0.65rem] font-bold text-blue-700"
              >
                {tag}
              </span>
            ))}
          </div>
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
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-white p-5">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {icon}
        {title}
      </div>

      {items.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item) => (
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

function ScoreBox({
  label,
  score,
}: {
  label: string;
  score: number | null;
}) {
  const value = Number(score ?? 0);

  return (
    <div className="rounded-[1.1rem] border border-blue-100 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#061a3a]">
        {value}/100
      </p>
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

function DarkSignalBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-white/10 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-sky-200/75">
        {icon}
        {label}
      </div>

      <p className="mt-2 text-sm font-extrabold leading-6 text-white">
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

function DarkBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-white">
        {value || "Chưa có"}
      </p>
    </div>
  );
}

function DarkListBlock({ title, items }: { title: string; items: string[] }) {
  const realItems = items.filter(Boolean);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
        {title}
      </p>

      {realItems.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {realItems.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-sm font-semibold leading-6 text-white/85"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-white/55">
          Chưa có dữ liệu.
        </p>
      )}
    </div>
  );
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
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
      {`${label}: ${Math.round(score)}`}
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

function normalizeAdminBrief(brief: AiBriefRow): AdminBriefDisplay {
  const finalBriefJson = asRecord(brief.final_brief_json);
  const editedBriefJson = asRecord(brief.customer_edited_brief_json);
  const generatedBriefJson = asRecord(brief.brief_json);

  const source =
    Object.keys(finalBriefJson).length > 0
      ? finalBriefJson
      : Object.keys(editedBriefJson).length > 0
        ? editedBriefJson
        : generatedBriefJson;

  const visualDirection = asRecord(source.visual_direction);
  const layoutHierarchy = asRecord(source.layout_hierarchy);

  return {
    project_title: stringValue(
      source.project_title ?? brief.project_title,
      "Brief thiết kế",
    ),
    business_context: stringValue(
      source.business_context ?? brief.business_context,
      "",
    ),
    design_objective: stringValue(
      source.design_objective ?? brief.design_objective ?? brief.objective,
      "",
    ),
    target_audience: stringValue(
      source.target_audience ?? brief.target_audience,
      "",
    ),
    key_message: stringValue(source.key_message ?? brief.key_message, ""),
    deliverables:
      stringArray(source.deliverables).length > 0
        ? stringArray(source.deliverables)
        : brief.deliverables ?? [],
    product_specific_requirements: normalizeProductSpecificSections(
      source.product_specific_requirements,
    ),
    visual_direction: {
      mood: stringArray(visualDirection.mood),
      style_tags: stringArray(visualDirection.style_tags),
      color_direction: stringArray(visualDirection.color_direction),
      typography_direction: stringValue(
        visualDirection.typography_direction,
        "",
      ),
      layout_direction: stringValue(visualDirection.layout_direction, ""),
      image_direction: stringValue(visualDirection.image_direction, ""),
    },
    layout_hierarchy: {
      priority_order: stringArray(layoutHierarchy.priority_order),
      composition_notes: stringValue(layoutHierarchy.composition_notes, ""),
      readability_notes: stringValue(layoutHierarchy.readability_notes, ""),
      print_or_platform_notes: stringValue(
        layoutHierarchy.print_or_platform_notes,
        "",
      ),
    },
    content_requirements:
      stringArray(source.content_requirements).length > 0
        ? stringArray(source.content_requirements)
        : brief.content_requirements ?? [],
    technical_requirements:
      stringArray(source.technical_requirements).length > 0
        ? stringArray(source.technical_requirements)
        : brief.technical_requirements ?? [],
    references_to_collect:
      stringArray(source.references_to_collect).length > 0
        ? stringArray(source.references_to_collect)
        : brief.references_to_collect ?? [],
    designer_notes: stringValue(
      source.designer_notes ?? brief.designer_notes,
      "",
    ),
  };
}

function normalizeProductSpecificSections(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);

      return {
        section_title: stringValue(record.section_title, "Yêu cầu thiết kế"),
        requirements: stringArray(record.requirements),
      };
    })
    .filter(
      (item) =>
        item.section_title.trim().length > 0 ||
        item.requirements.length > 0,
    );
}

function normalizeEvidence(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      const record = asRecord(item);

      return stringValue(
        record.summary ??
          record.reason ??
          record.visual_summary ??
          record.portfolio_title ??
          record.title,
        "",
      );
    })
    .filter(Boolean);
}

function buildRequestWarnings({
  request,
  brief,
  briefConfirmed,
  matches,
  jobs,
  payments,
}: {
  request: RequestRow;
  brief: AiBriefRow | null;
  briefConfirmed: boolean;
  matches: MatchRow[];
  jobs: JobRow[];
  payments: PaymentRow[];
}) {
  const warnings: string[] = [];

  if (!brief) {
    warnings.push("Request chưa có AI brief.");
  }

  if (brief && !briefConfirmed) {
    warnings.push("AI brief chưa có tín hiệu customer đã xác nhận.");
  }

  if (matches.length === 0) {
    warnings.push("Request chưa có designer matching.");
  }

  if (request.status === "matched" && jobs.length === 0) {
    warnings.push("Request đã matched nhưng chưa tạo job.");
  }

  if (jobs.length > 0 && payments.length === 0) {
    warnings.push("Request đã có job nhưng chưa có payment.");
  }

  if (
    payments.some(
      (payment) =>
        !["paid", "confirmed", "completed", "succeeded"].includes(
          payment.status,
        ),
    )
  ) {
    warnings.push("Có payment chưa được xác nhận.");
  }

  return warnings;
}

function getTopMatchScore(
  matches: MatchRow[],
  aiScores: AiDesignerMatchScoreRow[],
) {
  const scores = [
    ...matches.map((match) => Number(match.match_score ?? 0)),
    ...aiScores.map((score) => Number(score.match_score ?? 0)),
  ];

  return scores.length > 0 ? Math.max(...scores) : 0;
}

function isBriefConfirmed(request: RequestRow, brief?: AiBriefRow | null) {
  return (
    request.brief_review_status === "confirmed" ||
    Boolean(request.brief_confirmed_at) ||
    brief?.status === "confirmed" ||
    Boolean(brief?.confirmed_at) ||
    Object.keys(asRecord(brief?.final_brief_json)).length > 0
  );
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function stringValue(value: unknown, fallback = "") {
  if (typeof value === "string") {
    const cleaned = value.trim();

    return cleaned.length > 0 ? cleaned : fallback;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function getScoreView(score: number) {
  if (score >= 80) {
    return {
      className: "border-emerald-200 bg-emerald-100 text-emerald-700",
    };
  }

  if (score >= 60) {
    return {
      className: "border-blue-200 bg-blue-100 text-blue-700",
    };
  }

  if (score >= 40) {
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
    };
  }

  if (status === "matched") {
    return {
      label: "Đã matching",
      tone: "success" as const,
    };
  }

  if (status === "brief_confirmed") {
    return {
      label: "Brief đã chốt",
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
      label: "Job hoàn thành",
      tone: "success" as const,
    };
  }

  if (status === "active") {
    return {
      label: "Job đang làm",
      tone: "info" as const,
    };
  }

  if (status === "payment_pending") {
    return {
      label: "Job chờ thanh toán",
      tone: "warning" as const,
    };
  }

  if (status === "cancelled") {
    return {
      label: "Job đã hủy",
      tone: "warning" as const,
    };
  }

  return {
    label: status,
    tone: "neutral" as const,
  };
}

function getPaymentStatusView(status: string | null) {
  if (!status) {
    return {
      label: "Chưa có payment",
      tone: "neutral" as const,
    };
  }

  if (["paid", "confirmed", "completed", "succeeded"].includes(status)) {
    return {
      label: "Payment đã xác nhận",
      tone: "success" as const,
    };
  }

  if (["pending", "waiting", "submitted", "waiting_transfer"].includes(status)) {
    return {
      label: "Payment chờ duyệt",
      tone: "warning" as const,
    };
  }

  if (status === "rejected") {
    return {
      label: "Payment bị từ chối",
      tone: "warning" as const,
    };
  }

  return {
    label: status,
    tone: "neutral" as const,
  };
}

function getVerificationLabel(status: string | null) {
  if (status === "approved" || status === "verified") return "Đã duyệt";
  if (status === "rejected") return "Từ chối";
  if (status === "in_review") return "Đang duyệt";
  return "Chờ duyệt";
}

function getVerificationTone(status: string | null) {
  if (status === "approved" || status === "verified") return "success" as const;
  if (status === "rejected") return "warning" as const;
  if (status === "in_review") return "info" as const;
  return "warning" as const;
}

function getAiStatusView(status: string | null) {
  if (status === "completed") {
    return {
      label: "AI analyzed",
      tone: "success" as const,
    };
  }

  if (status === "failed") {
    return {
      label: "AI failed",
      tone: "warning" as const,
    };
  }

  if (status === "processing" || status === "pending") {
    return {
      label: "AI processing",
      tone: "info" as const,
    };
  }

  return {
    label: "Not analyzed",
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

function getSafeStyleLabel(style: string) {
  try {
    return getStyleLabel(style as Parameters<typeof getStyleLabel>[0]);
  } catch {
    return style;
  }
}