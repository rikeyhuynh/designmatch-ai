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
  request_id: string;
  objective: string;
  visual_direction: string;
  key_message: string | null;
  brief_completeness_score: number;
  created_at: string;
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
            objective,
            visual_direction,
            key_message,
            brief_completeness_score,
            created_at
          `,
          )
          .in("request_id", requestIds)
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

  const requests = (requestsResult.data ?? []) as unknown as RequestRow[];
  const briefs = (briefsResult.data ?? []) as unknown as AiBriefRow[];
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];

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

      return {
        request,
        match,
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
                Điểm match được tính dựa trên trạng thái đã duyệt, portfolio,
                ngành, hạng mục thiết kế, rating, job hoàn thành, thời gian phản
                hồi, minimum budget và dữ liệu Style DNA của bạn.
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
                tone={averageMatchScore > 0 && averageMatchScore < 60 ? "warning" : "normal"}
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
                Mỗi brief bên dưới cho biết bạn được match bao nhiêu điểm và vì
                sao hệ thống đề xuất bạn cho customer.
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
              {orderedRequests.map(({ request, match }) => {
                const brief = briefs.find(
                  (item) => item.request_id === request.id,
                );

                const job = jobs.find((item) => item.request_id === request.id);

                return (
                  <MatchedBriefCard
                    key={request.id}
                    request={request}
                    match={match}
                    brief={brief}
                    job={job}
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

function MatchedBriefCard({
  request,
  match,
  brief,
  job,
}: {
  request: RequestRow;
  match?: MatchRow;
  brief?: AiBriefRow;
  job?: JobRow;
}) {
  const requestStatus = getRequestStatusView(request.status);
  const jobStatus = job ? getJobStatusView(job.status) : null;
  const matchScore = Number(match?.match_score ?? 0);
  const matchReasons = match?.match_reasons ?? [];

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

      {brief ? (
        <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
            <Sparkles className="size-4" />
            AI brief summary
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <BriefBlock label="Objective" value={brief.objective} />

            <BriefBlock
              label="Visual direction"
              value={brief.visual_direction}
            />
          </div>

          {brief.key_message ? (
            <BriefBlock label="Key message" value={brief.key_message} />
          ) : null}

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {`Brief generated at ${formatDateVi(brief.created_at)}`}
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

function BriefBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/65 p-4">
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