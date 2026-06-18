import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  Plus,
  ShieldCheck,
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
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel, getStyleLabel } from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi, formatPercent } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RequestRow = {
  id: string;
  title: string;
  business_name: string;
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

type PaymentRow = {
  id: string;
  amount_vnd: number;
  status: string;
  confirmed_at: string | null;
  created_at: string;
};

type JobRow = {
  id: string;
  request_id: string;
  title: string;
  status: string;
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
  payments: PaymentRow[] | PaymentRow | null;
};

type AiBriefRow = {
  id: string;
  request_id: string | null;
  design_request_id: string | null;
  status: string | null;
  confirmed_at: string | null;
  brief_completeness_score: number | null;
};

type MatchRow = {
  id: string;
  request_id: string;
  designer_id: string;
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

  const [requestsResult, jobsResult, briefsResult, matchesResult, reviewsResult] =
    await Promise.all([
      adminSupabase
        .from("design_requests")
        .select(
          `
          id,
          title,
          business_name,
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
        .eq("customer_id", customerProfile.id)
        .order("created_at", { ascending: false }),

      adminSupabase
        .from("jobs")
        .select(
          `
          id,
          request_id,
          title,
          status,
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
            confirmed_at,
            created_at
          )
        `,
        )
        .eq("customer_id", customerProfile.id)
        .order("created_at", { ascending: false }),

      adminSupabase
        .from("ai_briefs")
        .select(
          `
          id,
          request_id,
          design_request_id,
          status,
          confirmed_at,
          brief_completeness_score
        `,
        ),

      adminSupabase.from("designer_matches").select("id, request_id, designer_id"),

      adminSupabase
        .from("job_reviews")
        .select("id, job_id, rating")
        .eq("customer_id", customerProfile.id),
    ]);

  const requests = (requestsResult.data ?? []) as unknown as RequestRow[];
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];
  const briefs = (briefsResult.data ?? []) as unknown as AiBriefRow[];
  const matches = (matchesResult.data ?? []) as unknown as MatchRow[];
  const reviews = (reviewsResult.data ?? []) as unknown as ReviewRow[];

  const requestIds = new Set(requests.map((request) => request.id));
  const reviewedJobIds = new Set(reviews.map((review) => review.job_id));

  const customerBriefs = briefs.filter((brief) => {
    const briefRequestId = brief.request_id ?? brief.design_request_id;

    return Boolean(briefRequestId && requestIds.has(briefRequestId));
  });

  const totalRequests = requests.length;

  const aiBriefCount = requests.filter((request) =>
    Boolean(findBriefForRequest(customerBriefs, request.id)),
  ).length;

  const confirmedBriefCount = requests.filter((request) =>
    isBriefConfirmed(request, findBriefForRequest(customerBriefs, request.id)),
  ).length;

  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((job) => job.status === "active").length;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;

  const completedWithoutReview = jobs.filter(
    (job) => job.status === "completed" && !reviewedJobIds.has(job.id),
  ).length;

  const paymentNeedsAction = jobs.filter((job) => {
    const payment = getPrimaryPayment(job.payments);

    return (
      job.status === "payment_pending" ||
      !payment ||
      ["waiting_transfer", "waiting_admin_confirm", "rejected"].includes(
        payment.status,
      )
    );
  }).length;

  const totalPaid = jobs.reduce((total, job) => {
    const payment = getPrimaryPayment(job.payments);

    if (!payment) return total;

    if (payment.status === "confirmed") {
      return total + Number(payment.amount_vnd ?? 0);
    }

    return total;
  }, 0);

  const latestRequests = requests.slice(0, 4);
  const latestJobs = jobs.slice(0, 4);

  const requestNeedsBrief = requests.filter(
    (request) => !findBriefForRequest(customerBriefs, request.id),
  ).length;

  const requestNeedsMatch = requests.filter((request) => {
    const brief = findBriefForRequest(customerBriefs, request.id);
    const confirmed = isBriefConfirmed(request, brief);
    const hasMatch = matches.some((match) => match.request_id === request.id);

    return confirmed && !hasMatch;
  }).length;

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
          matchesResult.error?.message,
          reviewsResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requests"
          value={`${totalRequests}`}
          description="Tổng yêu cầu thiết kế đã tạo"
          icon={<FileText className="size-5" />}
          href="/customer/requests"
          tone="dark"
        />

        <MetricCard
          label="Brief confirmed"
          value={`${confirmedBriefCount}/${aiBriefCount}`}
          description="Brief đã được xác nhận"
          icon={<ShieldCheck className="size-5" />}
          href="/customer/requests"
          tone={confirmedBriefCount > 0 ? "success" : "normal"}
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
        <SurfaceCard className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-[#061a3a] via-[#0b2a61] to-blue-700 p-6 text-white">
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/75">
                  Customer creative workspace
                </p>

                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-white">
                  Không gian quản lý thiết kế của bạn
                </h2>

                <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/70">
                  Từ đây bạn có thể tạo brief mới, duyệt brief, xem designer
                  matching, theo dõi payment, gửi feedback và đánh giá designer
                  sau khi hoàn thành.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="rounded-full bg-white px-5 font-extrabold text-[#061a3a] hover:bg-sky-50"
                  >
                    <Link href="/customer/requests/new">
                      <Plus className="mr-2 size-4" />
                      Tạo request mới
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-white/20 bg-white/10 font-extrabold text-white hover:bg-white/15"
                  >
                    <Link href="/customer/jobs">
                      Xem job của tôi
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <DarkSignalBox
                  icon={<FileText className="size-4" />}
                  label="Requests"
                  value={`${totalRequests} đã tạo`}
                />

                <DarkSignalBox
                  icon={<Sparkles className="size-4" />}
                  label="AI brief"
                  value={`${aiBriefCount} đã có brief`}
                />

                <DarkSignalBox
                  icon={<BriefcaseBusiness className="size-4" />}
                  label="Jobs"
                  value={`${totalJobs} job`}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-4">
            <SignalBox
              icon={<CreditCard className="size-4" />}
              label="Payment pending"
              value={`${paymentNeedsAction} mục cần xử lý`}
              tone={paymentNeedsAction > 0 ? "warning" : "normal"}
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

            <SignalBox
              icon={<Target className="size-4" />}
              label="Need matching"
              value={`${requestNeedsMatch} request sẵn sàng match`}
              tone={requestNeedsMatch > 0 ? "warning" : "normal"}
            />
          </div>
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
                Hệ thống gợi ý hành động dựa trên trạng thái request, brief,
                matching, payment và job hiện tại.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {paymentNeedsAction > 0 ? (
              <ActionCard
                icon={<WalletCards className="size-5" />}
                title="Kiểm tra thanh toán"
                description="Có job đang chờ chuyển khoản hoặc chờ admin xác nhận payment."
                href="/customer/jobs"
                buttonLabel="Xem payment"
                tone="warning"
              />
            ) : requestNeedsMatch > 0 ? (
              <ActionCard
                icon={<Sparkles className="size-5" />}
                title="Tạo designer matching"
                description="Có request đã chốt brief và sẵn sàng tìm designer phù hợp."
                href="/customer/requests"
                buttonLabel="Xem request"
                tone="warning"
              />
            ) : requestNeedsBrief > 0 ? (
              <ActionCard
                icon={<FileText className="size-5" />}
                title="Hoàn thiện AI brief"
                description="Một số request chưa có AI brief. Hãy tạo brief trước khi matching."
                href="/customer/requests"
                buttonLabel="Hoàn thiện brief"
                tone="warning"
              />
            ) : (
              <ActionCard
                icon={<Plus className="size-5" />}
                title="Tạo request mới"
                description="Bắt đầu một nhu cầu thiết kế mới với AI brief builder."
                href="/customer/requests/new"
                buttonLabel="Tạo request"
              />
            )}

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
              tone={completedWithoutReview > 0 ? "warning" : "normal"}
            />
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
              description="Hãy tạo request đầu tiên để AI chuẩn hóa yêu cầu thiết kế."
              actionHref="/customer/requests/new"
              actionLabel="Tạo request AI"
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestRequests.map((request) => {
                const brief = findBriefForRequest(customerBriefs, request.id);
                const matchCount = matches.filter(
                  (match) => match.request_id === request.id,
                ).length;

                return (
                  <LatestRequestCard
                    key={request.id}
                    request={request}
                    brief={brief}
                    matchCount={matchCount}
                  />
                );
              })}
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
    </DashboardShell>
  );
}

function LatestRequestCard({
  request,
  brief,
  matchCount,
}: {
  request: RequestRow;
  brief?: AiBriefRow;
  matchCount: number;
}) {
  const requestStatus = getRequestStatusView(request.status);
  const briefConfirmed = isBriefConfirmed(request, brief);

  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone={requestStatus.tone}>{requestStatus.label}</StatusPill>

        <StatusPill tone="neutral">
          {getSafeCategoryLabel(request.category)}
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

        {matchCount > 0 ? (
          <StatusPill tone="success">{`${matchCount} matches`}</StatusPill>
        ) : (
          <StatusPill tone="neutral">Chưa match</StatusPill>
        )}
      </div>

      <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
        {request.title}
      </h3>

      <p className="mt-1 text-sm font-bold text-blue-700">
        {request.business_name}
      </p>

      <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-600">
        {request.description}
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

        <MiniInfo
          label="Brief score"
          value={
            brief?.brief_completeness_score
              ? formatPercent(Number(brief.brief_completeness_score) / 100)
              : "Chưa có"
          }
        />
      </div>

      {request.preferred_styles && request.preferred_styles.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {request.preferred_styles.slice(0, 4).map((style) => (
            <StatusPill key={style} tone="neutral">
              {getSafeStyleLabel(style)}
            </StatusPill>
          ))}
        </div>
      ) : null}

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
  const jobStatus = getSafeJobStatus(job.status);
  const payment = getPrimaryPayment(job.payments);
  const paymentStatus = getSafePaymentStatus(payment?.status ?? null);

  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone={jobStatus.tone}>{jobStatus.label}</StatusPill>

        <StatusPill tone={paymentStatus.tone}>{paymentStatus.label}</StatusPill>

        {hasReview ? <StatusPill tone="success">Đã đánh giá</StatusPill> : null}
      </div>

      <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
        {job.title}
      </h3>

      <p className="mt-1 text-sm font-bold text-blue-700">
        Designer: {job.designer_profiles?.display_name ?? "Chưa rõ"}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <MiniInfo
          label="Số tiền thanh toán"
          value={payment ? formatCurrencyVnd(payment.amount_vnd) : "Chưa có"}
        />

        <MiniInfo
          label="Due"
          value={job.due_at ? formatDateVi(job.due_at) : "Chưa có"}
        />
      </div>

      {job.designer_profiles ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-100 bg-white/75 p-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#061a3a] text-white">
            <UserRound className="size-4" />
          </div>

          <div>
            <p className="text-sm font-extrabold text-[#061a3a]">
              {job.designer_profiles.display_name}
            </p>
            <p className="text-xs font-semibold text-slate-500">
              {job.designer_profiles.headline ?? "Designer"} ·{" "}
              {job.designer_profiles.rating}/5
            </p>
          </div>
        </div>
      ) : null}

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
            <Link href={`/customer/jobs/${job.id}#designer-review`}>
              <Star className="mr-2 size-4 fill-current" />
              {hasReview ? "Xem đánh giá" : "Đánh giá"}
            </Link>
          </Button>
        ) : null}
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
    <Link
      href={href}
      className={`rounded-[1.35rem] border p-5 transition hover:-translate-y-0.5 ${cardClass}`}
    >
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

function ActionCard({
  icon,
  title,
  description,
  href,
  buttonLabel,
  tone = "normal",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
  tone?: "normal" | "warning";
}) {
  const cardClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-blue-100 bg-blue-50/65";

  return (
    <div className={`rounded-[1.25rem] border p-5 ${cardClass}`}>
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

function findBriefForRequest(briefs: AiBriefRow[], requestId: string) {
  return briefs.find(
    (brief) =>
      brief.request_id === requestId || brief.design_request_id === requestId,
  );
}

function isBriefConfirmed(request: RequestRow, brief?: AiBriefRow) {
  return (
    request.brief_review_status === "confirmed" ||
    Boolean(request.brief_confirmed_at) ||
    brief?.status === "confirmed" ||
    Boolean(brief?.confirmed_at)
  );
}

function getPrimaryPayment(payments: JobRow["payments"]) {
  if (Array.isArray(payments)) {
    return payments[0] ?? null;
  }

  return payments;
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

function getSafeJobStatus(status: string) {
  if (status === "payment_pending") {
    return {
      label: "Chờ thanh toán",
      tone: "warning" as const,
    };
  }

  if (status === "active") {
    return {
      label: "Đang thực hiện",
      tone: "info" as const,
    };
  }

  if (status === "reviewing") {
    return {
      label: "Đang duyệt bản cuối",
      tone: "info" as const,
    };
  }

  if (status === "completed") {
    return {
      label: "Hoàn thành",
      tone: "success" as const,
    };
  }

  if (status === "disputed") {
    return {
      label: "Đang tranh chấp",
      tone: "warning" as const,
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

function getSafePaymentStatus(status: string | null) {
  if (!status) {
    return {
      label: "Chưa có payment",
      tone: "warning" as const,
    };
  }

  if (status === "not_required") {
    return {
      label: "Không cần thanh toán",
      tone: "neutral" as const,
    };
  }

  if (status === "waiting_transfer") {
    return {
      label: "Chờ chuyển khoản",
      tone: "warning" as const,
    };
  }

  if (status === "waiting_admin_confirm") {
    return {
      label: "Chờ admin xác nhận",
      tone: "info" as const,
    };
  }

  if (status === "confirmed") {
    return {
      label: "Đã xác nhận",
      tone: "success" as const,
    };
  }

  if (status === "rejected") {
    return {
      label: "Bị từ chối",
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

function getSafeStyleLabel(style: string) {
  try {
    return getStyleLabel(style as Parameters<typeof getStyleLabel>[0]);
  } catch {
    return style;
  }
}