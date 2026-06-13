import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  ImageIcon,
  MessageSquareText,
  SendHorizonal,
  Sparkles,
  Star,
  Store,
  UserRound,
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

type DesignerStatsRow = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number;
  completed_jobs: number;
  response_time_hours: number;
  availability: string | null;
};

type JobRow = {
  id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  design_requests: {
    id: string;
    title: string;
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

type JobUpdateRow = {
  id: string;
  job_id: string;
  update_type: string;
  title: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    design_requests: {
      business_name: string;
      category: string;
    } | null;
  } | null;
};

type FeedbackRow = {
  id: string;
  job_id: string;
  update_id: string;
  message: string;
  created_at: string;
};

type ReviewRow = {
  id: string;
  job_id: string;
  rating: number;
  comment: string;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    design_requests: {
      business_name: string;
      category: string;
    } | null;
  } | null;
};

export default async function DesignerDashboardPage() {
  const authState = await requireRole(["designer"]);
  const profile = authState.profile;
  const designerProfile = authState.designerProfile;

  if (!profile || !designerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const [designerResult, jobsResult, updatesResult, reviewsResult] =
    await Promise.all([
      adminSupabase
        .from("designer_profiles")
        .select(
          "id, display_name, headline, rating, completed_jobs, response_time_hours, availability",
        )
        .eq("id", designerProfile.id)
        .maybeSingle(),

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
          design_requests (
            id,
            title,
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
        .eq("designer_id", designerProfile.id)
        .order("created_at", { ascending: false }),

      adminSupabase
        .from("job_updates")
        .select(
          `
          id,
          job_id,
          update_type,
          title,
          message,
          attachment_url,
          created_at,
          jobs (
            id,
            title,
            design_requests (
              business_name,
              category
            )
          )
        `,
        )
        .eq("designer_id", designerProfile.id)
        .order("created_at", { ascending: false }),

      adminSupabase
        .from("job_reviews")
        .select(
          `
          id,
          job_id,
          rating,
          comment,
          created_at,
          jobs (
            id,
            title,
            design_requests (
              business_name,
              category
            )
          )
        `,
        )
        .eq("designer_id", designerProfile.id)
        .order("created_at", { ascending: false }),
    ]);

  const designerStats = designerResult.data as DesignerStatsRow | null;
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];
  const updates = (updatesResult.data ?? []) as unknown as JobUpdateRow[];
  const reviews = (reviewsResult.data ?? []) as unknown as ReviewRow[];

  const jobIds = jobs.map((job) => job.id);

  const feedbacksResult =
    jobIds.length > 0
      ? await adminSupabase
          .from("job_update_feedbacks")
          .select("id, job_id, update_id, message, created_at")
          .in("job_id", jobIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  const feedbacks = (feedbacksResult.data ?? []) as unknown as FeedbackRow[];

  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((job) => job.status === "active").length;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const paymentPendingJobs = jobs.filter(
    (job) => job.status === "payment_pending",
  ).length;

  const confirmedIncome = jobs.reduce((total, job) => {
    const payment = job.payments;

    if (!payment) return total;

    if (["confirmed", "paid", "succeeded"].includes(payment.status)) {
      return total + Number(job.agreed_price_vnd ?? 0);
    }

    return total;
  }, 0);

  const averageReviewRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((total, review) => total + review.rating, 0) /
            reviews.length) *
            10,
        ) / 10
      : designerStats?.rating ?? 0;

  const latestJobs = jobs.slice(0, 4);
  const latestUpdates = updates.slice(0, 4);
  const latestFeedbacks = feedbacks.slice(0, 4);
  const latestReviews = reviews.slice(0, 3);

  const designerDisplayName =
    designerStats?.display_name ?? designerProfile.display_name ?? "Designer";

  const designerHeadline =
    designerStats?.headline ?? designerProfile.headline ?? "Designer";

  return (
    <DashboardShell
      role="designer"
      title="Tổng quan"
      description="Theo dõi job, tiến độ, feedback, review và hiệu suất làm việc của bạn."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          designerResult.error?.message,
          jobsResult.error?.message,
          updatesResult.error?.message,
          reviewsResult.error?.message,
          feedbacksResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active jobs"
          value={`${activeJobs}`}
          description="Job đang thực hiện"
          icon={<BriefcaseBusiness className="size-5" />}
          href="/designer/jobs"
          tone="dark"
        />

        <MetricCard
          label="Completed"
          value={`${completedJobs}`}
          description="Job đã hoàn thành"
          icon={<CheckCircle2 className="size-5" />}
          href="/designer/jobs"
          tone="success"
        />

        <MetricCard
          label="Income tracked"
          value={formatCurrencyVnd(confirmedIncome)}
          description="Tổng giá trị job đã xác nhận payment"
          icon={<CircleDollarSign className="size-5" />}
          href="/designer/jobs"
        />

        <MetricCard
          label="Rating"
          value={`${averageReviewRating.toFixed(1)}/5`}
          description="Rating từ customer review"
          icon={<Star className="size-5 fill-current" />}
          href="/designer/reviews"
          tone="warning"
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Designer workspace
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                {designerDisplayName}
              </h2>

              <p className="mt-2 text-sm font-bold text-blue-700">
                {designerHeadline}
              </p>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                Đây là bảng điều khiển giúp designer theo dõi công việc đang làm,
                ảnh tiến độ đã gửi, feedback từ customer và review sau khi hoàn
                thành job.
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
                  <Link href="/designer/reviews">
                    Xem review
                    <Star className="ml-2 size-4 fill-current" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <SignalBox
                icon={<CreditCard className="size-4" />}
                label="Payment pending"
                value={`${paymentPendingJobs} job chờ payment`}
                tone={paymentPendingJobs > 0 ? "warning" : "normal"}
              />

              <SignalBox
                icon={<SendHorizonal className="size-4" />}
                label="Updates sent"
                value={`${updates.length} cập nhật đã gửi`}
              />

              <SignalBox
                icon={<MessageSquareText className="size-4" />}
                label="Customer feedback"
                value={`${feedbacks.length} phản hồi đã nhận`}
                tone={feedbacks.length > 0 ? "warning" : "normal"}
              />
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
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
                Các job mới nhất được giao cho designer.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-fit rounded-full border-blue-200 bg-white font-extrabold"
            >
              <Link href="/designer/jobs">
                Xem tất cả
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          {latestJobs.length === 0 ? (
            <EmptyState
              title="Chưa có job nào."
              description="Khi customer chọn bạn cho một dự án, job sẽ xuất hiện tại đây."
              actionHref="/designer/jobs"
              actionLabel="Xem Jobs"
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestJobs.map((job) => (
                <LatestJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Customer feedback
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Phản hồi mới
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Feedback customer gửi dưới các bản nháp hoặc ảnh tiến độ.
              </p>
            </div>

            <StatusPill tone="info">{`${feedbacks.length} feedbacks`}</StatusPill>
          </div>

          {latestFeedbacks.length === 0 ? (
            <EmptyState
              title="Chưa có feedback nào."
              description="Khi customer phản hồi dưới update, feedback sẽ hiển thị tại đây."
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestFeedbacks.map((feedback) => (
                <FeedbackCard
                  key={feedback.id}
                  feedback={feedback}
                  jobs={jobs}
                  updates={updates}
                />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Recent updates
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Cập nhật bạn đã gửi
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Các bản nháp, tiến độ hoặc bản hoàn thiện gần nhất.
              </p>
            </div>

            <StatusPill tone="info">{`${updates.length} updates`}</StatusPill>
          </div>

          {latestUpdates.length === 0 ? (
            <EmptyState
              title="Chưa gửi cập nhật nào."
              description="Vào trang job chi tiết để gửi ảnh tiến độ hoặc bản hoàn thiện."
              actionHref="/designer/jobs"
              actionLabel="Mở Jobs"
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestUpdates.map((update) => (
                <RecentUpdateCard key={update.id} update={update} />
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Recent reviews
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Đánh giá gần đây
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Review customer gửi sau khi job hoàn thành.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-fit rounded-full border-blue-200 bg-white font-extrabold"
            >
              <Link href="/designer/reviews">
                Xem reviews
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          {latestReviews.length === 0 ? (
            <EmptyState
              title="Chưa có review nào."
              description="Sau khi customer duyệt hoàn thành và đánh giá, review sẽ hiển thị tại đây."
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
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

function LatestJobCard({ job }: { job: JobRow }) {
  const jobStatus = getSafeJobStatusMeta(job.status);

  const paymentStatus = job.payments
    ? getPaymentStatusMeta(
        job.payments.status as Parameters<typeof getPaymentStatusMeta>[0],
      )
    : null;

  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={jobStatus.tone}>{jobStatus.label}</StatusPill>

            {paymentStatus ? (
              <StatusPill tone={paymentStatus.tone}>
                {paymentStatus.label}
              </StatusPill>
            ) : null}

            {job.design_requests ? (
              <StatusPill tone="neutral">
                {getCategoryLabel(
                  job.design_requests.category as Parameters<
                    typeof getCategoryLabel
                  >[0],
                )}
              </StatusPill>
            ) : null}
          </div>

          <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
            {job.title}
          </h3>

          <p className="mt-1 text-sm font-bold text-blue-700">
            {job.design_requests?.business_name ?? "Chưa rõ thương hiệu"}
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="w-fit shrink-0 rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href={`/designer/jobs/${job.id}`}>
            Mở
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MiniInfo
          label="Price"
          value={formatCurrencyVnd(job.agreed_price_vnd)}
        />

        <MiniInfo
          label="Due"
          value={job.due_at ? formatDateVi(job.due_at) : "Chưa có"}
        />

        <MiniInfo label="Created" value={formatDateVi(job.created_at)} />
      </div>
    </div>
  );
}

function FeedbackCard({
  feedback,
  jobs,
  updates,
}: {
  feedback: FeedbackRow;
  jobs: JobRow[];
  updates: JobUpdateRow[];
}) {
  const job = jobs.find((item) => item.id === feedback.job_id);
  const update = updates.find((item) => item.id === feedback.update_id);

  return (
    <div className="rounded-[1.15rem] border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="warning">Feedback</StatusPill>

        {update ? (
          <StatusPill tone="neutral">
            {getUpdateTypeLabel(update.update_type)}
          </StatusPill>
        ) : null}
      </div>

      <p className="mt-3 text-sm font-medium leading-7 text-amber-950">
        {feedback.message}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-[#061a3a]">
            {job?.title ?? "Job không xác định"}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
            {formatDateVi(feedback.created_at)}
          </p>
        </div>

        {job ? (
          <Button
            asChild
            variant="outline"
            className="rounded-full border-amber-200 bg-white font-extrabold text-amber-700"
          >
            <Link href={`/designer/jobs/${job.id}`}>Mở job</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RecentUpdateCard({ update }: { update: JobUpdateRow }) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="neutral">
          {getUpdateTypeLabel(update.update_type)}
        </StatusPill>

        {update.attachment_url ? (
          <StatusPill tone="info">Có hình ảnh</StatusPill>
        ) : null}
      </div>

      <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
        {update.title}
      </h3>

      <p className="mt-2 line-clamp-2 text-sm font-medium leading-7 text-slate-600">
        {update.message}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-blue-700">
            {update.jobs?.design_requests?.business_name ?? "Chưa rõ thương hiệu"}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {formatDateVi(update.created_at)}
          </p>
        </div>

        {update.attachment_url ? (
          <ImageIcon className="size-5 text-blue-700" />
        ) : (
          <SendHorizonal className="size-5 text-blue-700" />
        )}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewRow }) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex flex-wrap gap-2">
        <RatingPill rating={review.rating} />

        {review.jobs?.design_requests ? (
          <StatusPill tone="neutral">
            {getCategoryLabel(
              review.jobs.design_requests.category as Parameters<
                typeof getCategoryLabel
              >[0],
            )}
          </StatusPill>
        ) : null}
      </div>

      <p className="mt-3 text-sm font-medium leading-7 text-slate-700">
        {review.comment}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-[#061a3a]">
            {review.jobs?.title ?? "Job không xác định"}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {formatDateVi(review.created_at)}
          </p>
        </div>

        {review.jobs ? (
          <Button
            asChild
            variant="outline"
            className="rounded-full border-blue-200 bg-white font-extrabold"
          >
            <Link href={`/designer/jobs/${review.jobs.id}`}>Mở job</Link>
          </Button>
        ) : null}
      </div>
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

function RatingPill({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-amber-700">
      <Star className="size-3.5 fill-current" />
      {rating}/5
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
        <Sparkles className="size-6" />
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

function getUpdateTypeLabel(updateType: string) {
  if (updateType === "draft") return "Bản nháp";
  if (updateType === "final") return "Bản hoàn thiện";
  return "Tiến độ";
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