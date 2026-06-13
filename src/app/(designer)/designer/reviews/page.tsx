import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageSquareText,
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
import { getCategoryLabel } from "@/lib/domain/labels";
import { formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DesignerStatsRow = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number | null;
  completed_jobs: number | null;
  response_time_hours: number | null;
};

type JobReviewRow = {
  id: string;
  job_id: string;
  customer_id: string;
  designer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    status: string;
    completed_at: string | null;
    design_requests: {
      id: string;
      title: string;
      business_name: string;
      category: string;
    } | null;
  } | null;
};

type CustomerProfileRow = {
  id: string;
  profile_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
};

type CustomerDisplay = {
  name: string;
  email: string;
};

type ReviewMetric = {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
};

export default async function DesignerReviewsPage() {
  const authState = await requireRole(["designer"]);
  const profile = authState.profile;
  const designerProfile = authState.designerProfile;

  if (!profile || !designerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: designerData, error: designerError } = await adminSupabase
    .from("designer_profiles")
    .select(
      `
      id,
      display_name,
      headline,
      rating,
      completed_jobs,
      response_time_hours
    `,
    )
    .eq("id", designerProfile.id)
    .maybeSingle();

  const { data: reviewData, error: reviewError } = await adminSupabase
    .from("job_reviews")
    .select(
      `
      id,
      job_id,
      customer_id,
      designer_id,
      rating,
      comment,
      created_at,
      jobs (
        id,
        title,
        status,
        completed_at,
        design_requests (
          id,
          title,
          business_name,
          category
        )
      )
    `,
    )
    .eq("designer_id", designerProfile.id)
    .order("created_at", { ascending: false });

  const designerStats = designerData as DesignerStatsRow | null;
  const reviews = (reviewData ?? []) as unknown as JobReviewRow[];

  const customerIds = Array.from(
    new Set(reviews.map((review) => review.customer_id).filter(Boolean)),
  );

  let customerMap = new Map<string, CustomerDisplay>();

  if (customerIds.length > 0) {
    const { data: customerProfileData } = await adminSupabase
      .from("customer_profiles")
      .select("id, profile_id")
      .in("id", customerIds);

    const customerProfiles = (customerProfileData ??
      []) as CustomerProfileRow[];

    const profileIds = Array.from(
      new Set(
        customerProfiles
          .map((customerProfile) => customerProfile.profile_id)
          .filter(Boolean),
      ),
    );

    if (profileIds.length > 0) {
      const { data: profileData } = await adminSupabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", profileIds);

      const profiles = (profileData ?? []) as ProfileRow[];

      const profileMap = new Map(
        profiles.map((customerProfile) => [
          customerProfile.id,
          customerProfile,
        ]),
      );

      customerMap = new Map(
        customerProfiles.map((customerProfile) => {
          const customerAuthProfile = profileMap.get(customerProfile.profile_id);

          return [
            customerProfile.id,
            {
              name: customerAuthProfile?.full_name ?? "Customer",
              email: customerAuthProfile?.email ?? "",
            },
          ];
        }),
      );
    }
  }

  const totalReviews = reviews.length;

  const calculatedAverageRating =
    totalReviews > 0
      ? Math.round(
          (reviews.reduce((total, review) => total + Number(review.rating), 0) /
            totalReviews) *
            10,
        ) / 10
      : 0;

  const profileRating =
    typeof designerStats?.rating === "number"
      ? designerStats.rating
      : calculatedAverageRating;

  const averageRating =
    totalReviews > 0 ? calculatedAverageRating : profileRating;

  const fiveStarReviews = reviews.filter((review) => review.rating === 5).length;
  const positiveReviews = reviews.filter((review) => review.rating >= 4).length;
  const lowReviews = reviews.filter((review) => review.rating <= 3).length;

  const designerDisplayName =
    designerStats?.display_name ?? designerProfile.display_name ?? "Designer";

  const designerHeadline =
    designerStats?.headline ?? designerProfile.headline ?? "Designer";

  const completedJobs = designerStats?.completed_jobs ?? 0;
  const responseTimeHours = designerStats?.response_time_hours ?? 24;

  const reviewMetrics: ReviewMetric[] = [
    {
      label: "Tổng",
      value: `${totalReviews}`,
      hint: "Tất cả review",
      icon: <MessageSquareText className="size-4" />,
    },
    {
      label: "5 sao",
      value: `${fiveStarReviews}`,
      hint: "Hoàn hảo",
      icon: <Star className="size-4 fill-current" />,
    },
    {
      label: "Tích cực",
      value: `${positiveReviews}`,
      hint: "Từ 4–5 sao",
      icon: <CheckCircle2 className="size-4" />,
    },
    {
      label: "Cần lưu ý",
      value: `${lowReviews}`,
      hint: "Từ 3 sao trở xuống",
      icon: <Sparkles className="size-4" />,
    },
  ];

  return (
    <DashboardShell
      role="designer"
      title="Review & Rating"
      description="Theo dõi đánh giá của customer sau mỗi job hoàn thành."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      {designerError ? (
        <SurfaceCard className="mb-5 border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold leading-7 text-amber-800">
            {designerError.message}
          </p>
        </SurfaceCard>
      ) : null}

      {reviewError ? (
        <SurfaceCard className="mb-5 border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold leading-7 text-amber-800">
            {reviewError.message}
          </p>
        </SurfaceCard>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard variant="dark" className="overflow-hidden p-0">
          <div className="relative p-6 md:p-8">
            <div className="pointer-events-none absolute right-[-120px] top-[-120px] h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-120px] left-[-120px] h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/70">
                    Designer reputation
                  </p>

                  <div className="mt-6">
                    <p className="text-[72px] font-black leading-[0.92] tracking-[-0.08em] text-white md:text-[96px]">
                      {averageRating.toFixed(1)}/5.0
                    </p>

                    <div className="mt-5">
                      <RatingStars rating={averageRating} size="hero" />
                    </div>
                  </div>
                </div>

                <div className="hidden size-16 shrink-0 place-items-center rounded-3xl bg-white/10 text-amber-300 ring-1 ring-white/10 md:grid">
                  <Star className="size-8 fill-current" />
                </div>
              </div>

              <p className="mt-7 max-w-2xl text-sm font-medium leading-7 text-white/70">
                Điểm rating được tính từ các đánh giá customer gửi sau khi job
                hoàn thành. Rating ổn định giúp designer tăng uy tín và có lợi
                thế trong hệ thống matching.
              </p>

              <div className="mt-7 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-5">
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
                      Review quality
                    </p>

                    <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
                      {totalReviews > 0
                        ? "Đã có tín hiệu uy tín"
                        : "Chưa có dữ liệu review"}
                    </h2>

                    <p className="mt-2 text-sm font-medium leading-6 text-white/60">
                      {totalReviews > 0
                        ? `${positiveReviews}/${totalReviews} review đang ở mức tích cực.`
                        : "Review sẽ xuất hiện sau khi customer duyệt hoàn thành job."}
                    </p>
                  </div>

                  <StatusPill tone={totalReviews > 0 ? "success" : "warning"}>
                    {totalReviews > 0 ? "Có review" : "Đang chờ"}
                  </StatusPill>
                </div>
              </div>

              <ReviewMetricsGrid metrics={reviewMetrics} />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            Profile stats
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            {designerDisplayName}
          </h2>

          <p className="mt-2 text-sm font-bold text-blue-700">
            {designerHeadline}
          </p>

          <div className="mt-5 rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Current rating
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <p className="text-5xl font-black leading-none tracking-[-0.06em] text-[#061a3a]">
                {profileRating.toFixed(1)}/5
              </p>

              <RatingStars rating={profileRating} size="md" variant="light" />
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <InfoBox
              icon={<BriefcaseBusiness className="size-4" />}
              label="Completed jobs"
              value={`${completedJobs} jobs`}
            />

            <InfoBox
              icon={<Clock3 className="size-4" />}
              label="Response time"
              value={`${responseTimeHours} giờ`}
            />

            <InfoBox
              icon={<Sparkles className="size-4" />}
              label="Review readiness"
              value={
                totalReviews > 0
                  ? "Đã có dữ liệu đánh giá"
                  : "Chưa có review từ customer"
              }
            />
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-6">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Customer reviews
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Danh sách đánh giá
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Đây là các đánh giá customer đã gửi sau khi duyệt job hoàn thành.
              </p>
            </div>

            <StatusPill tone="info">{`${totalReviews} reviews`}</StatusPill>
          </div>

          {reviews.length === 0 ? (
            <div className="mt-6 grid place-items-center rounded-[1.35rem] border border-blue-100 bg-blue-50/65 p-8 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
                <MessageSquareText className="size-6" />
              </div>

              <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Chưa có đánh giá nào.
              </h3>

              <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
                Khi customer duyệt hoàn thành job và gửi review, đánh giá sẽ hiển
                thị tại đây.
              </p>

              <Button
                asChild
                className="mt-6 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
              >
                <Link href="/designer/jobs">Quay lại danh sách job</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  customer={customerMap.get(review.customer_id) ?? null}
                />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function ReviewMetricsGrid({ metrics }: { metrics: ReviewMetric[] }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex min-h-[188px] flex-col rounded-[1.35rem] border border-white/15 bg-white/[0.06] p-5 text-center"
        >
          <div className="flex min-h-12 items-start justify-center">
            <div className="grid size-9 place-items-center rounded-2xl bg-white/8 text-amber-300 ring-1 ring-white/10">
              {metric.icon}
            </div>
          </div>

          <p className="mt-2 text-center text-[0.78rem] font-black uppercase leading-5 tracking-[0.08em] text-amber-300">
            {metric.label}
          </p>

          <div className="flex flex-1 items-center justify-center py-3">
            <p
              className="font-black text-white"
              style={{
                fontSize: "50px",
                lineHeight: "0.95",
                letterSpacing: "-0.04em",
              }}
            >
              {metric.value}
            </p>
          </div>

          <p className="mx-auto max-w-[110px] text-center text-[0.82rem] font-extrabold leading-5 text-white/88">
            {metric.hint}
          </p>
        </div>
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  customer,
}: {
  review: JobReviewRow;
  customer: CustomerDisplay | null;
}) {
  const job = review.jobs;
  const request = job?.design_requests;

  return (
    <div className="rounded-[1.35rem] border border-blue-100 bg-blue-50/65 p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RatingPill rating={review.rating} />

            {request ? (
              <StatusPill tone="neutral">
                {getSafeCategoryLabel(request.category)}
              </StatusPill>
            ) : null}

            {job?.status ? (
              <StatusPill
                tone={job.status === "completed" ? "success" : "neutral"}
              >
                {getJobStatusLabel(job.status)}
              </StatusPill>
            ) : null}
          </div>

          <h3 className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
            {job?.title ?? "Job không xác định"}
          </h3>

          <p className="mt-2 text-sm font-bold text-blue-700">
            {request?.business_name ?? "Chưa rõ thương hiệu"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {job ? (
            <Button
              asChild
              variant="outline"
              className="rounded-full border-blue-200 bg-white font-extrabold"
            >
              <Link href={`/designer/jobs/${job.id}`}>
                Xem job
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-[1.15rem] border border-blue-100 bg-white p-5">
        <p className="text-sm font-medium leading-7 text-slate-700">
          {review.comment}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <InfoBox
          icon={<UserRound className="size-4" />}
          label="Customer"
          value={customer?.name ?? "Customer"}
        />

        <InfoBox
          icon={<CalendarDays className="size-4" />}
          label="Reviewed at"
          value={formatDateVi(review.created_at)}
        />

        <InfoBox
          icon={<BriefcaseBusiness className="size-4" />}
          label="Completed at"
          value={
            job?.completed_at
              ? formatDateVi(job.completed_at)
              : "Chưa có thời gian"
          }
        />

        <InfoBox
          icon={<Store className="size-4" />}
          label="Business"
          value={request?.business_name ?? "N/A"}
        />
      </div>
    </div>
  );
}

function RatingStars({
  rating,
  size = "md",
  variant = "dark",
}: {
  rating: number;
  size?: "md" | "hero";
  variant?: "dark" | "light";
}) {
  const safeRating = Math.min(5, Math.max(0, Number(rating) || 0));
  const starBoxClass = size === "hero" ? "size-10 md:size-12" : "size-6";
  const gapClass = size === "hero" ? "gap-3" : "gap-2";
  const baseColor = variant === "dark" ? "#334155" : "#cbd5e1";
  const fillColor = "#fbbf24";

  return (
    <div
      className={`flex items-center ${gapClass}`}
      aria-label={`Rating ${safeRating.toFixed(1)} trên 5 sao`}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fillPercent = Math.min(
          100,
          Math.max(0, (safeRating - index) * 100),
        );

        return (
          <span
            key={index}
            className={`relative inline-block shrink-0 ${starBoxClass}`}
          >
            <Star
              className="absolute left-0 top-0 size-full"
              style={{
                color: baseColor,
                fill: baseColor,
              }}
              strokeWidth={1.75}
            />

            <span
              className="absolute left-0 top-0 h-full overflow-hidden"
              style={{
                width: `${fillPercent}%`,
              }}
            >
              <Star
                className={`absolute left-0 top-0 ${starBoxClass}`}
                style={{
                  color: fillColor,
                  fill: fillColor,
                }}
                strokeWidth={1.75}
              />
            </span>
          </span>
        );
      })}
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

function getSafeCategoryLabel(category: string) {
  try {
    return getCategoryLabel(category as Parameters<typeof getCategoryLabel>[0]);
  } catch {
    return category;
  }
}

function getJobStatusLabel(status: string) {
  if (status === "payment_pending") return "Chờ thanh toán";
  if (status === "active") return "Đang thực hiện";
  if (status === "completed") return "Hoàn thành";
  if (status === "cancelled") return "Đã hủy";
  return status;
}