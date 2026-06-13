import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  MessageSquareText,
  Plus,
  Sparkles,
  Star,
  Store,
  Target,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import {
  getCategoryLabel,
  getJobStatusMeta,
  getPaymentStatusMeta,
} from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RequestRow = {
  id: string;
  title: string;
  business_name: string;
  category: string;
  status: string;
  budget_min_vnd: number;
  budget_max_vnd: number;
  deadline: string | null;
  created_at: string;
};

type JobRow = {
  id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  designer_profiles: {
    display_name: string;
    headline: string | null;
    rating: number;
  } | null;
  design_requests: {
    id: string;
    business_name: string;
    category: string;
  } | null;
  payments: {
    id: string;
    amount_vnd: number;
    status: string;
    transfer_note: string;
  } | null;
};

type AiBriefRow = {
  id: string;
  request_id: string;
};

type ReviewRow = {
  id: string;
  job_id: string;
  rating: number;
};

export default async function CustomerDashboardPage() {
  const authState = await requireRole(["customer"]);
  const profile = authState.profile;
  const customerProfile = authState.customerProfile;

  if (!profile || !customerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const [requestsResult, jobsResult, briefsResult, reviewsResult] =
    await Promise.all([
      adminSupabase
        .from("design_requests")
        .select(
          "id, title, business_name, category, status, budget_min_vnd, budget_max_vnd, deadline, created_at",
        )
        .eq("customer_id", customerProfile.id)
        .order("created_at", { ascending: false }),

      adminSupabase
        .from("jobs")
        .select(
          `
          id,
          title,
          status,
          agreed_price_vnd,
          due_at,
          completed_at,
          created_at,
          designer_profiles (
            display_name,
            headline,
            rating
          ),
          design_requests (
            id,
            business_name,
            category
          ),
          payments (
            id,
            amount_vnd,
            status,
            transfer_note
          )
        `,
        )
        .eq("customer_id", customerProfile.id)
        .order("created_at", { ascending: false }),

      adminSupabase
        .from("ai_briefs")
        .select("id, request_id"),

      adminSupabase
        .from("job_reviews")
        .select("id, job_id, rating")
        .eq("customer_id", customerProfile.id),
    ]);

  const requests = (requestsResult.data ?? []) as unknown as RequestRow[];
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];
  const briefs = (briefsResult.data ?? []) as unknown as AiBriefRow[];
  const reviews = (reviewsResult.data ?? []) as unknown as ReviewRow[];

  const requestIds = new Set(requests.map((request) => request.id));
  const briefRequestIds = new Set(
    briefs
      .filter((brief) => requestIds.has(brief.request_id))
      .map((brief) => brief.request_id),
  );
  const reviewedJobIds = new Set(reviews.map((review) => review.job_id));

  const totalRequests = requests.length;
  const aiBriefCount = requests.filter((request) =>
    briefRequestIds.has(request.id),
  ).length;
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((job) => job.status === "active").length;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const paymentPendingJobs = jobs.filter(
    (job) => job.status === "payment_pending",
  ).length;
  const completedWithoutReview = jobs.filter(
    (job) => job.status === "completed" && !reviewedJobIds.has(job.id),
  ).length;

  const totalPaid = jobs.reduce((total, job) => {
    const payment = job.payments;
    if (!payment) return total;

    if (["confirmed", "paid", "succeeded"].includes(payment.status)) {
      return total + Number(payment.amount_vnd ?? 0);
    }

    return total;
  }, 0);

  const latestRequests = requests.slice(0, 4);
  const latestJobs = jobs.slice(0, 4);

  return (
    <DashboardShell
      role="customer"
      title="Tổng quan"
      description="Theo dõi request, AI brief, job, payment và tiến độ thiết kế của bạn."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          requestsResult.error?.message,
          jobsResult.error?.message,
          briefsResult.error?.message,
          reviewsResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requests"
          value={`${totalRequests}`}
          description="Tổng brief bạn đã tạo"
          icon={<FileText className="size-5" />}
          href="/customer/requests"
          tone="dark"
        />

        <MetricCard
          label="AI briefs"
          value={`${aiBriefCount}`}
          description="Request đã được AI chuẩn hóa"
          icon={<Sparkles className="size-5" />}
          href="/customer/requests"
        />

        <MetricCard
          label="Active jobs"
          value={`${activeJobs}`}
          description="Job đang được designer thực hiện"
          icon={<BriefcaseBusiness className="size-5" />}
          href="/customer/jobs"
          tone="success"
        />

        <MetricCard
          label="Total paid"
          value={formatCurrencyVnd(totalPaid)}
          description="Tổng thanh toán đã xác nhận"
          icon={<CircleDollarSign className="size-5" />}
          href="/customer/jobs"
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Customer workspace
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                Không gian quản lý thiết kế của bạn
              </h2>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                Từ đây bạn có thể tạo brief mới, theo dõi job đang làm, xem ảnh
                tiến độ designer gửi và đánh giá designer sau khi hoàn thành.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
                >
                  <Link href="/customer/requests/new">
                    <Plus className="mr-2 size-4" />
                    Tạo brief mới
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-blue-200 bg-white font-extrabold"
                >
                  <Link href="/customer/jobs">
                    Xem job của tôi
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <SignalBox
                icon={<CreditCard className="size-4" />}
                label="Payment pending"
                value={`${paymentPendingJobs} job chờ thanh toán`}
                tone={paymentPendingJobs > 0 ? "warning" : "normal"}
              />

              <SignalBox
                icon={<CheckCircle2 className="size-4" />}
                label="Completed"
                value={`${completedJobs} job hoàn thành`}
              />

              <SignalBox
                icon={<Star className="size-4" />}
                label="Need review"
                value={`${completedWithoutReview} job cần đánh giá`}
                tone={completedWithoutReview > 0 ? "warning" : "normal"}
              />
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Latest requests
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Brief gần đây
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Các request thiết kế mới nhất bạn đã tạo.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-fit rounded-full border-blue-200 bg-white font-extrabold"
            >
              <Link href="/customer/requests">
                Xem tất cả
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          {latestRequests.length === 0 ? (
            <EmptyState
              title="Chưa có request nào."
              description="Hãy tạo brief đầu tiên để AI chuẩn hóa yêu cầu thiết kế."
              actionHref="/customer/requests/new"
              actionLabel="Tạo brief AI"
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestRequests.map((request) => (
                <LatestRequestCard
                  key={request.id}
                  request={request}
                  hasAiBrief={briefRequestIds.has(request.id)}
                />
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Latest jobs
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Job gần đây
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Theo dõi payment, tiến độ và designer đang thực hiện.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-fit rounded-full border-blue-200 bg-white font-extrabold"
            >
              <Link href="/customer/jobs">
                Xem job
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          {latestJobs.length === 0 ? (
            <EmptyState
              title="Chưa có job nào."
              description="Sau khi chọn designer từ kết quả matching, job sẽ xuất hiện tại đây."
              actionHref="/customer/requests"
              actionLabel="Xem request"
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestJobs.map((job) => (
                <LatestJobCard
                  key={job.id}
                  job={job}
                  hasReview={reviewedJobIds.has(job.id)}
                />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Recommended next action
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Việc nên làm tiếp theo
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Hệ thống gợi ý hành động dựa trên trạng thái hiện tại của request
                và job.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <ActionCard
              icon={<Sparkles className="size-5" />}
              title="Tạo brief mới"
              description="Dùng AI để chuẩn hóa nhu cầu thiết kế cho thương hiệu."
              href="/customer/requests/new"
              buttonLabel="Tạo brief"
            />

            <ActionCard
              icon={<BriefcaseBusiness className="size-5" />}
              title="Theo dõi tiến độ"
              description="Xem ảnh mockup, bản nháp và feedback với designer."
              href="/customer/jobs"
              buttonLabel="Xem job"
            />

            <ActionCard
              icon={<Star className="size-5" />}
              title="Đánh giá designer"
              description="Sau khi job hoàn thành, hãy đánh giá để cải thiện matching."
              href="/customer/jobs"
              buttonLabel="Đánh giá"
            />
          </div>
        </SurfaceCard>
      </section>
    </DashboardShell>
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
  href,
  tone = "normal",
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  href: string;
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
    <Link href={href} className={`rounded-[1.35rem] border p-5 ${cardClass}`}>
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
    </Link>
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

function LatestRequestCard({
  request,
  hasAiBrief,
}: {
  request: RequestRow;
  hasAiBrief: boolean;
}) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="neutral">
          {getCategoryLabel(request.category as Parameters<typeof getCategoryLabel>[0])}
        </StatusPill>

        {hasAiBrief ? (
          <StatusPill tone="success">Đã có AI brief</StatusPill>
        ) : (
          <StatusPill tone="warning">Chưa có AI brief</StatusPill>
        )}
      </div>

      <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
        {request.title}
      </h3>

      <p className="mt-1 text-sm font-bold text-blue-700">
        {request.business_name}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MiniInfo
          label="Budget"
          value={`${formatCurrencyVnd(request.budget_min_vnd)} - ${formatCurrencyVnd(
            request.budget_max_vnd,
          )}`}
        />

        <MiniInfo
          label="Deadline"
          value={request.deadline ? formatDateVi(request.deadline) : "Chưa có"}
        />

        <MiniInfo label="Created" value={formatDateVi(request.created_at)} />
      </div>

      <Button
        asChild
        variant="outline"
        className="mt-4 rounded-full border-blue-200 bg-white font-extrabold"
      >
        <Link href={`/customer/requests/${request.id}`}>
          Mở request
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </Button>
    </div>
  );
}

function LatestJobCard({
  job,
  hasReview,
}: {
  job: JobRow;
  hasReview: boolean;
}) {
  const jobStatus = getSafeJobStatusMeta(job.status);

  const paymentStatus = job.payments
    ? getPaymentStatusMeta(
        job.payments.status as Parameters<typeof getPaymentStatusMeta>[0],
      )
    : null;

  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone={jobStatus.tone}>{jobStatus.label}</StatusPill>

        {paymentStatus ? (
          <StatusPill tone={paymentStatus.tone}>
            {paymentStatus.label}
          </StatusPill>
        ) : null}

        {hasReview ? <StatusPill tone="success">Đã đánh giá</StatusPill> : null}
      </div>

      <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
        {job.title}
      </h3>

      <p className="mt-1 text-sm font-bold text-blue-700">
        Designer: {job.designer_profiles?.display_name ?? "Chưa rõ"}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MiniInfo
          label="Price"
          value={formatCurrencyVnd(job.agreed_price_vnd)}
        />

        <MiniInfo
          label="Due"
          value={job.due_at ? formatDateVi(job.due_at) : "Chưa có"}
        />

        <MiniInfo
          label="Rating"
          value={
            job.designer_profiles
              ? `${job.designer_profiles.rating}/5`
              : "N/A"
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          asChild
          className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
        >
          <Link href={`/customer/jobs/${job.id}`}>
            Xem tiến độ
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>

        {job.status === "completed" ? (
          <Button
            asChild
            variant="outline"
            className="rounded-full border-amber-200 bg-amber-50 font-extrabold text-amber-700 hover:bg-amber-100"
          >
            <Link href={`/customer/jobs/${job.id}/review`}>
              <Star className="mr-2 size-4 fill-current" />
              {hasReview ? "Xem đánh giá" : "Đánh giá"}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  href,
  buttonLabel,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-5">
      <div className="grid size-11 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
        {icon}
      </div>

      <h3 className="mt-4 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
        {title}
      </h3>

      <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
        {description}
      </p>

      <Button
        asChild
        variant="outline"
        className="mt-4 rounded-full border-blue-200 bg-white font-extrabold"
      >
        <Link href={href}>
          {buttonLabel}
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </Button>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white/75 p-3">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-blue-600">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mt-6 grid place-items-center rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-8 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
        <Store className="size-6" />
      </div>

      <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
        {title}
      </h3>

      <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
        {description}
      </p>

      {actionHref && actionLabel ? (
        <Button
          asChild
          className="mt-6 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
        >
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

function getSafeJobStatusMeta(status: string) {
  if (status === "completed") {
    return {
      label: "Hoàn thành",
      tone: "success" as const,
    };
  }

  return getJobStatusMeta(status as Parameters<typeof getJobStatusMeta>[0]);
}