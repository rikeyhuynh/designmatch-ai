import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  ImageIcon,
  Palette,
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
  created_at: string;
};

type AiBriefRow = {
  id: string;
  request_id: string;
  objective: string;
  visual_direction: string;
  key_message: string | null;
  brief_completeness_score: number;
  created_at: string;
};

type MatchRow = {
  id: string;
  request_id: string;
  designer_id: string;
  match_score: number;
  match_reasons: string[] | null;
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
  description: string | null;
  category: string;
  industry: string;
  image_url: string | null;
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

  const [briefResult, matchesResult, jobsResult] = await Promise.all([
    adminSupabase
      .from("ai_briefs")
      .select(
        `
        id,
        request_id,
        objective,
        visual_direction,
        key_message,
        brief_completeness_score,
        created_at
      `,
      )
      .eq("request_id", request.id)
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
  ]);

  const brief = briefResult.data as AiBriefRow | null;
  const matches = (matchesResult.data ?? []) as unknown as MatchRow[];
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];

  const designerIds = Array.from(
    new Set(matches.map((match) => match.designer_id)),
  );

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
            description,
            category,
            industry,
            image_url,
            created_at
          `,
          )
          .in("designer_id", designerIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  const designers = (designersResult.data ?? []) as unknown as DesignerRow[];
  const portfolioItems = (portfolioResult.data ?? []) as unknown as PortfolioRow[];

  const selectedJob = jobs[0];
  const topMatchScore =
    matches.length > 0
      ? Math.max(...matches.map((match) => Number(match.match_score ?? 0)))
      : 0;

  const requestStatus = getRequestStatusView(request.status);

  return (
    <DashboardShell
      role="customer"
      title="Chi tiết request"
      description="Xem brief, designer match, điểm phù hợp và tạo job từ request này."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          briefResult.error?.message,
          matchesResult.error?.message,
          jobsResult.error?.message,
          designersResult.error?.message,
          portfolioResult.error?.message,
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
          label="Budget"
          value={formatCurrencyVnd(request.budget_max_vnd)}
          description="Ngân sách tối đa"
          icon={<WalletCards className="size-5" />}
          tone="dark"
        />

        <MetricCard
          label="Matches"
          value={`${matches.length}`}
          description="Designer được đề xuất"
          icon={<Sparkles className="size-5" />}
          tone={matches.length > 0 ? "success" : "normal"}
        />

        <MetricCard
          label="Top score"
          value={`${topMatchScore}`}
          description="Điểm match cao nhất"
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
                <GenerateMatchesButton requestId={request.id} />

                {selectedJob ? <OpenJobButton jobId={selectedJob.id} /> : null}
              </div>
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
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <SurfaceCard className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            AI brief
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Brief đã chuẩn hóa
          </h2>

          {brief ? (
            <div className="mt-5 grid gap-4">
              <BriefBlock label="Objective" value={brief.objective} />

              <BriefBlock
                label="Visual direction"
                value={brief.visual_direction}
              />

              {brief.key_message ? (
                <BriefBlock label="Key message" value={brief.key_message} />
              ) : null}

              <div className="rounded-[1.1rem] border border-blue-100 bg-blue-50/65 p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                  <CheckCircle2 className="size-4" />
                  Completeness
                </div>

                <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#061a3a]">
                  {brief.brief_completeness_score}/100
                </p>

                <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  {`Generated ${formatDateVi(brief.created_at)}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-medium leading-7 text-amber-950">
                Request này chưa có AI brief. Hãy bấm “Tạo lại AI brief” để hệ
                thống chuẩn hóa thông tin trước khi matching designer.
              </p>
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Designer matches
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Designer được đề xuất
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Designer có điểm càng cao thì càng phù hợp. Bạn có thể xem lý do
                đề xuất trước khi chọn designer để tạo job.
              </p>
            </div>

            <StatusPill tone="info">{`${matches.length} matches`}</StatusPill>
          </div>

          {matches.length === 0 ? (
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

                return (
                  <DesignerMatchCard
                    key={match.id}
                    requestId={request.id}
                    match={match}
                    designer={designer}
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

function DesignerMatchCard({
  requestId,
  match,
  designer,
  portfolioItems,
  job,
  hasAnyJob,
}: {
  requestId: string;
  match: MatchRow;
  designer?: DesignerRow;
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

  const matchScore = Number(match.match_score ?? 0);
  const matchReasons = match.match_reasons ?? [];
  const specialties = designer.specialties ?? [];
  const styles = designer.styles ?? [];

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
            để cập nhật dữ liệu.
          </p>
        )}
      </div>

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
              Một số portfolio gần đây của designer này.
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

function PortfolioPreviewCard({ item }: { item: PortfolioRow }) {
  return (
    <div className="overflow-hidden rounded-[1.1rem] border border-blue-100 bg-white">
      <div className="grid aspect-[4/3] place-items-center bg-blue-50">
        {item.image_url ? (
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

function BriefBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-blue-100 bg-blue-50/65 p-4">
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

function RatingPill({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-amber-700">
      <Star className="size-3.5 fill-current" />
      {rating}/5
    </div>
  );
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