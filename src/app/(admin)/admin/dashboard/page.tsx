import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  TriangleAlert,
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

type RequestRow = {
  id: string;
  title: string;
  business_name: string;
  category: string;
  status: string;
  created_at: string;
};

type JobRow = {
  id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  created_at: string;
  completed_at: string | null;
  designer_profiles: {
    display_name: string;
    headline: string | null;
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

type PaymentRow = {
  id: string;
  amount_vnd: number;
  status: string;
  transfer_note: string;
  created_at: string;
  confirmed_at: string | null;
};

type DesignerRow = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number;
  completed_jobs: number;
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  designer_profiles: {
    display_name: string;
  } | null;
  jobs: {
    id: string;
    title: string;
  } | null;
};

export default async function AdminDashboardPage() {
  const authState = await requireRole(["admin"]);
  const profile = authState.profile;

  if (!profile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const [
    requestsResult,
    jobsResult,
    paymentsResult,
    designersResult,
    reviewsResult,
  ] = await Promise.all([
    adminSupabase
      .from("design_requests")
      .select("id, title, business_name, category, status, created_at")
      .order("created_at", { ascending: false }),

    adminSupabase
      .from("jobs")
      .select(
        `
        id,
        title,
        status,
        agreed_price_vnd,
        created_at,
        completed_at,
        designer_profiles (
          display_name,
          headline
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
      .order("created_at", { ascending: false }),

    adminSupabase
      .from("payments")
      .select("id, amount_vnd, status, transfer_note, created_at, confirmed_at")
      .order("created_at", { ascending: false }),

    adminSupabase
      .from("designer_profiles")
      .select("id, display_name, headline, rating, completed_jobs")
      .order("rating", { ascending: false }),

    adminSupabase
      .from("job_reviews")
      .select(
        `
        id,
        rating,
        comment,
        created_at,
        designer_profiles (
          display_name
        ),
        jobs (
          id,
          title
        )
      `,
      )
      .order("created_at", { ascending: false }),
  ]);

  const requests = (requestsResult.data ?? []) as unknown as RequestRow[];
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];
  const payments = (paymentsResult.data ?? []) as unknown as PaymentRow[];
  const designers = (designersResult.data ?? []) as unknown as DesignerRow[];
  const reviews = (reviewsResult.data ?? []) as unknown as ReviewRow[];

  const totalRequests = requests.length;
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((job) => job.status === "active").length;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const paymentPendingJobs = jobs.filter(
    (job) => job.status === "payment_pending",
  ).length;

  const confirmedPayments = payments.filter((payment) =>
    ["confirmed", "paid", "succeeded"].includes(payment.status),
  );

  const confirmedRevenue = confirmedPayments.reduce(
    (total, payment) => total + Number(payment.amount_vnd ?? 0),
    0,
  );

  const averageRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((total, review) => total + review.rating, 0) /
            reviews.length) *
            10,
        ) / 10
      : 0;

  const lowRatingReviews = reviews.filter((review) => review.rating <= 3).length;
  const latestJobs = jobs.slice(0, 5);
  const latestRequests = requests.slice(0, 5);
  const topDesigners = designers.slice(0, 5);
  const latestReviews = reviews.slice(0, 3);

  return (
    <DashboardShell
      role="admin"
      title="Tổng quan"
      description="Bảng điều khiển vận hành toàn hệ thống DesignMatch AI bằng dữ liệu thật."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          requestsResult.error?.message,
          jobsResult.error?.message,
          paymentsResult.error?.message,
          designersResult.error?.message,
          reviewsResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requests"
          value={`${totalRequests}`}
          description="Tổng yêu cầu thiết kế"
          icon={<FileText className="size-5" />}
          href="/admin/requests"
          tone="dark"
        />

        <MetricCard
          label="Active jobs"
          value={`${activeJobs}`}
          description="Job đang thực hiện"
          icon={<BriefcaseBusiness className="size-5" />}
          href="/admin/jobs"
        />

        <MetricCard
          label="Confirmed revenue"
          value={formatCurrencyVnd(confirmedRevenue)}
          description="Tổng payment đã xác nhận"
          icon={<CircleDollarSign className="size-5" />}
          href="/admin/payments"
          tone="success"
        />

        <MetricCard
          label="Marketplace rating"
          value={reviews.length > 0 ? `${averageRating.toFixed(1)}/5` : "N/A"}
          description="Rating trung bình từ review"
          icon={<Star className="size-5 fill-current" />}
          href="/admin/reviews"
          tone={lowRatingReviews > 0 ? "warning" : "normal"}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Operating signal
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                Sức khỏe vận hành marketplace
              </h2>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                Admin dùng bảng này để kiểm tra nhanh số lượng request, job,
                payment, designer và tín hiệu chất lượng từ review customer.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <SignalBox
                icon={<CheckCircle2 className="size-4" />}
                label="Completed jobs"
                value={`${completedJobs} job đã hoàn thành`}
              />

              <SignalBox
                icon={<CreditCard className="size-4" />}
                label="Payment pending"
                value={`${paymentPendingJobs} job chờ payment`}
                tone={paymentPendingJobs > 0 ? "warning" : "normal"}
              />

              <SignalBox
                icon={<TriangleAlert className="size-4" />}
                label="Quality risk"
                value={
                  lowRatingReviews > 0
                    ? `${lowRatingReviews} review cần kiểm tra`
                    : "Chưa có tín hiệu rủi ro"
                }
                tone={lowRatingReviews > 0 ? "warning" : "normal"}
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
                Job mới nhất
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Theo dõi nhanh các job vừa tạo hoặc vừa cập nhật trạng thái.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-fit rounded-full border-blue-200 bg-white font-extrabold"
            >
              <Link href="/admin/jobs">
                Xem tất cả
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          {latestJobs.length === 0 ? (
            <EmptyState
              title="Chưa có job nào."
              description="Khi customer chọn designer và tạo payment, job sẽ xuất hiện tại đây."
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
                Latest requests
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Request mới nhất
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Các brief customer vừa tạo trong hệ thống.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-fit rounded-full border-blue-200 bg-white font-extrabold"
            >
              <Link href="/admin/requests">
                Xem request
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          {latestRequests.length === 0 ? (
            <EmptyState
              title="Chưa có request nào."
              description="Khi customer tạo brief, danh sách request sẽ hiển thị tại đây."
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestRequests.map((request) => (
                <LatestRequestCard key={request.id} request={request} />
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
                Top designers
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Designer nổi bật
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Xếp theo rating hiện tại và số job đã hoàn thành.
              </p>
            </div>

            <StatusPill tone="info">{`${designers.length} designers`}</StatusPill>
          </div>

          {topDesigners.length === 0 ? (
            <EmptyState
              title="Chưa có designer."
              description="Sau khi seed hoặc duyệt designer, danh sách sẽ hiển thị."
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {topDesigners.map((designer, index) => (
                <TopDesignerCard
                  key={designer.id}
                  designer={designer}
                  rank={index + 1}
                />
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Latest reviews
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Review gần đây
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Customer review sau khi job hoàn thành.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-fit rounded-full border-blue-200 bg-white font-extrabold"
            >
              <Link href="/admin/reviews">
                Xem review
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          {latestReviews.length === 0 ? (
            <EmptyState
              title="Chưa có review nào."
              description="Khi customer đánh giá designer, review sẽ hiển thị tại đây."
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestReviews.map((review) => (
                <LatestReviewCard key={review.id} review={review} />
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
          <Link href={`/admin/jobs/${job.id}`}>
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
          label="Designer"
          value={job.designer_profiles?.display_name ?? "N/A"}
        />

        <MiniInfo label="Created" value={formatDateVi(job.created_at)} />
      </div>
    </div>
  );
}

function LatestRequestCard({ request }: { request: RequestRow }) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="neutral">
          {getCategoryLabel(request.category as Parameters<typeof getCategoryLabel>[0])}
        </StatusPill>

        <StatusPill tone="info">{request.status}</StatusPill>
      </div>

      <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
        {request.title}
      </h3>

      <p className="mt-1 text-sm font-bold text-blue-700">
        {request.business_name}
      </p>

      <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {formatDateVi(request.created_at)}
      </p>
    </div>
  );
}

function TopDesignerCard({
  designer,
  rank,
}: {
  designer: DesignerRow;
  rank: number;
}) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex items-start gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-sm font-black text-blue-700 ring-1 ring-blue-100">
          #{rank}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <RatingPill rating={designer.rating ?? 0} />

            <StatusPill tone="neutral">
              {`${designer.completed_jobs ?? 0} completed`}
            </StatusPill>
          </div>

          <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
            {designer.display_name}
          </h3>

          <p className="mt-1 text-sm font-bold leading-6 text-blue-700">
            {designer.headline ?? "Designer"}
          </p>
        </div>
      </div>
    </div>
  );
}

function LatestReviewCard({ review }: { review: ReviewRow }) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex flex-wrap gap-2">
        <RatingPill rating={review.rating} />

        <StatusPill tone="neutral">
          {review.designer_profiles?.display_name ?? "Designer"}
        </StatusPill>
      </div>

      <p className="mt-3 text-sm font-medium leading-7 text-slate-700">
        {review.comment}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          {formatDateVi(review.created_at)}
        </p>

        {review.jobs ? (
          <Button
            asChild
            variant="outline"
            className="rounded-full border-blue-200 bg-white font-extrabold"
          >
            <Link href={`/admin/jobs/${review.jobs.id}`}>Mở job</Link>
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

function getSafeJobStatusMeta(status: string) {
  if (status === "completed") {
    return {
      label: "Hoàn thành",
      tone: "success" as const,
    };
  }

  return getJobStatusMeta(status as Parameters<typeof getJobStatusMeta>[0]);
}