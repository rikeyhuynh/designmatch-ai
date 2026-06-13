import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
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
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel } from "@/lib/domain/labels";
import { formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

export default async function CustomerMatchesPage() {
  const authState = await requireRole(["customer"]);
  const profile = authState.profile;
  const customerProfile = authState.customerProfile;

  if (!profile || !customerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const requestsResult = await adminSupabase
    .from("design_requests")
    .select("id, title, business_name, category, status, created_at")
    .eq("customer_id", customerProfile.id)
    .order("created_at", { ascending: false });

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
            match_reasons
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

  const requestsWithMatches = requests.filter((request) =>
    matches.some((match) => match.request_id === request.id),
  );

  const totalMatches = matches.length;
  const matchedRequests = requestsWithMatches.length;
  const requestsWithoutMatches = requests.length - matchedRequests;
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
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requests"
          value={`${requests.length}`}
          description="Tổng request của bạn"
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
          value={`${topMatchScore}`}
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
                Designer phù hợp với brief của bạn
              </h2>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                Mỗi designer được đề xuất dựa trên trạng thái đã duyệt, portfolio,
                ngành, hạng mục thiết kế, rating, số job hoàn thành, thời gian
                phản hồi và mức budget tối thiểu.
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
                value={`${averageMatchScore} điểm trung bình`}
                tone={averageMatchScore > 0 && averageMatchScore < 60 ? "warning" : "normal"}
              />

              <SignalBox
                icon={<BriefcaseBusiness className="size-4" />}
                label="Converted"
                value={`${requestsWithJobs} request đã tạo job`}
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
                Designer có điểm càng cao thì càng phù hợp với brief hiện tại.
                Lý do match giúp bạn hiểu vì sao hệ thống đề xuất designer đó.
              </p>
            </div>

            <StatusPill tone="info">{`${totalMatches} matches`}</StatusPill>
          </div>

          {requests.length === 0 ? (
            <EmptyState
              title="Bạn chưa có request nào."
              description="Hãy tạo brief đầu tiên để AI có thể đề xuất designer phù hợp."
              href="/customer/requests/new"
              buttonLabel="Tạo brief AI"
            />
          ) : requestsWithMatches.length === 0 ? (
            <EmptyState
              title="Chưa có designer match."
              description="Hãy mở request đã tạo và bấm tạo matching để hệ thống đề xuất designer."
              href="/customer/requests"
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

                return (
                  <RequestMatchGroup
                    key={request.id}
                    request={request}
                    matches={requestMatches}
                    designers={designers}
                    jobs={requestJobs}
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
}: {
  request: RequestRow;
  matches: MatchRow[];
  designers: DesignerRow[];
  jobs: JobRow[];
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

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {matches.map((match) => {
          const designer = designers.find(
            (item) => item.id === match.designer_id,
          );

          const jobForDesigner = jobs.find(
            (job) => job.designer_id === match.designer_id,
          );

          return (
            <DesignerMatchCard
              key={match.id}
              match={match}
              designer={designer}
              hasJob={Boolean(jobForDesigner)}
              jobId={jobForDesigner?.id}
            />
          );
        })}
      </div>
    </div>
  );
}

function DesignerMatchCard({
  match,
  designer,
  hasJob,
  jobId,
}: {
  match: MatchRow;
  designer?: DesignerRow;
  hasJob: boolean;
  jobId?: string;
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

      <div className="mt-5 rounded-[1.1rem] border border-blue-100 bg-blue-50/65 p-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
          <Sparkles className="size-4" />
          Lý do đề xuất
        </div>

        {matchReasons.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {matchReasons.slice(0, 6).map((reason) => (
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

      {jobId ? (
        <Button
          asChild
          variant="outline"
          className="mt-5 rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href={`/customer/jobs/${jobId}`}>
            Xem job
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      ) : null}
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
      {rating}/5
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

function getAvailabilityLabel(status: string | null) {
  if (status === "available" || status === "open") return "Đang nhận job";
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