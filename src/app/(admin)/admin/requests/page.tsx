import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Palette,
  Sparkles,
  Store,
  Target,
  UsersRound,
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
  preferred_styles: string[];
  status: string;
  created_at: string;
};

type AiBriefRow = {
  id: string;
  request_id: string;
};

type MatchRow = {
  id: string;
  request_id: string;
};

type JobRow = {
  id: string;
  request_id: string;
  status: string;
};

export default async function AdminRequestsPage() {
  const authState = await requireRole(["admin"]);
  const profile = authState.profile;

  if (!profile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const [requestsResult, briefsResult, matchesResult, jobsResult] =
    await Promise.all([
      adminSupabase
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
          preferred_styles,
          status,
          created_at
        `,
        )
        .order("created_at", { ascending: false }),

      adminSupabase.from("ai_briefs").select("id, request_id"),

      adminSupabase.from("designer_matches").select("id, request_id"),

      adminSupabase.from("jobs").select("id, request_id, status"),
    ]);

  const requests = (requestsResult.data ?? []) as unknown as RequestRow[];
  const briefs = (briefsResult.data ?? []) as unknown as AiBriefRow[];
  const matches = (matchesResult.data ?? []) as unknown as MatchRow[];
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];

  const briefRequestIds = new Set(briefs.map((brief) => brief.request_id));
  const matchedRequestIds = new Set(matches.map((match) => match.request_id));
  const jobRequestIds = new Set(jobs.map((job) => job.request_id));

  const totalRequests = requests.length;
  const withBrief = requests.filter((request) =>
    briefRequestIds.has(request.id),
  ).length;
  const withMatches = requests.filter((request) =>
    matchedRequestIds.has(request.id),
  ).length;
  const withJobs = requests.filter((request) => jobRequestIds.has(request.id))
    .length;

  const needsAttention = requests.filter(
    (request) =>
      !briefRequestIds.has(request.id) || !matchedRequestIds.has(request.id),
  ).length;

  return (
    <DashboardShell
      role="admin"
      title="Requests"
      description="Theo dõi toàn bộ yêu cầu thiết kế, AI brief, matching và trạng thái tạo job."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          requestsResult.error?.message,
          briefsResult.error?.message,
          matchesResult.error?.message,
          jobsResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total requests"
          value={`${totalRequests}`}
          description="Tổng yêu cầu đã tạo"
          icon={<FileText className="size-5" />}
          tone="dark"
        />

        <MetricCard
          label="AI briefs"
          value={`${withBrief}`}
          description="Request đã được AI chuẩn hóa"
          icon={<Sparkles className="size-5" />}
        />

        <MetricCard
          label="Matched"
          value={`${withMatches}`}
          description="Request đã có designer matches"
          icon={<UsersRound className="size-5" />}
        />

        <MetricCard
          label="Created jobs"
          value={`${withJobs}`}
          description="Request đã chuyển thành job"
          icon={<BriefcaseBusiness className="size-5" />}
          tone="success"
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Request pipeline
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                Luồng xử lý brief toàn hệ thống
              </h2>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                Admin dùng trang này để kiểm tra request nào đã có AI brief,
                request nào đã matching designer, và request nào đã được chuyển
                thành job thật.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <SignalBox
                icon={<Sparkles className="size-4" />}
                label="Need AI brief"
                value={`${totalRequests - withBrief} request chưa có brief`}
                tone={totalRequests - withBrief > 0 ? "warning" : "normal"}
              />

              <SignalBox
                icon={<UsersRound className="size-4" />}
                label="Need matching"
                value={`${totalRequests - withMatches} request chưa match`}
                tone={totalRequests - withMatches > 0 ? "warning" : "normal"}
              />

              <SignalBox
                icon={<Target className="size-4" />}
                label="Need attention"
                value={`${needsAttention} request cần kiểm tra`}
                tone={needsAttention > 0 ? "warning" : "normal"}
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
                Request list
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Danh sách request
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Mỗi request hiển thị đủ trạng thái AI brief, matching và job để
                admin nắm được tiến độ vận hành.
              </p>
            </div>

            <StatusPill tone="info">{`${totalRequests} requests`}</StatusPill>
          </div>

          {requests.length === 0 ? (
            <EmptyState
              title="Chưa có request nào."
              description="Khi customer tạo brief thiết kế, request sẽ hiển thị tại đây."
            />
          ) : (
            <div className="mt-6 grid gap-4">
              {requests.map((request) => (
                <AdminRequestCard
                  key={request.id}
                  request={request}
                  hasAiBrief={briefRequestIds.has(request.id)}
                  hasMatches={matchedRequestIds.has(request.id)}
                  hasJob={jobRequestIds.has(request.id)}
                  matchCount={
                    matches.filter((match) => match.request_id === request.id)
                      .length
                  }
                  jobCount={
                    jobs.filter((job) => job.request_id === request.id).length
                  }
                />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function AdminRequestCard({
  request,
  hasAiBrief,
  hasMatches,
  hasJob,
  matchCount,
  jobCount,
}: {
  request: RequestRow;
  hasAiBrief: boolean;
  hasMatches: boolean;
  hasJob: boolean;
  matchCount: number;
  jobCount: number;
}) {
  const requestStatus = getRequestStatusView(request.status);

  return (
    <div className="rounded-[1.35rem] border border-blue-100 bg-blue-50/65 p-5 transition hover:bg-blue-50">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={requestStatus.tone}>
              {requestStatus.label}
            </StatusPill>

            <StatusPill tone="neutral">
              {getCategoryLabel(
                request.category as Parameters<typeof getCategoryLabel>[0],
              )}
            </StatusPill>

            {hasAiBrief ? (
              <StatusPill tone="success">Đã có AI brief</StatusPill>
            ) : (
              <StatusPill tone="warning">Chưa có AI brief</StatusPill>
            )}

            {hasMatches ? (
              <StatusPill tone="success">{`${matchCount} matches`}</StatusPill>
            ) : (
              <StatusPill tone="warning">Chưa match</StatusPill>
            )}

            {hasJob ? (
              <StatusPill tone="success">{`${jobCount} job`}</StatusPill>
            ) : (
              <StatusPill tone="neutral">Chưa tạo job</StatusPill>
            )}
          </div>

          <h3 className="mt-4 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            {request.title}
          </h3>

          <p className="mt-2 text-sm font-bold text-blue-700">
            {request.business_name}
          </p>

          <p className="mt-3 line-clamp-2 max-w-4xl text-sm font-medium leading-7 text-slate-600">
            {request.description}
          </p>
        </div>

        <Button
          asChild
          className="w-fit shrink-0 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
        >
          <Link href={`/admin/requests/${request.id}`}>
            Xem chi tiết
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoBox
          icon={<Store className="size-4" />}
          label="Industry"
          value={getIndustryLabel(
            request.industry as Parameters<typeof getIndustryLabel>[0],
          )}
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

      <div className="mt-5 flex flex-wrap gap-2">
        {request.preferred_styles.map((style) => (
          <StatusPill key={style} tone="neutral">
            {getStyleLabel(style as Parameters<typeof getStyleLabel>[0])}
          </StatusPill>
        ))}
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
        <FileText className="size-6" />
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