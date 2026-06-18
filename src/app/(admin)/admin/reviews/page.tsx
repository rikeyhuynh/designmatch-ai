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
import { getCategoryLabel } from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminReviewRow = {
  id: string;
  job_id: string;
  designer_id: string;
  customer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  designer_profiles: {
    id: string;
    display_name: string;
    headline: string | null;
    rating: number;
    completed_jobs: number;
    verification_status: string | null;
  } | null;
  jobs: {
    id: string;
    title: string;
    status: string;
    agreed_price_vnd: number;
    completed_at: string | null;
    created_at: string;
    design_requests: {
      id: string;
      title: string;
      business_name: string;
      category: string;
    } | null;
  } | null;
};

type DesignerQualityRow = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number;
  completed_jobs: number;
  verification_status: string | null;
};

type CompletedJobRow = {
  id: string;
  designer_id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  completed_at: string | null;
  created_at: string;
  design_requests: {
    id: string;
    title: string;
    business_name: string;
    category: string;
  } | null;
};

export default async function AdminReviewsPage() {
  const authState = await requireRole(["admin"]);
  const profile = authState.profile;

  if (!profile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const [reviewsResult, designersResult, completedJobsResult] =
    await Promise.all([
      adminSupabase
        .from("job_reviews")
        .select(
          `
          id,
          job_id,
          designer_id,
          customer_id,
          rating,
          comment,
          created_at,
          designer_profiles (
            id,
            display_name,
            headline,
            rating,
            completed_jobs,
            verification_status
          ),
          jobs (
            id,
            title,
            status,
            agreed_price_vnd,
            completed_at,
            created_at,
            design_requests (
              id,
              title,
              business_name,
              category
            )
          )
        `,
        )
        .order("created_at", { ascending: false }),

      adminSupabase
        .from("designer_profiles")
        .select(
          `
          id,
          display_name,
          headline,
          rating,
          completed_jobs,
          verification_status
        `,
        )
        .order("rating", { ascending: false }),

      adminSupabase
        .from("jobs")
        .select(
          `
          id,
          designer_id,
          title,
          status,
          agreed_price_vnd,
          completed_at,
          created_at,
          design_requests (
            id,
            title,
            business_name,
            category
          )
        `,
        )
        .eq("status", "completed")
        .order("completed_at", { ascending: false }),
    ]);

  const reviews = (reviewsResult.data ?? []) as unknown as AdminReviewRow[];
  const designers = (designersResult.data ?? []) as unknown as DesignerQualityRow[];
  const completedJobs = (completedJobsResult.data ??
    []) as unknown as CompletedJobRow[];

  const reviewedJobIds = new Set(reviews.map((review) => review.job_id));

  const jobsWithoutReview = completedJobs.filter(
    (job) => !reviewedJobIds.has(job.id),
  );

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? Math.round(
          (reviews.reduce((total, review) => total + Number(review.rating), 0) /
            totalReviews) *
            10,
        ) / 10
      : 0;

  const fiveStarReviews = reviews.filter((review) => review.rating === 5).length;
  const lowRatingReviews = reviews.filter((review) => review.rating <= 3);
  const fourStarReviews = reviews.filter((review) => review.rating === 4).length;
  const threeStarReviews = reviews.filter((review) => review.rating === 3).length;
  const twoStarReviews = reviews.filter((review) => review.rating === 2).length;
  const oneStarReviews = reviews.filter((review) => review.rating === 1).length;

  const reviewedDesignerIds = new Set(
    reviews
      .map((review) => review.designer_profiles?.id ?? review.designer_id)
      .filter((designerId): designerId is string => Boolean(designerId)),
  );

  const reviewedJobValue = reviews.reduce((total, review) => {
    return total + Number(review.jobs?.agreed_price_vnd ?? 0);
  }, 0);

  const topDesigners = designers
    .filter((designer) => designer.completed_jobs > 0 || designer.rating > 0)
    .slice(0, 6);

  const lowRatedDesigners = designers.filter(
    (designer) => designer.rating > 0 && designer.rating < 4,
  );

  const latestReviews = reviews.slice(0, 8);
  const latestLowReviews = lowRatingReviews.slice(0, 5);
  const latestJobsWithoutReview = jobsWithoutReview.slice(0, 6);

  const reviewCoverage =
    completedJobs.length > 0
      ? Math.round((reviewedJobIds.size / completedJobs.length) * 100)
      : 0;

  return (
    <DashboardShell
      role="admin"
      title="Review Quality"
      description="Theo dõi chất lượng designer, review customer và tín hiệu vận hành marketplace."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          reviewsResult.error?.message,
          designersResult.error?.message,
          completedJobsResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Marketplace rating"
          value={`${averageRating.toFixed(1)}/5`}
          description="Điểm trung bình toàn hệ thống"
          icon={<Star className="size-5 fill-current" />}
          tone="dark"
        />

        <MetricCard
          label="Total reviews"
          value={`${totalReviews}`}
          description="Tổng đánh giá đã ghi nhận"
          icon={<MessageSquareText className="size-5" />}
        />

        <MetricCard
          label="Review coverage"
          value={`${reviewCoverage}%`}
          description="Tỷ lệ completed job đã có review"
          icon={<ShieldCheck className="size-5" />}
          tone={reviewCoverage >= 70 ? "success" : "warning"}
        />

        <MetricCard
          label="Needs check"
          value={`${lowRatingReviews.length}`}
          description="Review từ 3 sao trở xuống"
          icon={<TriangleAlert className="size-5" />}
          tone={lowRatingReviews.length > 0 ? "warning" : "normal"}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-[#061a3a] via-[#0b2a61] to-blue-700 p-6 text-white">
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/75">
                  Admin review intelligence center
                </p>

                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-white">
                  Theo dõi chất lượng sau khi job hoàn thành
                </h2>

                <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/70">
                  Review giúp admin phát hiện designer nổi bật, job chưa có
                  đánh giá, rating thấp cần kiểm tra và tín hiệu cải thiện chất
                  lượng marketplace.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <DarkSignalBox
                  icon={<Sparkles className="size-4" />}
                  label="Designers reviewed"
                  value={`${reviewedDesignerIds.size} designer`}
                />

                <DarkSignalBox
                  icon={<BriefcaseBusiness className="size-4" />}
                  label="Completed jobs"
                  value={`${completedJobs.length} jobs`}
                />

                <DarkSignalBox
                  icon={<CircleDollarSign className="size-4" />}
                  label="Reviewed value"
                  value={formatCurrencyVnd(reviewedJobValue)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-4">
            <SignalBox
              icon={<CheckCircle2 className="size-4" />}
              label="5-star reviews"
              value={`${fiveStarReviews} review chất lượng cao`}
            />

            <SignalBox
              icon={<Star className="size-4" />}
              label="4-star reviews"
              value={`${fourStarReviews} review tích cực`}
            />

            <SignalBox
              icon={<TriangleAlert className="size-4" />}
              label="Low reviews"
              value={`${lowRatingReviews.length} review cần kiểm tra`}
              tone={lowRatingReviews.length > 0 ? "warning" : "normal"}
            />

            <SignalBox
              icon={<FileText className="size-4" />}
              label="Missing review"
              value={`${jobsWithoutReview.length} completed job chưa review`}
              tone={jobsWithoutReview.length > 0 ? "warning" : "normal"}
            />
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <SurfaceCard className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            Rating distribution
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Phân bố số sao
          </h2>

          <div className="mt-6 grid gap-3">
            <RatingDistributionRow
              stars={5}
              count={fiveStarReviews}
              total={totalReviews}
            />
            <RatingDistributionRow
              stars={4}
              count={fourStarReviews}
              total={totalReviews}
            />
            <RatingDistributionRow
              stars={3}
              count={threeStarReviews}
              total={totalReviews}
            />
            <RatingDistributionRow
              stars={2}
              count={twoStarReviews}
              total={totalReviews}
            />
            <RatingDistributionRow
              stars={1}
              count={oneStarReviews}
              total={totalReviews}
            />
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Quality alerts
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Cảnh báo cần admin kiểm tra
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Ưu tiên các review thấp và designer có rating dưới mức tốt.
              </p>
            </div>

            <StatusPill
              tone={
                latestLowReviews.length > 0 || lowRatedDesigners.length > 0
                  ? "warning"
                  : "success"
              }
            >
              {`${latestLowReviews.length + lowRatedDesigners.length} alerts`}
            </StatusPill>
          </div>

          {latestLowReviews.length === 0 && lowRatedDesigners.length === 0 ? (
            <EmptyState
              title="Chưa có cảnh báo chất lượng."
              description="Hiện chưa có review thấp hoặc designer rating thấp cần xử lý."
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestLowReviews.map((review) => (
                <QualityAlertCard key={review.id} review={review} />
              ))}

              {lowRatedDesigners.slice(0, 4).map((designer) => (
                <DesignerRiskCard key={designer.id} designer={designer} />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Designer quality
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Xếp hạng designer
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Theo rating hiện tại, số job hoàn thành và trạng thái duyệt.
              </p>
            </div>

            <StatusPill tone="info">{`${designers.length} designers`}</StatusPill>
          </div>

          {topDesigners.length === 0 ? (
            <EmptyState
              title="Chưa có designer có rating."
              description="Sau khi customer đánh giá designer, bảng chất lượng sẽ có dữ liệu."
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {topDesigners.map((designer, index) => (
                <DesignerQualityCard
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
                Review mới nhất
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Các nhận xét mới nhất từ customer sau khi job hoàn thành.
              </p>
            </div>

            <StatusPill tone="info">{`${totalReviews} reviews`}</StatusPill>
          </div>

          {latestReviews.length === 0 ? (
            <EmptyState
              title="Chưa có review nào."
              description="Khi customer đánh giá designer sau job hoàn thành, review sẽ hiển thị tại đây."
            />
          ) : (
            <div className="mt-6 grid gap-4">
              {latestReviews.map((review) => (
                <AdminReviewCard key={review.id} review={review} />
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
                Completed jobs without review
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Job đã hoàn thành nhưng chưa có review
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Đây là nhóm nên nhắc customer đánh giá để tăng dữ liệu học cho
                matching và chất lượng marketplace.
              </p>
            </div>

            <StatusPill tone={jobsWithoutReview.length > 0 ? "warning" : "success"}>
              {`${jobsWithoutReview.length} missing`}
            </StatusPill>
          </div>

          {latestJobsWithoutReview.length === 0 ? (
            <EmptyState
              title="Tất cả completed job đã có review."
              description="Không có job hoàn thành nào đang thiếu review."
            />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {latestJobsWithoutReview.map((job) => (
                <MissingReviewJobCard
                  key={job.id}
                  job={job}
                  designer={designers.find(
                    (designer) => designer.id === job.designer_id,
                  )}
                />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function AdminReviewCard({ review }: { review: AdminReviewRow }) {
  const job = review.jobs;
  const request = job?.design_requests;
  const designer = review.designer_profiles;

  return (
    <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-5 transition hover:bg-blue-50">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RatingPill rating={review.rating} />

            {request ? (
              <StatusPill tone="neutral">
                {getSafeCategoryLabel(request.category)}
              </StatusPill>
            ) : null}

            {review.rating <= 3 ? (
              <StatusPill tone="warning">Cần kiểm tra</StatusPill>
            ) : (
              <StatusPill tone="success">Ổn định</StatusPill>
            )}
          </div>

          <h3 className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
            {job?.title ?? "Job không xác định"}
          </h3>

          <p className="mt-2 text-sm font-bold text-blue-700">
            Designer: {designer?.display_name ?? "Không rõ designer"}
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="w-fit shrink-0 rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href={job ? `/admin/jobs/${job.id}` : "/admin/jobs"}>
            Mở job
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 rounded-[1.1rem] border border-blue-100 bg-white p-4">
        <p className="text-sm font-medium leading-7 text-slate-700">
          {review.comment ?? "Customer không để lại nhận xét chi tiết."}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MiniInfo
          icon={<CalendarDays className="size-4" />}
          label="Reviewed"
          value={formatDateVi(review.created_at)}
        />

        <MiniInfo
          icon={<Store className="size-4" />}
          label="Business"
          value={request?.business_name ?? "N/A"}
        />

        <MiniInfo
          icon={<BriefcaseBusiness className="size-4" />}
          label="Status"
          value={job?.status ?? "N/A"}
        />
      </div>
    </div>
  );
}

function DesignerQualityCard({
  designer,
  rank,
}: {
  designer: DesignerQualityRow;
  rank: number;
}) {
  const verification = getVerificationView(designer.verification_status);

  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4 transition hover:bg-blue-50">
      <div className="flex items-start gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-sm font-black text-blue-700 ring-1 ring-blue-100">
          #{rank}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <RatingPill rating={designer.rating ?? 0} />

            <StatusPill tone="neutral">
              {`${designer.completed_jobs ?? 0} completed`}
            </StatusPill>

            <StatusPill tone={verification.tone}>{verification.label}</StatusPill>
          </div>

          <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
            {designer.display_name}
          </h3>

          <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-blue-700">
            {designer.headline ?? "Designer"}
          </p>
        </div>
      </div>
    </div>
  );
}

function QualityAlertCard({ review }: { review: AdminReviewRow }) {
  return (
    <div className="rounded-[1.15rem] border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <RatingPill rating={review.rating} />
        <StatusPill tone="warning">Review thấp</StatusPill>
      </div>

      <p className="mt-3 text-sm font-medium leading-7 text-amber-950">
        {review.comment ?? "Customer không để lại nhận xét chi tiết."}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-[#061a3a]">
            {review.jobs?.title ?? "Job không xác định"}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
            {formatDateVi(review.created_at)}
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="rounded-full border-amber-200 bg-white font-extrabold text-amber-700"
        >
          <Link href={review.jobs ? `/admin/jobs/${review.jobs.id}` : "/admin/jobs"}>
            Kiểm tra job
          </Link>
        </Button>
      </div>
    </div>
  );
}

function DesignerRiskCard({ designer }: { designer: DesignerQualityRow }) {
  return (
    <div className="rounded-[1.15rem] border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <RatingPill rating={designer.rating} />
        <StatusPill tone="warning">Designer rating thấp</StatusPill>
      </div>

      <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
        {designer.display_name}
      </h3>

      <p className="mt-1 text-sm font-bold text-amber-700">
        {designer.headline ?? "Designer"}
      </p>
    </div>
  );
}

function MissingReviewJobCard({
  job,
  designer,
}: {
  job: CompletedJobRow;
  designer?: DesignerQualityRow;
}) {
  return (
    <div className="rounded-[1.2rem] border border-blue-100 bg-blue-50/65 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="success">Completed</StatusPill>
        <StatusPill tone="warning">Thiếu review</StatusPill>

        {job.design_requests ? (
          <StatusPill tone="neutral">
            {getSafeCategoryLabel(job.design_requests.category)}
          </StatusPill>
        ) : null}
      </div>

      <h3 className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
        {job.title}
      </h3>

      <p className="mt-2 text-sm font-bold text-blue-700">
        Designer: {designer?.display_name ?? "Không rõ designer"}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MiniInfo
          icon={<Store className="size-4" />}
          label="Business"
          value={job.design_requests?.business_name ?? "N/A"}
        />

        <MiniInfo
          icon={<CalendarDays className="size-4" />}
          label="Completed"
          value={job.completed_at ? formatDateVi(job.completed_at) : "N/A"}
        />

        <MiniInfo
          icon={<CircleDollarSign className="size-4" />}
          label="Value"
          value={formatCurrencyVnd(job.agreed_price_vnd)}
        />
      </div>

      <Button
        asChild
        className="mt-4 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
      >
        <Link href={`/admin/jobs/${job.id}`}>
          Mở job
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </Button>
    </div>
  );
}

function RatingDistributionRow({
  stars,
  count,
  total,
}: {
  stars: number;
  count: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2 text-sm font-black text-[#061a3a]">
          <Star className="size-4 fill-amber-500 text-amber-500" />
          {stars} sao
        </div>

        <p className="text-sm font-black text-blue-700">
          {count} review · {percentage}%
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-[#0b4edb]"
          style={{ width: `${percentage}%` }}
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
      ? "bg-white/10 text-amber-200 ring-white/10"
      : tone === "success"
        ? "bg-white text-emerald-700 ring-emerald-200"
        : tone === "warning"
          ? "bg-white text-amber-700 ring-amber-200"
          : "bg-blue-50 text-blue-700 ring-blue-100";

  const subTextClass = tone === "dark" ? "text-white/68" : "text-slate-500";
  const labelClass = tone === "dark" ? "text-sky-200/75" : "text-blue-600";

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

      <p className={`mt-3 text-sm font-medium leading-6 ${subTextClass}`}>
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

function RatingPill({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-amber-700">
      <Star className="size-3.5 fill-current" />
      {rating}/5
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
    <div className="rounded-2xl border border-blue-100 bg-white/80 p-3">
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
        <MessageSquareText className="size-6" />
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

function getVerificationView(status: string | null) {
  if (status === "approved" || status === "verified") {
    return {
      label: "Đã duyệt",
      tone: "success" as const,
    };
  }

  if (status === "rejected") {
    return {
      label: "Từ chối",
      tone: "warning" as const,
    };
  }

  if (status === "in_review") {
    return {
      label: "Đang duyệt",
      tone: "info" as const,
    };
  }

  return {
    label: "Chờ duyệt",
    tone: "warning" as const,
  };
}

function getSafeCategoryLabel(category: string) {
  try {
    return getCategoryLabel(category as Parameters<typeof getCategoryLabel>[0]);
  } catch {
    return category;
  }
}